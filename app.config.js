export default {
  name: "Factura Móvil",
  slug: "factura-movil",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/images/favicon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
    // Optimize for web performance
    output: "static",
    // Optimize chunk sizes
    optimization: {
      splitChunks: true
    }
  },
  plugins: [
    [
      "expo-router",
      {
        // Changed asyncRouting to asyncRoutes to fix the validation error
        asyncRoutes: true
      }
    ]
  ],
  experiments: {
    tsconfigPaths: true
  }
};