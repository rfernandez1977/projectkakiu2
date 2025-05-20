import React, { ReactNode } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface LazyLoadSectionProps {
  children: ReactNode;
  height?: number;
  placeholderColor?: string;
  threshold?: number;
}

const LazyLoadSection: React.FC<LazyLoadSectionProps> = ({
  children,
  height,
  placeholderColor = '#f5f5f5',
  threshold = 0.1,
}) => {
  // Only use intersection observer on web
  const { ref, isIntersecting } = Platform.OS === 'web'
    ? useIntersectionObserver({ threshold, freezeOnceVisible: true })
    : { ref: null, isIntersecting: true };

  // For native platforms or if already intersecting, render children directly
  if (Platform.OS !== 'web' || isIntersecting) {
    return <>{children}</>;
  }

  // For web before intersection, render placeholder
  return (
    <View
      ref={ref as React.RefObject<View>}
      style={[
        styles.container,
        height ? { height } : undefined,
        { backgroundColor: placeholderColor }
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 100,
  },
});

export default LazyLoadSection;