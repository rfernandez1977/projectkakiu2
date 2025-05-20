const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Optimize chunk sizes
  config.optimization.splitChunks = {
    chunks: 'all',
    maxInitialRequests: Infinity,
    minSize: 20000,
    maxSize: 200000,
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name(module) {
          // Get the name. E.g. node_modules/packageName/not/this/part.js
          // or node_modules/packageName
          const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
          
          // Generate smaller chunks for larger packages
          if (packageName === 'react' || packageName === 'react-dom' || packageName === 'react-native-web') {
            return `npm.${packageName}`;
          }
          
          // Bundle smaller packages by first letter
          return `npm.${packageName.replace('@', '')}`;
        },
      },
    },
  };
  
  // Optimize file-loader for images
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (oneOfRule.loader && oneOfRule.loader.indexOf('file-loader') >= 0) {
          oneOfRule.options = {
            ...oneOfRule.options,
            name: 'static/media/[name].[hash:8].[ext]',
          };
        }
      });
    }
  });
  
  // Add image optimization for web
  config.module.rules.push({
    test: /\.(gif|jpe?g|png|svg)$/,
    use: {
      loader: 'image-webpack-loader',
      options: {
        disable: process.env.NODE_ENV !== 'production',
        mozjpeg: {
          progressive: true,
          quality: 65,
        },
        optipng: {
          enabled: true,
        },
        pngquant: {
          quality: [0.65, 0.90],
          speed: 4,
        },
        gifsicle: {
          interlaced: false,
        },
        webp: {
          quality: 75,
        },
      },
    },
    enforce: 'pre',
  });
  
  // Add bundle analyzer plugin when ANALYZE is set to true
  if (process.env.ANALYZE === 'true') {
    config.plugins.push(new BundleAnalyzerPlugin());
  }
  
  // Enable aggressive code removal
  config.optimization.usedExports = true;
  config.optimization.sideEffects = true;
  
  // Add cache optimization
  config.cache = {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  };
  
  return config;
};