'use client';

import { useRef, useCallback } from 'react';

interface RateLimitOptions {
  maxCalls: number;
  windowMs: number;
  key?: string;
}

export function useRateLimit(options: RateLimitOptions) {
  const { maxCalls, windowMs, key = 'default' } = options;
  const callsRef = useRef<Map<string, number[]>>(new Map());

  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const keyCalls = callsRef.current.get(key) || [];
    const recentCalls = keyCalls.filter((time) => time > windowStart);
    
    if (recentCalls.length >= maxCalls) {
      return false;
    }
    
    recentCalls.push(now);
    callsRef.current.set(key, recentCalls);
    return true;
  }, [key, maxCalls, windowMs]);

  const getRemainingCalls = useCallback((): number => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const keyCalls = callsRef.current.get(key) || [];
    const recentCalls = keyCalls.filter((time) => time > windowStart);
    return Math.max(0, maxCalls - recentCalls.length);
  }, [key, maxCalls, windowMs]);

  const reset = useCallback(() => {
    callsRef.current.delete(key);
  }, [key]);

  return { checkLimit, getRemainingCalls, reset };
}

export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}