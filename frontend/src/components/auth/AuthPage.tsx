import React, { useState, useEffect } from "react";
import { Language, t } from "../../lib/i18n";
import {
  UserProfile,
  DemoPersona,
  fetchDemoPersonas,
  loginWithCredentials,
  loginWithDemoPersona,
  registerNewUser,
  getStoredUser,
} from "../../api/auth";

interface AuthPageProps {
  lang: Language;
  onSuccess: (user: UserProfile) => void;
  onCancel: () => void;
  initialMode?: "login" | "register";
}

export const AuthPage: React.FC<AuthPageProps> = ({
  lang,
  onSuccess,
  onCancel,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regRole, setRegRole] = useState("farmer");
  const [regDesignation, setRegDesignation] = useState("");
  const [regDistrict, setRegDistrict] = useState("Indore");
  const [regBlock, setRegBlock] = useState("Sanwer");
  const [regGp, setRegGp] = useState("Ajnod");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    fetchDemoPersonas().then((list) => {
      if (list && list.length > 0) setPersonas(list);
    });
  }, []);

  const handleDemoSelect = async (personaId: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await loginWithDemoPersona(personaId);
      setSuccessMsg(
        lang === "hi"
          ? `${res.user.fullName} के रूप में सफलतापूर्वक प्रवेश किया गया!`
          : `Signed in successfully as ${res.user.fullName}!`
      );
      setTimeout(() => {
        onSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdentifier.trim()) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया अपना ईमेल या मोबाइल नंबर दर्ज करें।"
          : "Please enter your email or mobile number."
      );
      return;
    }
    if (!loginPassword) {
      setErrorMsg(
        lang === "hi" ? "कृपया अपना पासवर्ड दर्ज करें।" : "Please enter your password."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await loginWithCredentials(loginIdentifier, loginPassword);
      setSuccessMsg(
        lang === "hi"
          ? `स्वागत है, ${res.user.fullName}!`
          : `Welcome back, ${res.user.fullName}!`
      );
      setTimeout(() => {
        onSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regFullName.trim()) {
      setErrorMsg(lang === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया एक मान्य ईमेल पता दर्ज करें।"
          : "Please enter a valid email address."
      );
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg(
        lang === "hi"
          ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
          : "Password must be at least 6 characters long."
      );
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg(
        lang === "hi" ? "पासवर्ड मेल नहीं खा रहे हैं।" : "Passwords do not match."
      );
      return;
    }
    if (!agreedTerms) {
      setErrorMsg(
        lang === "hi"
          ? "कृपया एनडीएमए और मौसम विज्ञान दिशानिर्देशों की सहमति दें।"
          : "Please accept the NDMA & Meteorological guidelines to proceed."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await registerNewUser({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
        role: regRole,
        designation: regDesignation.trim() || undefined,
        stateName: "Madhya Pradesh",
        districtName: regDistrict,
        blockName: regBlock,
        gpName: regGp,
        gpCode: 145021,
      });

      setSuccessMsg(
        lang === "hi"
          ? `पंजीकरण सफल! प्रज्ञान में आपका स्वागत है, ${res.user.fullName}!`
          : `Registration successful! Welcome to Pragyan, ${res.user.fullName}!`
      );
      setTimeout(() => {
        onSuccess(res.user);
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pg-auth-container">
      {/* Ambient background glow */}
      <div className="pg-auth-backdrop-glow" aria-hidden="true" />

      {/* Top Bar with Brand & Back Button */}
      <div className="pg-auth-header-bar">
        <button
          onClick={onCancel}
          className="pg-auth-back-btn"
          title={lang === "hi" ? "डैशबोर्ड पर वापस जाएं" : "Back to Operations Dashboard"}
        >
          <span style={{ fontSize: "16px" }}>←</span>
          <span>{lang === "hi" ? "डैशबोर्ड पर वापस जाएं" : "Back to Dashboard"}</span>
        </button>

        <div className="pg-auth-brand-badge">
          <img
            src="/logo.png"
            alt="Pragyan"
            width="32"
            height="32"
            style={{ borderRadius: "8px", objectFit: "contain" }}
          />
          <span style={{ fontWeight: 800, letterSpacing: "0.5px", fontSize: "14px" }}>PRAGYAN</span>
          <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: 700 }}>PORTAL</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="pg-auth-card">
        {/* Banner with Official Pragyan Logo & Heading */}
        <div className="pg-auth-card-top">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <img
              src="/logo.png"
              alt="Pragyan Logo"
              width="72"
              height="72"
              style={{
                borderRadius: "16px",
                objectFit: "contain",
                boxShadow: "0 0 24px rgba(56, 189, 248, 0.45)",
                border: "1.5px solid rgba(56, 189, 248, 0.5)",
                background: "rgba(15, 23, 42, 0.9)",
                padding: "4px"
              }}
            />
          </div>
          <h1 className="pg-auth-title">
            {mode === "login"
              ? lang === "hi"
                ? "प्रज्ञान पोर्टल में प्रवेश करें"
                : "Sign In to Pragyan Portal"
              : lang === "hi"
              ? "नया आधिकारिक खाता बनाएं"
              : "Register New Official Account"}
          </h1>
          <p className="pg-auth-subtitle">
            {lang === "hi"
              ? "ग्राम पंचायत स्तरीय मौसम एवं आपदा पूर्व चेतावनी तंत्र"
              : "Hyperlocal Panchayat Climate & Disaster Intelligence Network"}
          </p>
        </div>

        {/* Instant Demo Personas Bar */}
        <div className="pg-auth-quick-section">
          <div className="pg-auth-quick-label">
            <span>⚡ {lang === "hi" ? "त्वरित डेमो लॉगिन (एक क्लिक)" : "Quick Demo Login (One Click for Evaluators)"}</span>
          </div>
          <div className="pg-auth-personas-grid">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pg-auth-persona-chip"
                onClick={() => handleDemoSelect(p.id)}
                disabled={loading}
                title={`${p.name} - ${p.designation || p.roleLabel} (${p.jurisdiction})`}
              >
                <span className="pg-persona-avatar">{p.avatar || "👤"}</span>
                <div className="pg-persona-info">
                  <span className="pg-persona-name">{p.name.split(" ")[0]}</span>
                  <span className="pg-persona-role">{p.role.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="pg-auth-tab-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`pg-auth-tab-btn ${mode === "login" ? "is-active" : ""}`}
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
          >
            🔑 {lang === "hi" ? "लॉग इन (Sign In)" : "Sign In"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={`pg-auth-tab-btn ${mode === "register" ? "is-active" : ""}`}
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
          >
            📋 {lang === "hi" ? "नया पंजीकरण (Register)" : "Register New Account"}
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="pg-auth-alert is-error" role="alert">
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="pg-auth-alert is-success" role="alert">
            <span style={{ fontSize: "16px" }}>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* -------------------- LOGIN FORM -------------------- */}
        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="pg-auth-form">
            <div className="pg-auth-field">
              <label className="pg-auth-label">
                {lang === "hi" ? "ईमेल या 10-अंकीय मोबाइल नंबर" : "Email Address or Mobile Number"}
              </label>
              <div className="pg-input-wrapper">
                <span className="pg-input-icon">📧</span>
                <input
                  type="text"
                  className="pg-auth-input"
                  placeholder={
                    lang === "hi"
                      ? "उदा. ddma.indore@mp.gov.in या 9826011223"
                      : "e.g. ddma.indore@mp.gov.in or 9826011223"
                  }
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="pg-auth-field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "पासवर्ड" : "Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="pg-auth-link"
                >
                  {lang === "hi" ? "पासवर्ड भूल गए?" : "Forgot Password?"}
                </button>
              </div>
              <div className="pg-input-wrapper">
                <span className="pg-input-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="pg-auth-input"
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pg-auth-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <div className="pg-auth-checkbox-row">
              <label className="pg-auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{lang === "hi" ? "मुझे इस डिवाइस पर याद रखें" : "Keep me signed in on this device"}</span>
              </label>
            </div>

            <button
              type="submit"
              className="pg-auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span>⏳ {lang === "hi" ? "सत्यापित हो रहा है..." : "Authenticating..."}</span>
              ) : (
                <span>🚀 {lang === "hi" ? "पोर्टल में प्रवेश करें" : "Sign In to Pragyan"}</span>
              )}
            </button>

            <div className="pg-auth-footer-text">
              <span>{lang === "hi" ? "खाता नहीं है?" : "Don't have an account?"}</span>{" "}
              <button
                type="button"
                className="pg-auth-link-bold"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                }}
              >
                {lang === "hi" ? "यहाँ निःशुल्क पंजीकरण करें" : "Register here"}
              </button>
            </div>
          </form>
        ) : (
          /* -------------------- REGISTER FORM -------------------- */
          <form onSubmit={handleRegisterSubmit} className="pg-auth-form">
            {/* Step 1: Identity & Contact */}
            <div className="pg-auth-row">
              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "पूरा नाम" : "Full Name"} *
                </label>
                <div className="pg-input-wrapper">
                  <span className="pg-input-icon">👤</span>
                  <input
                    type="text"
                    className="pg-auth-input"
                    placeholder="e.g. Rameshwar Patel"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "मोबाइल नंबर" : "Mobile Number (10 digits)"}
                </label>
                <div className="pg-input-wrapper">
                  <span className="pg-input-icon">📱</span>
                  <input
                    type="tel"
                    className="pg-auth-input"
                    placeholder="98260XXXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
              </div>
            </div>

            <div className="pg-auth-field">
              <label className="pg-auth-label">
                {lang === "hi" ? "आधिकारिक / व्यक्तिगत ईमेल पता" : "Email Address"} *
              </label>
              <div className="pg-input-wrapper">
                <span className="pg-input-icon">✉️</span>
                <input
                  type="email"
                  className="pg-auth-input"
                  placeholder="e.g. sarpanch.ajnod@mp.gov.in"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Step 2: Role Selection */}
            <div className="pg-auth-field">
              <label className="pg-auth-label">
                {lang === "hi" ? "आपकी भूमिका / पदनाम चुनें" : "Select Your Role / Affiliation"} *
              </label>
              <div className="pg-auth-role-grid">
                {[
                  { id: "farmer", label: lang === "hi" ? "किसान" : "Farmer / Kisan", icon: "🌾", desc: "Agro-advisories, crop-weather" },
                  { id: "sarpanch", label: lang === "hi" ? "सरपंच / सचिव" : "Sarpanch / PRI", icon: "🌿", desc: "Gram Panchayat authority" },
                  { id: "bdo", label: lang === "hi" ? "बीडीओ (BDO)" : "Block Officer (BDO)", icon: "🏛️", desc: "Janpad level coordination" },
                  { id: "ddma", label: lang === "hi" ? "डीडीएमए अधिकारी" : "DDMA / Collectorate", icon: "🛡️", desc: "District disaster response" },
                  { id: "scientist", label: lang === "hi" ? "मौसम वैज्ञानिक" : "IMD / Agronomist", icon: "🔬", desc: "Climate modeling & physics" },
                ].map((r) => (
                  <div
                    key={r.id}
                    className={`pg-auth-role-card ${regRole === r.id ? "is-selected" : ""}`}
                    onClick={() => setRegRole(r.id)}
                  >
                    <span className="pg-role-icon">{r.icon}</span>
                    <div className="pg-role-text">
                      <span className="pg-role-title">{r.label}</span>
                      <span className="pg-role-desc">{r.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Geographic Jurisdiction */}
            <div className="pg-auth-row">
              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "जिला (District)" : "District"}
                </label>
                <select
                  className="pg-auth-select"
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                >
                  <option value="Indore">Indore (इन्दौर)</option>
                  <option value="Bhopal">Bhopal (भोपाल)</option>
                  <option value="Ujjain">Ujjain (उज्जैन)</option>
                  <option value="Dhar">Dhar (धार)</option>
                  <option value="Dewas">Dewas (देवास)</option>
                  <option value="Sehore">Sehore (सीहोर)</option>
                  <option value="Khargone">Khargone (खरगोन)</option>
                </select>
              </div>

              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "विकासखंड (Block)" : "Block / Tehsil"}
                </label>
                <select
                  className="pg-auth-select"
                  value={regBlock}
                  onChange={(e) => setRegBlock(e.target.value)}
                >
                  <option value="Sanwer">Sanwer (सांवेर)</option>
                  <option value="Depalpur">Depalpur (देपालपुर)</option>
                  <option value="Mhow">Dr. Ambedkar Nagar / Mhow</option>
                  <option value="Indore">Indore HQ</option>
                  <option value="Huzur">Huzur (Bhopal)</option>
                  <option value="Badnagar">Badnagar (Ujjain)</option>
                </select>
              </div>

              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "ग्राम पंचायत (GP)" : "Gram Panchayat"}
                </label>
                <input
                  type="text"
                  className="pg-auth-input"
                  placeholder="e.g. Ajnod"
                  value={regGp}
                  onChange={(e) => setRegGp(e.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Security */}
            <div className="pg-auth-row">
              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "पासवर्ड (कम से कम 6 अक्षर)" : "Password (min 6 characters)"} *
                </label>
                <div className="pg-input-wrapper">
                  <span className="pg-input-icon">🔒</span>
                  <input
                    type="password"
                    className="pg-auth-input"
                    placeholder="••••••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pg-auth-field" style={{ flex: 1 }}>
                <label className="pg-auth-label">
                  {lang === "hi" ? "पासवर्ड की पुष्टि करें" : "Confirm Password"} *
                </label>
                <div className="pg-input-wrapper">
                  <span className="pg-input-icon">🛡️</span>
                  <input
                    type="password"
                    className="pg-auth-input"
                    placeholder="••••••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="pg-auth-checkbox-row">
              <label className="pg-auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                />
                <span>
                  {lang === "hi"
                    ? "मैं एनडीएमए आपदा चेतावनी प्रोटोकॉल और आईएमडी मौसम डेटा सेवा की शर्तों से सहमत हूँ।"
                    : "I agree to the National Disaster Management (NDMA) & IMD Agro-Meteorological protocol guidelines."}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="pg-auth-submit-btn is-register"
              disabled={loading}
            >
              {loading ? (
                <span>⏳ {lang === "hi" ? "खाता तैयार हो रहा है..." : "Creating Account..."}</span>
              ) : (
                <span>✨ {lang === "hi" ? "नया खाता बनाएं और प्रवेश करें" : "Complete Registration & Sign In"}</span>
              )}
            </button>

            <div className="pg-auth-footer-text">
              <span>{lang === "hi" ? "पहले से पंजीकृत हैं?" : "Already have an account?"}</span>{" "}
              <button
                type="button"
                className="pg-auth-link-bold"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                }}
              >
                {lang === "hi" ? "यहाँ लॉग इन करें" : "Sign In here"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="pg-auth-modal-overlay">
          <div className="pg-auth-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#f8fafc" }}>
                🔑 {lang === "hi" ? "पासवर्ड रीसेट निर्देश" : "Password Reset Assistance"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="pg-modal-close"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "10px", lineHeight: "1.5" }}>
              {lang === "hi"
                ? "अपना पंजीकृत ईमेल या मोबाइल दर्ज करें। हम आपको 6-अंकीय ओटीपी और पासवर्ड रीसेट लिंक भेजेंगे।"
                : "Enter your registered email address or mobile number. We will transmit a secure 6-digit OTP verification token."}
            </p>
            {forgotSent ? (
              <div className="pg-auth-alert is-success" style={{ marginTop: "12px" }}>
                ✅ {lang === "hi" ? "रीसेट लिंक भेज दिया गया है!" : "Reset instructions dispatched! (For demo: use password 'pragyan@2026')"}
              </div>
            ) : (
              <div style={{ marginTop: "14px" }}>
                <input
                  type="text"
                  className="pg-auth-input"
                  placeholder="e.g. sarpanch.ajnod@mp.gov.in"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="pg-auth-submit-btn"
                  style={{ marginTop: "12px" }}
                  onClick={() => setForgotSent(true)}
                >
                  📨 {lang === "hi" ? "ओटीपी भेजें" : "Dispatch OTP Token"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
