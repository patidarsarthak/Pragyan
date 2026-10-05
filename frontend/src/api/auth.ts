/**
 * Pragyan Authentication & User Directory API Client
 */

export interface UserProfile {
  id: number | string;
  fullName: string;
  email: string;
  phone?: string;
  role: "farmer" | "sarpanch" | "bdo" | "ddma" | "scientist" | "admin" | string;
  roleLabel?: string;
  designation?: string;
  department?: string;
  stateName?: string;
  districtName?: string;
  blockName?: string;
  gpName?: string;
  gpCode?: number;
  avatar?: string;
  jurisdiction?: string;
  isVerified?: boolean;
}

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  designation: string;
  districtName: string;
  blockName: string;
  gpName: string;
  avatar: string;
  jurisdiction: string;
  defaultPassword?: string;
}

const TOKEN_KEY = "pragyan_auth_token";
const USER_KEY = "pragyan_auth_user";

// Fallback demo personas if backend is unreachable
export const FALLBACK_PERSONAS: DemoPersona[] = [
  {
    id: "ddma",
    name: "Shri Rajesh Sharma",
    email: "ddma.indore@mp.gov.in",
    role: "ddma",
    roleLabel: "District Disaster Management Authority (DDMA)",
    designation: "Deputy Collector & District Disaster Officer",
    districtName: "Indore",
    blockName: "Indore HQ",
    gpName: "District-Wide Oversight",
    avatar: "🛡️",
    jurisdiction: "All 55 MP Districts & Emergency Protocol Command",
    defaultPassword: "pragyan@2026",
  },
  {
    id: "bdo",
    name: "Smt. Ananya Verma",
    email: "bdo.sanwer@mp.gov.in",
    role: "bdo",
    roleLabel: "Block Development Officer (BDO)",
    designation: "BDO, Janpad Panchayat Sanwer",
    districtName: "Indore",
    blockName: "Sanwer",
    gpName: "Sanwer Janpad",
    avatar: "🏛️",
    jurisdiction: "121 Gram Panchayats across Sanwer Block",
    defaultPassword: "pragyan@2026",
  },
  {
    id: "sarpanch",
    name: "Rameshwar Patel",
    email: "sarpanch.ajnod@mp.gov.in",
    role: "sarpanch",
    roleLabel: "Gram Panchayat Sarpanch",
    designation: "Sarpanch, Gram Panchayat Ajnod",
    districtName: "Indore",
    blockName: "Sanwer",
    gpName: "Ajnod",
    avatar: "🌿",
    jurisdiction: "Gram Panchayat Ajnod (Area 8.4 km²)",
    defaultPassword: "pragyan@2026",
  },
  {
    id: "farmer",
    name: "Vikram Singh Mandloi",
    email: "vikram.farmer@pragyan.in",
    role: "farmer",
    roleLabel: "Progressive Farmer / Kisan",
    designation: "Soybean & Wheat Cultivator",
    districtName: "Indore",
    blockName: "Sanwer",
    gpName: "Ajnod",
    avatar: "🌾",
    jurisdiction: "Khasra Nos. 104, 107 (Medium Black Vertisol)",
    defaultPassword: "pragyan@2026",
  },
  {
    id: "scientist",
    name: "Dr. Praveen Saxena",
    email: "scientist.saxena@imd.gov.in",
    role: "scientist",
    roleLabel: "Agro-Meteorological Scientist",
    designation: "Senior Scientist, Agricultural Meteorology",
    districtName: "Indore",
    blockName: "KVK Regional Centre",
    gpName: "Regional Zone VII",
    avatar: "🔬",
    jurisdiction: "Central India Downscaling Model Physics & Evaluation",
    defaultPassword: "pragyan@2026",
  },
];

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: UserProfile) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("pragyan-auth-changed", { detail: user }));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("pragyan-auth-changed", { detail: null }));
}

const API_BASE = "/api/auth";

export async function fetchDemoPersonas(): Promise<DemoPersona[]> {
  try {
    const res = await fetch(`${API_BASE}/demo-personas`);
    if (res.ok) {
      const data = await res.json();
      if (data.personas && data.personas.length > 0) {
        return data.personas;
      }
    }
  } catch (err) {
    console.warn("Using offline fallback personas", err);
  }
  return FALLBACK_PERSONAS;
}

export async function loginWithCredentials(
  usernameOrEmail: string,
  password: string
): Promise<{ user: UserProfile; token: string }> {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setStoredAuth(data.token, data.user);
      return { user: data.user, token: data.token };
    } else {
      const err = await res.json();
      throw new Error(err.detail || "Authentication failed. Please check credentials.");
    }
  } catch (e: any) {
    // If backend offline, check fallback personas
    const query = usernameOrEmail.toLowerCase().trim();
    const fallback = FALLBACK_PERSONAS.find(
      (p) => p.email.toLowerCase() === query || p.id === query || p.name.toLowerCase().includes(query)
    );
    if (fallback) {
      const token = `offline_tok_${Date.now()}`;
      const user: UserProfile = {
        id: 999,
        fullName: fallback.name,
        email: fallback.email,
        role: fallback.role,
        roleLabel: fallback.roleLabel,
        designation: fallback.designation,
        districtName: fallback.districtName,
        blockName: fallback.blockName,
        gpName: fallback.gpName,
        avatar: fallback.avatar,
        jurisdiction: fallback.jurisdiction,
        isVerified: true,
      };
      setStoredAuth(token, user);
      return { user, token };
    }
    throw e;
  }
}

export async function loginWithDemoPersona(
  personaId: string
): Promise<{ user: UserProfile; token: string }> {
  try {
    const res = await fetch(`${API_BASE}/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: personaId }),
    });

    if (res.ok) {
      const data = await res.json();
      setStoredAuth(data.token, data.user);
      return { user: data.user, token: data.token };
    }
  } catch (err) {
    console.warn("Backend demo-login unavailable, using fallback persona:", err);
  }

  const fallback = FALLBACK_PERSONAS.find((p) => p.id === personaId) || FALLBACK_PERSONAS[0];
  const token = `pragyan_demo_tok_${personaId}_${Date.now()}`;
  const user: UserProfile = {
    id: 100,
    fullName: fallback.name,
    email: fallback.email,
    role: fallback.role,
    roleLabel: fallback.roleLabel,
    designation: fallback.designation,
    districtName: fallback.districtName,
    blockName: fallback.blockName,
    gpName: fallback.gpName,
    avatar: fallback.avatar,
    jurisdiction: fallback.jurisdiction,
    isVerified: true,
  };
  setStoredAuth(token, user);
  return { user, token };
}

export async function registerNewUser(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  designation?: string;
  department?: string;
  stateName?: string;
  districtName?: string;
  blockName?: string;
  gpName?: string;
  gpCode?: number;
}): Promise<{ user: UserProfile; token: string }> {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      setStoredAuth(data.token, data.user);
      return { user: data.user, token: data.token };
    } else {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed.");
    }
  } catch (e: any) {
    // If backend connection fails, provide simulated offline success
    if (e.message && e.message.includes("Failed to fetch")) {
      const token = `offline_registered_${Date.now()}`;
      const user: UserProfile = {
        id: Math.floor(Math.random() * 9000) + 1000,
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone,
        role: payload.role,
        designation: payload.designation || payload.role.toUpperCase(),
        department: payload.department || "Panchayat Climate Network",
        stateName: payload.stateName || "Madhya Pradesh",
        districtName: payload.districtName || "Indore",
        blockName: payload.blockName || "Sanwer",
        gpName: payload.gpName || "Ajnod",
        gpCode: payload.gpCode || 145021,
        isVerified: true,
      };
      setStoredAuth(token, user);
      return { user, token };
    }
    throw e;
  }
}
