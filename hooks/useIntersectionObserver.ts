import { useState, useEffect, useRef, RefObject } from 'react';

interface IntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverOptions = {},
  targetRef?: RefObject<T>
): {
  ref: RefObject<T>;
  isIntersecting: boolean;
} {
  const { threshold = 0, root = null, rootMargin = '0%', freezeOnceVisible = false } = options;
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);
  const localRef = useRef<T>(null);
  const ref = targetRef || localRef;
  const frozen = useRef<boolean>(false);

  useEffect(() => {
    const element = ref?.current;
    if (!element || (freezeOnceVisible && frozen.current)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);

        if (freezeOnceVisible && entry.isIntersecting) {
          frozen.current = true;
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, root, rootMargin, freezeOnceVisible]);

  return { ref, isIntersecting };
}