import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  FALLBACK_PERSONAS,
  loginWithDemoPersona,
  UserProfile,
} from "./auth";

describe("Pragyan Authentication API & Session Management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides 5 official demo personas covering all administrative levels", () => {
    expect(FALLBACK_PERSONAS).toHaveLength(5);
    const roles = FALLBACK_PERSONAS.map((p) => p.role);
    expect(roles).toContain("ddma");
    expect(roles).toContain("bdo");
    expect(roles).toContain("sarpanch");
    expect(roles).toContain("farmer");
    expect(roles).toContain("scientist");
  });

  it("stores and retrieves authenticated user profile in localStorage", () => {
    expect(getStoredUser()).toBeNull();

    const mockUser: UserProfile = {
      id: 101,
      fullName: "Shri Rajesh Sharma",
      email: "ddma.indore@mp.gov.in",
      role: "ddma",
      designation: "Deputy Collector & DDMA Officer",
      districtName: "Indore",
      blockName: "Indore HQ",
      gpName: "District-Wide Oversight",
      avatar: "🛡️",
      isVerified: true,
    };

    setStoredAuth("mock_token_12345", mockUser);

    const retrieved = getStoredUser();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.fullName).toBe("Shri Rajesh Sharma");
    expect(retrieved?.role).toBe("ddma");
  });

  it("clears stored authentication correctly on logout", () => {
    const mockUser: UserProfile = {
      id: 102,
      fullName: "Ananya Verma",
      email: "bdo.sanwer@mp.gov.in",
      role: "bdo",
    };
    setStoredAuth("mock_token_67890", mockUser);
    expect(getStoredUser()).not.toBeNull();

    clearStoredAuth();
    expect(getStoredUser()).toBeNull();
  });

  it("supports instant demo persona login with fallback resilience", async () => {
    const res = await loginWithDemoPersona("sarpanch");
    expect(res).toBeDefined();
    expect(res.user.role).toBe("sarpanch");
    expect(res.user.fullName).toBe("Rameshwar Patel");
    expect(res.token).toContain("pragyan");
  });
});
