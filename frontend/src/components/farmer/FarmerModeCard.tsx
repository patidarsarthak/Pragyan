import React, { useState } from "react";
import { Language } from "../../lib/i18n";
import { THEME } from "../../theme";

interface FarmerModeCardProps {
  panchayatName?: string;
  blockName?: string;
  districtName?: string;
  cropName?: string;
  actionText?: string;
  reasonText?: string;
  windowText?: string;
  lang: Language;
  onClose?: () => void;
}

export const FarmerModeCard: React.FC<FarmerModeCardProps> = ({
  panchayatName = "Sanwer (सांवेर)",
  blockName = "Sanwer",
  districtName = "Indore (इंदौर)",
  cropName = "Soybean & Paddy (सोयाबीन व धान)",
  actionText = "रासायनिक कीटनाशक एवं यूरिया का छिड़काव तुरंत रोकें। खेतों से जल निकासी के निकास खुले रखें।",
  reasonText = "आगामी 24 से 48 घंटों में 65 मिमी से अधिक मूसलाधार बारिश तथा 45 किमी/घंटा तेज हवा की संभावना।",
  windowText = "सुरक्षित कार्य समय: 6 अक्टूबर दोपहर बाद से मौसम अनुकूल रहेगा।",
  lang,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const fullText = `${panchayatName} के किसान भाइयों के लिए सलाह: ${actionText} कारण: ${reasonText} समय: ${windowText}`;

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) {
      alert("Audio speech is not supported on this device.");
      return;
    }
    if (window.speechSynthesis.speaking && isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleWhatsAppShare = () => {
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `🌾 *प्रज्ञान किसान परामर्श - ${panchayatName}*\n\n` +
      `✅ *सलाह / कार्रवाई:* ${actionText}\n\n` +
      `⚠️ *मौसम का कारण:* ${reasonText}\n\n` +
      `⏱️ *समय:* ${windowText}\n\n` +
      `🔗 अधिक जानकारी: https://pragyan.gov.in/?region=IN-MP-INDORE`
    )}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="sk-farmer-overlay" role="dialog" aria-modal="true" aria-label="Farmer Mode Agro-Advisory">
      <div className="sk-farmer-card">
        {/* Top Header */}
        <div className="sk-farmer-header">
          <div className="sk-farmer-badge">
            <span className="sk-farmer-glyph">🌾</span>
            <span>{lang === "hi" ? "किसान परामर्श कार्ड" : "Farmer Agromet Card"}</span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {onClose && (
              <button
                className="sk-action-btn"
                onClick={onClose}
                aria-label="Exit Farmer Mode"
                title="Exit Farmer Mode"
              >
                ✕ {lang === "hi" ? "वापस जाएं" : "Close"}
              </button>
            )}
          </div>
        </div>

        {/* Location Banner */}
        <div className="sk-farmer-location">
          <h2>{panchayatName}</h2>
          <span className="sk-farmer-sub">{blockName}, {districtName} · फसल: {cropName}</span>
        </div>

        {/* 3-Line High Contrast Vernacular Cards */}
        <div className="sk-farmer-lines">
          {/* Line 1: Action */}
          <div className="sk-farmer-line-item is-action">
            <div className="sk-farmer-line-icon">🚜</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{lang === "hi" ? "1. क्या करें (कार्रवाई)" : "1. What To Do (Action)"}</span>
              <p className="sk-farmer-line-main">{actionText}</p>
            </div>
          </div>

          {/* Line 2: Why / Weather Reason */}
          <div className="sk-farmer-line-item is-reason">
            <div className="sk-farmer-line-icon">🌧️</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{lang === "hi" ? "2. मौसम का कारण (चेतावनी)" : "2. Weather Reason (Warning)"}</span>
              <p className="sk-farmer-line-main">{reasonText}</p>
            </div>
          </div>

          {/* Line 3: Window / Safe Period */}
          <div className="sk-farmer-line-item is-window">
            <div className="sk-farmer-line-icon">⏱️</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{lang === "hi" ? "3. सुरक्षित समय (कब करें)" : "3. Safe Window"}</span>
              <p className="sk-farmer-line-main">{windowText}</p>
            </div>
          </div>
        </div>

        {/* Audio & WhatsApp Action Buttons */}
        <div className="sk-farmer-actions">
          <button
            className={`sk-farmer-audio-btn ${isPlaying ? "is-playing" : ""}`}
            onClick={handleSpeak}
          >
            <span className="sk-audio-icon">{isPlaying ? "⏹" : "🔊"}</span>
            <span>{isPlaying ? (lang === "hi" ? "ऑडियो रोकें" : "Stop Audio") : (lang === "hi" ? "परामर्श सुनें (Audio)" : "Listen to Advisory")}</span>
          </button>

          <button
            className="sk-farmer-wa-btn"
            onClick={handleWhatsAppShare}
          >
            <span className="sk-wa-icon">💬</span>
            <span>{lang === "hi" ? "व्हाट्सएप पर साझा करें" : "Share on WhatsApp"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
