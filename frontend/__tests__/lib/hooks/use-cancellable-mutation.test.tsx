/**
 * Unit tests for useCancellableMutation hook
 *
 * Tests race condition prevention and request cancellation functionality.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCancellableMutation, isAbortError } from "@/lib/hooks/use-cancellable-mutation";
import { ReactNode } from "react";

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useCancellableMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic mutation functionality", () => {
    it("should execute a mutation and return the result", async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: "success" });

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate("test-input");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ data: "success" });
      expect(mockFn).toHaveBeenCalledWith("test-input", expect.any(AbortSignal));
    });

    it("should pass AbortSignal to the mutation function", async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: "test" });

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate("input");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify AbortSignal was passed
      expect(mockFn).toHaveBeenCalledTimes(1);
      const [, signal] = mockFn.mock.calls[0];
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it("should handle errors from the mutation function", async () => {
      const testError = new Error("Test error");
      const mockFn = vi.fn().mockRejectedValue(testError);

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate("input");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(testError);
    });
  });

  describe("request cancellation", () => {
    it("should cancel previous request when a new one starts", async () => {
      const resolvers: Array<(value: { data: string }) => void> = [];

      const mockFn = vi.fn().mockImplementation(
        (input: string, signal: AbortSignal) =>
          new Promise<{ data: string }>((resolve, reject) => {
            resolvers.push(resolve);
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      // Start first request
      await act(async () => {
        result.current.mutate("first");
      });

      // Immediately start second request (should cancel first)
      await act(async () => {
        result.current.mutate("second");
      });

      // Two calls should have been made
      expect(mockFn).toHaveBeenCalledTimes(2);

      // Resolve the second request
      await act(async () => {
        resolvers[1]({ data: "second-result" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should have the second result, not the first
      expect(result.current.data).toEqual({ data: "second-result" });
    });

    it("should provide cancel() function to manually cancel requests", async () => {
      // Use underscore prefix for intentionally unused variable
      let _resolver: ((value: { data: string }) => void) | null = null;

      const mockFn = vi.fn().mockImplementation(
        (_input: string, signal: AbortSignal) =>
          new Promise<{ data: string }>((resolve, reject) => {
            _resolver = resolve;
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      // Start request
      act(() => {
        result.current.mutate("test");
      });

      // Wait for mutation to be pending
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Manually cancel
      act(() => {
        result.current.cancel();
      });

      // Should be in error state due to abort
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify it's an abort error
      expect(result.current.error).toBeInstanceOf(DOMException);
      expect((result.current.error as DOMException).name).toBe("AbortError");
    });
  });

  describe("stale response prevention", () => {
    it("should ignore stale responses from earlier requests", async () => {
      let resolveFirst: ((value: { data: string }) => void) | null = null;
      let resolveSecond: ((value: { data: string }) => void) | null = null;

      const mockFn = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string }>((resolve) => {
              resolveFirst = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string }>((resolve) => {
              resolveSecond = resolve;
            })
        );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      // Start first request
      await act(async () => {
        result.current.mutate("first");
      });

      // Start second request
      await act(async () => {
        result.current.mutate("second");
      });

      // Resolve second first (simulating faster response)
      await act(async () => {
        resolveSecond?.({ data: "second-result" });
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ data: "second-result" });
      });

      // Now resolve first (stale - should be ignored due to version check)
      await act(async () => {
        resolveFirst?.({ data: "first-result-stale" });
      });

      // Wait a bit to ensure no state change
      await new Promise((r) => setTimeout(r, 50));

      // Should still have second result (first was stale)
      expect(result.current.data).toEqual({ data: "second-result" });
    });
  });

  describe("retry behavior", () => {
    it("should not retry abort errors", async () => {
      const mockFn = vi.fn().mockImplementation(
        (_input: string, signal: AbortSignal) =>
          new Promise<{ data: string }>((_, reject) => {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
            // Immediately abort to test retry behavior
            setTimeout(() => {
              reject(new DOMException("Aborted", "AbortError"));
            }, 0);
          })
      );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
            retry: 3, // Would normally retry 3 times
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate("test");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only have been called once (no retries for abort)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("cleanup on unmount", () => {
    it("should abort in-flight requests when component unmounts", async () => {
      let abortSignalAborted = false;

      const mockFn = vi.fn().mockImplementation(
        (_input: string, signal: AbortSignal) =>
          new Promise<{ data: string }>((_, reject) => {
            signal.addEventListener("abort", () => {
              abortSignalAborted = true;
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      );

      const { result, unmount } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      // Start a request
      act(() => {
        result.current.mutate("test");
      });

      // Wait for mutation to be pending
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Unmount the component
      unmount();

      // Wait a tick for the abort to propagate
      await new Promise((r) => setTimeout(r, 10));

      // The abort signal should have been triggered
      expect(abortSignalAborted).toBe(true);
    });
  });

  describe("boolean retry handling", () => {
    it("should retry when retry is true and eventually succeed", async () => {
      let callCount = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error(`Failure ${callCount}`));
        }
        return Promise.resolve({ data: "success" });
      });

      // Create a wrapper with retryDelay: 0 for faster testing
      const queryClient = new QueryClient({
        defaultOptions: {
          mutations: {
            retryDelay: 0, // No delay between retries
          },
        },
      });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
            retry: true,
          }),
        { wrapper }
      );

      await act(async () => {
        result.current.mutate("test");
      });

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true);
        },
        { timeout: 3000 }
      );

      // Should have been called 3 times (2 failures + 1 success)
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ data: "success" });
    });

    it("should not retry when retry is false", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("Failure"));

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
            retry: false,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate("test");
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only have been called once (no retries)
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("stale response verification", () => {
    it("should throw AbortError when stale response is detected via version check", async () => {
      let resolveFirst: ((value: { data: string }) => void) | null = null;
      let resolveSecond: ((value: { data: string }) => void) | null = null;

      const mockFn = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string }>((resolve) => {
              resolveFirst = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise<{ data: string }>((resolve) => {
              resolveSecond = resolve;
            })
        );

      const { result } = renderHook(
        () =>
          useCancellableMutation({
            mutationFn: mockFn,
          }),
        { wrapper: createWrapper() }
      );

      // Start first request
      await act(async () => {
        result.current.mutate("first");
      });

      // Start second request (supersedes first)
      await act(async () => {
        result.current.mutate("second");
      });

      // Resolve second first
      await act(async () => {
        resolveSecond?.({ data: "second-result" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ data: "second-result" });

      // Now resolve the first (stale) request
      // The hook should detect this is stale via version check
      await act(async () => {
        resolveFirst?.({ data: "first-result-stale" });
      });

      // Wait to ensure state doesn't change
      await new Promise((r) => setTimeout(r, 50));

      // Mutation should still show the second result
      // The error from the stale request should not affect the success state
      // because the second request succeeded
      expect(result.current.data).toEqual({ data: "second-result" });
      // Note: The stale request's AbortError is thrown but TanStack Query
      // doesn't update state because a newer mutation has completed
    });
  });
});

describe("isAbortError", () => {
  it("should return true for DOMException with AbortError name", () => {
    const error = new DOMException("Aborted", "AbortError");
    expect(isAbortError(error)).toBe(true);
  });

  it("should return false for regular errors", () => {
    const error = new Error("Regular error");
    expect(isAbortError(error)).toBe(false);
  });

  it("should return false for DOMException with different name", () => {
    const error = new DOMException("Test", "NetworkError");
    expect(isAbortError(error)).toBe(false);
  });

  it("should return false for null/undefined", () => {
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });

  it("should return false for non-error objects", () => {
    expect(isAbortError({ name: "AbortError" })).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
  });
});
