/**
 * useCancellableMutation - A hook that prevents race conditions in API calls
 *
 * Problem: When users rapidly change form inputs, multiple API requests can be in-flight
 * simultaneously. If an earlier request completes after a later one, stale results may
 * overwrite newer, correct results.
 *
 * Solution: This hook wraps TanStack Query's useMutation with:
 * 1. AbortController support - cancels in-flight requests when new ones start
 * 2. Request versioning - tracks request IDs to ignore stale responses
 * 3. Automatic cleanup - aborts pending requests on unmount
 */

import { useCallback, useEffect, useRef } from "react";
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

/**
 * Options for the cancellable mutation hook
 */
export type CancellableMutationOptions<TData, TError, TVariables> = Omit<
  UseMutationOptions<TData, TError, TVariables>,
  "mutationFn"
> & {
  /** The mutation function that accepts variables and an AbortSignal */
  mutationFn: (variables: TVariables, signal: AbortSignal) => Promise<TData>;
};

/**
 * Extended result type that includes cancel functionality
 */
export type CancellableMutationResult<TData, TError, TVariables> = UseMutationResult<
  TData,
  TError,
  TVariables
> & {
  /** Cancel any in-flight request */
  cancel: () => void;
};

/**
 * A mutation hook that automatically cancels previous in-flight requests
 * when a new mutation is triggered, preventing race conditions.
 *
 * @example
 * ```tsx
 * const mutation = useCancellableMutation({
 *   mutationFn: async (data, signal) => {
 *     const response = await fetch('/api/endpoint', {
 *       method: 'POST',
 *       body: JSON.stringify(data),
 *       signal, // Pass signal to fetch
 *     });
 *     return response.json();
 *   },
 * });
 *
 * // Each call automatically cancels any previous pending request
 * mutation.mutate({ value: 'A' }); // This will be cancelled
 * mutation.mutate({ value: 'B' }); // This runs, cancelling the above
 * ```
 */
export function useCancellableMutation<TData = unknown, TError = Error, TVariables = void>(
  options: CancellableMutationOptions<TData, TError, TVariables>
): CancellableMutationResult<TData, TError, TVariables> {
  // Track the current AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track request version to ignore stale responses
  const requestVersionRef = useRef(0);

  /**
   * Cancel any in-flight request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount - abort any pending requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Create the underlying mutation with our wrapper
  const mutation = useMutation<TData, TError, TVariables>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      // Cancel any previous request
      cancel();

      // Increment version and capture for this request
      const currentVersion = ++requestVersionRef.current;

      // Create new AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await options.mutationFn(variables, controller.signal);

        // Check if this request is still the latest
        // If a newer request has started, ignore this result
        if (currentVersion !== requestVersionRef.current) {
          // This result is stale - throw to prevent updating state
          throw new DOMException("Request superseded by newer request", "AbortError");
        }

        return result;
      } catch (error) {
        // Pass abort errors through so TanStack Query can handle them
        // (mutation enters error state, which the caller can filter using isAbortError)
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        // Re-throw other errors normally
        throw error;
      } finally {
        // Clean up controller reference if this was the current one
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    // Don't retry aborted requests
    retry: (failureCount, error) => {
      // Never retry abort errors (cancelled requests)
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }
      // Use default retry logic for other errors
      const defaultRetry = options.retry;
      if (typeof defaultRetry === "function") {
        return defaultRetry(failureCount, error);
      }
      if (typeof defaultRetry === "number") {
        return failureCount < defaultRetry;
      }
      if (typeof defaultRetry === "boolean") {
        // When true, retry up to 3 times (TanStack Query's default behavior)
        // When false, never retry
        return defaultRetry && failureCount < 3;
      }
      // Default: no retries (TanStack Query mutations don't retry by default)
      return false;
    },
  });

  return {
    ...mutation,
    cancel,
  };
}

/**
 * Helper to check if an error is an abort error (cancelled request)
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
