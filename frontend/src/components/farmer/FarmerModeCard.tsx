import React, { useState, useEffect } from "react";
import { Language, t } from "../../lib/i18n";
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

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [onClose]);

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
    utterance.lang = lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-IN" : "en-IN";
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
    <div
      className="sk-farmer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Farmer Mode Agro-Advisory"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="sk-farmer-card">
        {/* Top Header */}
        <div className="sk-farmer-header">
          <div className="sk-farmer-badge">
            <span className="sk-farmer-glyph">🌾</span>
            <span>{t("farmerCardTitle", lang)}</span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {onClose && (
              <button
                className="sk-action-btn"
                onClick={onClose}
                aria-label="Exit Farmer Mode"
                title="Exit Farmer Mode"
              >
                ✕ {t("close", lang)}
              </button>
            )}
          </div>
        </div>

        {/* Location Banner */}
        <div className="sk-farmer-location">
          <h2>{panchayatName}</h2>
          <span className="sk-farmer-sub">{blockName}, {districtName} · {lang === "hi" ? "फसल: " : lang === "bn" ? "ফসল: " : "Crop: "}{cropName}</span>
        </div>

        {/* 3-Line High Contrast Vernacular Cards */}
        <div className="sk-farmer-lines">
          {/* Line 1: Action */}
          <div className="sk-farmer-line-item is-action">
            <div className="sk-farmer-line-icon">🚜</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{t("farmerWhatToDo", lang)}</span>
              <p className="sk-farmer-line-main">{actionText}</p>
            </div>
          </div>

          {/* Line 2: Why / Weather Reason */}
          <div className="sk-farmer-line-item is-reason">
            <div className="sk-farmer-line-icon">🌧️</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{t("farmerWeatherReason", lang)}</span>
              <p className="sk-farmer-line-main">{reasonText}</p>
            </div>
          </div>

          {/* Line 3: Window / Safe Period */}
          <div className="sk-farmer-line-item is-window">
            <div className="sk-farmer-line-icon">⏱️</div>
            <div className="sk-farmer-line-content">
              <span className="sk-farmer-line-label">{t("farmerSafeWindow", lang)}</span>
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
            <span>{isPlaying ? t("farmerAudioStop", lang) : t("farmerAudioListen", lang)}</span>
          </button>

          <button
            className="sk-farmer-wa-btn"
            onClick={handleWhatsAppShare}
          >
            <span className="sk-wa-icon">💬</span>
            <span>{t("farmerShareWa", lang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
