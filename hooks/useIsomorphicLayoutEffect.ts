import { useEffect, useLayoutEffect } from 'react';

// Use the appropriate effect based on the environment
// This ensures compatibility with SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;