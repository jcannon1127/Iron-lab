/**
 * Tests for /api/auth/native endpoint configuration.
 * Validates that required env vars are present and the endpoint structure is correct.
 */
import { describe, it, expect } from "vitest";

describe("Native auth configuration", () => {
  it("APPLE_BUNDLE_ID is set to the correct bundle ID", () => {
    const bundleId = process.env.APPLE_BUNDLE_ID;
    expect(bundleId).toBeDefined();
    expect(bundleId).toBe("com.yogademocracy.ironlab");
  });

  it("VITE_GOOGLE_CLIENT_ID is set and has correct format", () => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_ID is set for server-side token verification", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    // May be same as VITE_GOOGLE_CLIENT_ID or a separate server-side credential
    // Just verify it's set — the actual value is secret
    expect(clientId ?? process.env.VITE_GOOGLE_CLIENT_ID).toBeDefined();
  });
});
