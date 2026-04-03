import { describe, it, expect } from "vitest";

describe("Apple Credentials Environment Variables", () => {
  it("should have EXPO_APPLE_ID set", () => {
    const appleId = process.env.EXPO_APPLE_ID;
    expect(appleId).toBeDefined();
    expect(appleId).toBe("trumpetdoc@gmail.com");
  });

  it("should have EXPO_APPLE_APP_SPECIFIC_PASSWORD set", () => {
    const password = process.env.EXPO_APPLE_APP_SPECIFIC_PASSWORD;
    expect(password).toBeDefined();
    expect(typeof password).toBe("string");
    expect(password!.length).toBeGreaterThan(0);
  });

  it("should have APPLE_ID set", () => {
    const appleId = process.env.APPLE_ID;
    expect(appleId).toBeDefined();
    expect(appleId).toBe("trumpetdoc@gmail.com");
  });

  it("should have EXPO_APPLE_PASSWORD set", () => {
    const password = process.env.EXPO_APPLE_PASSWORD;
    expect(password).toBeDefined();
    expect(typeof password).toBe("string");
    expect(password!.length).toBeGreaterThan(0);
  });

  it("should have EXPO_TOKEN set for EAS authentication", () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
  });
});
