import { describe, it, expect } from "vitest";

describe("EXPO_TOKEN validation", () => {
  it("should authenticate with Expo API using EXPO_TOKEN", async () => {
    const token = process.env.EXPO_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch("https://api.expo.dev/v2/auth/userinfo", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // Token should return user info nested under 'data'
    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("user_type");
  });
});
