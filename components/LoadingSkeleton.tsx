import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import useIsomorphicLayoutEffect from '../hooks/useIsomorphicLayoutEffect';

// Optimized loading skeleton component for better perceived performance
interface LoadingSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export default function LoadingSkeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style = {}
}: LoadingSkeletonProps) {
  // Animation value for shimmer effect
  const animatedValue = React.useRef(new Animated.Value(0)).current;
  
  // Start animation on mount
  useIsomorphicLayoutEffect(() => {
    // Create animation loop
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.ease,
        useNativeDriver: false, // Required for background gradient
      })
    ).start();
    
    // Cleanup animation on unmount
    return () => {
      animatedValue.stopAnimation();
    };
  }, []);
  
  // Create gradient effect
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-100%', '100%'],
  });
  
  // Dynamic styles based on props
  const skeletonStyles = {
    width,
    height,
    borderRadius,
    ...style,
  };
  
  return (
    <View style={[styles.container, skeletonStyles]}>
      <Animated.View 
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E1E9EE',
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(255,255,255,0.5) 50%, rgba(0,0,0,0) 100%)',
  },
});