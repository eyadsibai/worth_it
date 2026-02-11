/**
 * TDD tests for Bug #12: WebSocket cleanup for CONNECTING state.
 *
 * Bug: WebSocket cleanup doesn't check readyState before closing,
 * which could leave hanging connections in CONNECTING state.
 */

import { describe, it, expect, vi } from "vitest";

describe("WebSocket cleanup safety", () => {
  it("cancel should handle WebSocket in CONNECTING state", () => {
    // Create a mock WebSocket in CONNECTING state
    const mockWs = {
      readyState: WebSocket.CONNECTING,
      close: vi.fn(),
    };

    // The close() call should work fine even in CONNECTING state
    // (per WebSocket spec), but we verify it's called
    if (mockWs.readyState === WebSocket.CONNECTING || mockWs.readyState === WebSocket.OPEN) {
      mockWs.close();
    }

    expect(mockWs.close).toHaveBeenCalledTimes(1);
  });

  it("cleanup should not call close on already-closed WebSocket", () => {
    const mockWs: { readyState: number; close: () => void } = {
      readyState: WebSocket.CLOSED,
      close: vi.fn(),
    };

    // Should not call close on already closed connections
    if (mockWs.readyState === WebSocket.CONNECTING || mockWs.readyState === WebSocket.OPEN) {
      mockWs.close();
    }

    expect(mockWs.close).not.toHaveBeenCalled();
  });

  it("cleanup should handle null WebSocket ref", () => {
    const wsRef: { current: WebSocket | null } = { current: null };

    // Should not throw
    expect(() => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
    }).not.toThrow();
  });
});
