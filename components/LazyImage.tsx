import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, ImageProps, Platform } from 'react-native';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  src: string;
  placeholderColor?: string;
  width: number;
  height: number;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  placeholderColor = '#e1e1e1',
  width,
  height,
  style,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  
  // Use intersection observer on web only
  const { ref, isIntersecting } = Platform.OS === 'web' 
    ? useIntersectionObserver({ threshold: 0.1, freezeOnceVisible: true }) 
    : { ref: null, isIntersecting: true };

  useEffect(() => {
    if (isIntersecting && !imgSrc) {
      setImgSrc(src);
    }
  }, [isIntersecting, src, imgSrc]);

  // Combined style with dimensions
  const combinedStyle = [
    { width, height },
    styles.image,
    style
  ];

  const handleLoad = () => {
    setLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setLoaded(true); // Consider it "loaded" to remove loading state
  };

  // For native platforms, just render the image directly
  if (Platform.OS !== 'web') {
    return (
      <Image
        source={{ uri: src }}
        style={combinedStyle}
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    );
  }

  // For web, use the lazy loading approach
  return (
    <View
      ref={ref as React.RefObject<View>}
      style={[
        combinedStyle,
        !loaded && { backgroundColor: placeholderColor }
      ]}
    >
      {!loaded && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#0066CC" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon} />
        </View>
      )}

      {imgSrc && (
        <Image
          source={{ uri: imgSrc }}
          style={[combinedStyle, { opacity: loaded ? 1 : 0 }]}
          onLoad={handleLoad}
          onError={handleError}
          {...rest}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },
});

export default LazyImage;