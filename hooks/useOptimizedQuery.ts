import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  forceRefresh?: boolean;
}

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 60 * 60 * 1000, // 1 hour
  enabled = true,
  onSuccess,
  onError,
  forceRefresh = false,
}: QueryOptions<T>): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache keys
  const cacheKey = `query_cache_${queryKey}`;
  const timestampKey = `query_timestamp_${queryKey}`;

  const fetchData = useCallback(async (skipCache: boolean = false) => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      // Check cache first if not skipping cache
      if (!skipCache && !forceRefresh) {
        try {
          const cachedTimestampStr = await AsyncStorage.getItem(timestampKey);
          const cachedTimestamp = cachedTimestampStr ? parseInt(cachedTimestampStr, 10) : 0;
          const now = Date.now();
          
          // Only use cache if it's not stale
          if (now - cachedTimestamp < staleTime) {
            const cachedDataStr = await AsyncStorage.getItem(cacheKey);
            if (cachedDataStr) {
              const cachedData = JSON.parse(cachedDataStr) as T;
              setData(cachedData);
              setIsLoading(false);
              if (onSuccess) onSuccess(cachedData);
              return;
            }
          }
        } catch (cacheError) {
          console.warn('Cache read error:', cacheError);
          // Continue with network request if cache read fails
        }
      }

      // Fetch fresh data
      const result = await queryFn();
      
      // Update state
      setData(result);
      setIsLoading(false);
      
      // Update cache
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
        await AsyncStorage.setItem(timestampKey, Date.now().toString());
      } catch (cacheError) {
        console.warn('Cache write error:', cacheError);
      }
      
      if (onSuccess) onSuccess(result);
    } catch (fetchError) {
      setIsLoading(false);
      setIsError(true);
      
      const errorObject = fetchError instanceof Error 
        ? fetchError 
        : new Error(String(fetchError));
      
      setError(errorObject);
      
      // Try to load from cache even if it's stale
      try {
        const cachedDataStr = await AsyncStorage.getItem(cacheKey);
        if (cachedDataStr) {
          const cachedData = JSON.parse(cachedDataStr) as T;
          setData(cachedData);
          console.log('Using stale cache data due to fetch error');
        }
      } catch (cacheError) {
        console.warn('Cache read error during error recovery:', cacheError);
      }
      
      if (onError) onError(errorObject);
    }
  }, [queryKey, queryFn, staleTime, cacheKey, timestampKey, enabled, forceRefresh, onSuccess, onError]);

  // Initialize on mount
  useEffect(() => {
    fetchData();
    
    // Clean up old caches
    const cleanupCache = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const now = Date.now();
        
        for (const key of keys) {
          if (key.startsWith('query_timestamp_')) {
            const timestampStr = await AsyncStorage.getItem(key);
            if (timestampStr) {
              const timestamp = parseInt(timestampStr, 10);
              if (now - timestamp > cacheTime) {
                // Remove expired cache
                const cacheKey = `query_cache_${key.replace('query_timestamp_', '')}`;
                await AsyncStorage.removeItem(key);
                await AsyncStorage.removeItem(cacheKey);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    };
    
    cleanupCache();
  }, [fetchData, cacheTime]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, isError, error, refetch };
}