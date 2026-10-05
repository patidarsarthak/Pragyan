import React, { useState, useEffect } from "react";
import { Language, t } from "../../lib/i18n";
import { THEME } from "../../theme";
import { fetchUIChildren, fetchUIGP } from "../../api/client";
import { IndiaChoroplethMap } from "../map/IndiaChoroplethMap";
import { DrillDownMap } from "../map/DrillDownMap";
import { BreadcrumbItem } from "../map/MapStatusBar";
import type { UIGPDetailResponse, UISearchV2Result } from "../../api/types";

interface FarmerAdvisoryPortalProps {
  lang: Language;
  onExit: () => void;
  initialGpCode?: number | null;
}

export interface CropInfo {
  id: string;
  name: { en: string; hi: string; bn: string };
  icon: string;
  season: "Rabi" | "Kharif" | "Zaid";
  durationDays: number;
}

const CROPS: CropInfo[] = [
  { id: "durum_wheat", name: { en: "Durum Wheat (Malvi)", hi: "मालव गेहूं (शरबती)", bn: "গম (ডুরম)" }, icon: "🌾", season: "Rabi", durationDays: 120 },
  { id: "soybean", name: { en: "Soybean (JS-9560)", hi: "सोयाबीन (जेएस-9560)", bn: "সয়াবিন" }, icon: "🌱", season: "Kharif", durationDays: 95 },
  { id: "chickpea", name: { en: "Chickpea (Chana)", hi: "चना (देसी व काबुली)", bn: "ছোলা" }, icon: "🧆", season: "Rabi", durationDays: 110 },
  { id: "cotton", name: { en: "Cotton (Kapas)", hi: "कपास (बीटी)", bn: "তুলা" }, icon: "☁️", season: "Kharif", durationDays: 160 },
  { id: "mustard", name: { en: "Mustard (Sarson)", hi: "सरसों / राई", bn: "সরিষা" }, icon: "🌼", season: "Rabi", durationDays: 105 },
  { id: "maize", name: { en: "Maize (Makka)", hi: "मक्का (संकर)", bn: "ভুট্টা" }, icon: "🌽", season: "Kharif", durationDays: 90 },
  { id: "onion", name: { en: "Onion (Pyaz)", hi: "प्याज़ (रबी)", bn: "পেঁয়াজ" }, icon: "🧅", season: "Rabi", durationDays: 130 },
  { id: "garlic", name: { en: "Garlic (Lahsun)", hi: "लहसुन (रियावन)", bn: "রসুন" }, icon: "🧄", season: "Rabi", durationDays: 135 },
];

export const FarmerAdvisoryPortal: React.FC<FarmerAdvisoryPortalProps> = ({
  lang,
  onExit,
  initialGpCode = 133601, // Default Ajnod / Sanwer
}) => {
  const [selectedCrop, setSelectedCrop] = useState<string>("durum_wheat");
  const [selectedGpCode, setSelectedGpCode] = useState<number>(initialGpCode || 133601);
  const [gpData, setGpData] = useState<UIGPDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<UISearchV2Result[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Map state inside Farmer portal
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: "india", id: "IN", name: "India" },
    { level: "state", id: "IN-MP", name: "Madhya Pradesh" },
    { level: "district", id: "district:407", name: "Indore" },
    { level: "block", id: "block:3376", name: "Sanwer" },
  ]);

  // Load GP data whenever selectedGpCode changes
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchUIGP(selectedGpCode)
      .then((res) => {
        if (!mounted) return;
        setGpData(res);
        setIsLoading(false);
      })
      .catch(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedGpCode]);

  // Search input debounced query
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/ui/search-v2?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => (r.ok ? r.json() : []))
        .then((items) => {
          setSearchResults(items);
          setShowSearchDropdown(items.length > 0);
          setIsSearching(false);
        })
        .catch(() => {
          setIsSearching(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: UISearchV2Result) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    if (item.level === "gp") {
      const code = typeof item.id === "string" ? parseInt(item.id.replace("gp:", ""), 10) : item.id;
      if (!isNaN(code)) setSelectedGpCode(code);
    }
    if (item.path && item.path.length > 0) {
      setBreadcrumbs([
        { level: "india", id: "IN", name: "India" },
        ...item.path.map((p) => ({
          level: p.level as any,
          id: p.id,
          name: p.name,
        })),
      ]);
    }
  };

  const currentCrop = CROPS.find((c) => c.id === selectedCrop) || CROPS[0];
  const cropTitle = currentCrop.name[lang] || currentCrop.name.en;

  // Extract weather variables
  const day1Rain = gpData?.variables?.rain?.[0]?.downscaled;
  const day1Temp = gpData?.variables?.temp?.[0]?.downscaled;
  const day1Hum = gpData?.variables?.humidity?.[0]?.downscaled;
  const day1Wind = gpData?.variables?.wind?.[0]?.downscaled;

  const weather = gpData?.today || {
    rainfall_mm: day1Rain !== undefined ? day1Rain : 0.0,
    temp_max: day1Temp !== undefined ? Math.round((day1Temp + 4.2) * 10) / 10 : 31.4,
    temp_min: day1Temp !== undefined ? Math.round((day1Temp - 5.5) * 10) / 10 : 19.8,
    humidity_pct: day1Hum !== undefined ? Math.round(day1Hum) : 62,
    wind_speed_kmh: day1Wind !== undefined ? Math.round(day1Wind * 10) / 10 : 11.5,
  };

  const rainMm = Number(weather.rainfall_mm || 0);
  const windKmh = Number(weather.wind_speed_kmh || 12);
  const tempMax = Number(weather.temp_max || 31);
  const tempMin = Number(weather.temp_min || 20);
  const humidity = Number(weather.humidity_pct || 60);

  // Dynamic DOs & DON'Ts Generation based on weather and selected crop
  const getDosAndDonts = () => {
    const dos: Array<{ title: string; desc: string; tag: string }> = [];
    const donts: Array<{ title: string; desc: string; tag: string; warning: string }> = [];

    // Weather-driven DOs
    if (rainMm > 15) {
      dos.push({
        title: lang === "hi" ? "खेतों में जल निकासी चैनल खोलें" : "Open Field Drainage Channels",
        desc: lang === "hi" ? `आगामी 24 घंटे में ${rainMm} मिमी वर्षा की संभावना है। मेड़ों के किनारे जलनिकासी नाली तुरंत साफ करें ताकि जलभराव न हो।` : `Rainfall of ${rainMm}mm expected. Clear field boundary ditches to prevent standing water and root asphyxiation.`,
        tag: lang === "hi" ? "जल प्रबंधन" : "Water Management",
      });
    } else {
      dos.push({
        title: lang === "hi" ? "सतही गुड़ाई व खरपतवार नियंत्रण करें" : "Perform Shallow Hoeing & Weed Mulching",
        desc: lang === "hi" ? "मौसम खुला रहने से मिट्टी में नमी संरक्षण हेतु हल्की गुड़ाई करें। खरपतवार निकालें।" : "Dry weather conditions are optimal for shallow weeding and inter-row moisture retention.",
        tag: lang === "hi" ? "सस्य क्रियाएँ" : "Intercultural Operations",
      });
    }

    // Crop specific DOs
    if (selectedCrop === "durum_wheat") {
      dos.push({
        title: lang === "hi" ? "प्रथम सिंचाई (क्राउन रूट इनिशिएशन - 21 दिन) की योजना बनाएं" : "Plan First Irrigation (CRI Stage - 21 DAS)",
        desc: lang === "hi" ? "गेहूं में कल्ले फूटने के समय 45-50 मिमी हल्की सिंचाई करें। साथ में 25 किग्रा यूरिया प्रति एकड़ दें।" : "Apply light 45mm irrigation at Crown Root Initiation stage along with 25kg urea/acre top-dress.",
        tag: lang === "hi" ? "सिंचाई व पोषण" : "Nutrition & Irrigation",
      });
      dos.push({
        title: lang === "hi" ? "दीमक एवं माहू (एफिड) का निरीक्षण करें" : "Scout for Termites and Aphids",
        desc: lang === "hi" ? "सुबह के समय पत्तियों के निचले हिस्से में पीले रतुआ और माहू के प्रकोप की निगरानी करें।" : "Inspect lower foliage for initial signs of yellow rust spores and aphid colonies.",
        tag: lang === "hi" ? "कीट निगरानी" : "Pest Scouting",
      });
    } else if (selectedCrop === "soybean") {
      dos.push({
        title: lang === "hi" ? "फली छेदक कीट हेतु फेरोमोन ट्रैप लगाएं" : "Install Pheromone Traps for Pod Borer",
        desc: lang === "hi" ? "प्रति एकड़ 4-5 फेरोमोन ट्रैप लगाएं। नीम तेल (1500 पीपीएम) 5 मिली प्रति लीटर छिड़कें।" : "Install 4-5 pheromone traps per acre to monitor Spodoptera and semilooper moths.",
        tag: lang === "hi" ? "जैविक कीट नियंत्रण" : "Bio-Pest Control",
      });
    } else if (selectedCrop === "chickpea") {
      dos.push({
        title: lang === "hi" ? "उकठा (विल्ट) रोग की रोकथाम हेतु ट्राइकोडर्मा का प्रयोग करें" : "Apply Trichoderma Viride for Fusarium Wilt",
        desc: lang === "hi" ? "2.5 किग्रा ट्राइकोडर्मा को 50 किग्रा गोबर की सड़ी खाद में मिलाकर प्रति एकड़ छिड़कें।" : "Soil incorporate Trichoderma viride enriched FYM to suppress soil-borne fungal wilt.",
        tag: lang === "hi" ? "रोग नियंत्रण" : "Disease Prevention",
      });
    } else {
      dos.push({
        title: lang === "hi" ? "सूक्ष्म पोषक तत्व (जिंक सल्फेट) का छिड़काव" : "Foliar Spray of Micronutrients (Zinc & Boron)",
        desc: lang === "hi" ? "0.5% जिंक सल्फेट + 0.25% बुझा हुआ चूना का छिड़काव फसल की वानस्पतिक वृद्धि को तेज करता है।" : "Spray 0.5% zinc sulfate to address chlorosis and support strong tillering.",
        tag: lang === "hi" ? "पोषक तत्व" : "Micronutrients",
      });
    }

    // Weather-driven STRICT DON'Ts
    if (windKmh > 12) {
      donts.push({
        title: lang === "hi" ? "कीटनाशक एवं खरपतवारनाशी का छिड़काव बिल्कुल न करें" : "STRICTLY DO NOT Spray Pesticides or Herbicides",
        desc: lang === "hi" ? `आज हवा की गति ${windKmh} किमी/घंटा है। छिड़काव करने पर 60% से अधिक दवा हवा में उड़कर नष्ट हो जाएगी तथा पड़ोसी फसलों को नुकसान होगा।` : `Wind speed is ${windKmh} km/h. Spraying will cause severe drift loss (>60%) and ineffective canopy coverage.`,
        tag: lang === "hi" ? "छिड़काव निषेध" : "Spray Prohibited",
        warning: lang === "hi" ? "हवा की गति 12 किमी/घंटा से अधिक" : "Wind speed > 12 km/h",
      });
    }

    if (rainMm > 8) {
      donts.push({
        title: lang === "hi" ? "यूरिया या नाइट्रोजन उर्वरक का भुरकाव न करें" : "DO NOT Broadcast Urea / Nitrogen Fertilizer",
        desc: lang === "hi" ? "बारिश से यूरिया धुल जाएगा (Leaching) और जमीन के नीचे बह जाएगा। बारिश थमने तक उर्वरक रोकें।" : "Rainfall will wash away surface nitrogen, causing severe leaching and groundwater waste.",
        tag: lang === "hi" ? "उर्वरक निषेध" : "Fertilizer Halt",
        warning: lang === "hi" ? "वर्षा के कारण लीचिंग का खतरा" : "Rainfall wash-off hazard",
      });
      donts.push({
        title: lang === "hi" ? "आज भारी सिंचाई न करें" : "DO NOT Flood Irrigate Today",
        desc: lang === "hi" ? "आगामी बारिश से खेत में प्राकृतिक नमी पर्याप्त रहेगी। सिंचाई से जड़ सड़न हो सकती है।" : "Natural precipitation will fulfill root zone requirement. Flooding will cause root rot.",
        tag: lang === "hi" ? "सिंचाई निषेध" : "Irrigation Halt",
        warning: lang === "hi" ? "मिट्टी में संतृप्ति स्तर" : "Soil saturation risk",
      });
    }

    if (humidity > 78) {
      donts.push({
        title: lang === "hi" ? "कटी हुई फसल को खुले में न छोड़ें" : "DO NOT Leave Harvested Produce in Open",
        desc: lang === "hi" ? `हवा में नमी ${humidity}% है। खुले में रखने से फफूंद (Fungus/Aflatoxin) लगने का भारी जोखिम है। सुरक्षित तिरपाल से ढकें।` : `High relative humidity (${humidity}%) promotes fungal mold and aflatoxin. Store produce under tarpaulin.`,
        tag: lang === "hi" ? "फसल सुरक्षा" : "Storage Hazard",
        warning: lang === "hi" ? "उच्च वायुमंडलीय आर्द्रता" : "High humidity > 78%",
      });
    }

    // Default universal safety DON'T
    if (donts.length < 2) {
      donts.push({
        title: lang === "hi" ? "दोपहर के तीव्र तापमान (12 से 3 बजे) में कीटनाशक न डालें" : "DO NOT Spray Under Direct Noon Sun (12 PM - 3 PM)",
        desc: lang === "hi" ? "तीव्र धूप में दवा का वाष्पीकरण हो जाता है और पौधों की पत्तियां झुलस सकती हैं। हमेशा सुबह 8-11 बजे या शाम 4-6 बजे छिड़कें।" : "High solar radiation causes rapid droplet evaporation and leaf phytotoxicity. Spray in early morning or late afternoon.",
        tag: lang === "hi" ? "तापमान निषेध" : "Thermal Rule",
        warning: lang === "hi" ? "पत्ती झुलसने का जोखिम" : "Phytotoxicity risk",
      });
    }

    return { dos, donts };
  };

  const { dos, donts } = getDosAndDonts();

  // TTS Voice Narration
  const handleSpeakSummary = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }
    if (window.speechSynthesis.speaking && isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();

    const doSummary = dos.map((d) => d.title).join(". ");
    const dontSummary = donts.map((d) => d.title).join(". ");
    const fullText =
      lang === "hi"
        ? `ग्राम पंचायत ${gpData?.gp_name || "अजनोद"} के लिए ${cropTitle} की आज की सलाह। आज क्या करें: ${doSummary}। आज क्या न करें: ${dontSummary}। अधिक जानकारी हेतु किसान कॉल सेंटर 1800 180 1551 पर संपर्क करें।`
        : `Farmer Advisory for Gram Panchayat ${gpData?.gp_name || "Ajnod"} on ${cropTitle}. Today's recommended actions: ${doSummary}. Critical things NOT to do today: ${dontSummary}. For help, contact Kisan Call Centre at 1800 180 1551.`;

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-IN" : "en-IN";
    utterance.rate = 0.92;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="sk-farmer-portal" style={{ minHeight: "100vh", background: "#F8FAFC", paddingBottom: "3rem" }}>
      {/* Top Banner Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #064E3B 0%, #065F46 100%)",
          color: "#FFFFFF",
          padding: "1rem 1.5rem",
          boxShadow: "0 4px 12px rgba(6, 78, 59, 0.25)",
        }}
      >
        <div style={{ maxWidth: "1560px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "2rem" }}>🌾</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#A7F3D0", textTransform: "uppercase" }}>
                {lang === "hi" ? "ग्राम पंचायत कृषि मौसम सेवा" : "GRAM PANCHAYAT AGRO-METEOROLOGICAL ADVISORY"}
              </div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }}>
                {lang === "hi" ? "किसान मौसम एवं फसल कार्य योजना" : "Kisan Weather & Crop-Specific Action Plan"}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleSpeakSummary}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "9999px",
                background: isPlayingAudio ? "#F59E0B" : "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>{isPlayingAudio ? "⏹" : "🔊"}</span>
              <span>{isPlayingAudio ? (lang === "hi" ? "ऑडियो रोकें" : "Stop Audio") : (lang === "hi" ? "आवाज में सुनें" : "Listen Audio")}</span>
            </button>

            <button
              onClick={onExit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "9999px",
                background: "#FFFFFF",
                color: "#065F46",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              }}
            >
              <span>←</span>
              <span>{lang === "hi" ? "संचालन पर लौटें" : "Back to Operations"}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1560px", margin: "1.25rem auto", padding: "0 1.25rem" }}>
        {/* Search Omnibox & Active Location Card */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem", marginBottom: "1.25rem" }}>
          {/* Search Box */}
          <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E2E8F0", position: "relative" }}>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
              🔍 {lang === "hi" ? "स्थान खोजें (ग्राम पंचायत, ब्लॉक, ज़िला या एलजीडी कोड)" : "Search Location (Gram Panchayat, Block, District or LGD Code)"}
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "hi" ? "उदा. अजनोद, 133601, सांवेर, इंदौर..." : "e.g. Ajnod, 133601, Sanwer, Indore..."}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
              {isSearching && <span style={{ fontSize: "12px", color: "#64748B", alignSelf: "center" }}>Searching...</span>}
            </div>

            {/* Dropdown Results */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "14px",
                  right: "14px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  zIndex: 99,
                  maxHeight: "280px",
                  overflowY: "auto",
                  marginTop: "4px",
                }}
              >
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.id}-${i}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(r)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "none",
                      borderBottom: "1px solid #F1F5F9",
                      background: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0F172A" }}>{r.name}</strong>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        {r.path?.map((p) => p.name).join(" › ") || r.level.toUpperCase()}
                      </div>
                    </div>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#E2E8F0", color: "#334155", textTransform: "uppercase" }}>
                      {r.level}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Gram Panchayat Weather Pill Card */}
          <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "2px 6px", borderRadius: "4px" }}>
                  1KM CADASTRAL WEATHER
                </span>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", margin: "4px 0 2px" }}>
                  {gpData?.gp_name || "Ajnod (अजनोद)"}
                </h3>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  {gpData?.block_name || "Sanwer"} Block · {gpData?.district_name || "Indore"} · LGD #{selectedGpCode}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A" }}>{tempMax}°C</span>
                <div style={{ fontSize: "10px", color: "#64748B" }}>Min: {tempMin}°C</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "10px", borderTop: "1px solid #F1F5F9", paddingTop: "8px", fontSize: "11.5px" }}>
              <span>🌧️ {lang === "hi" ? "वर्षा" : "Rain"}: <strong>{rainMm} mm</strong></span>
              <span>💨 {lang === "hi" ? "हवा" : "Wind"}: <strong>{windKmh} km/h</strong></span>
              <span>💧 {lang === "hi" ? "नमी" : "Humidity"}: <strong>{humidity}%</strong></span>
            </div>
          </div>
        </div>

        {/* Crop Selection Bar ("options like check the crops") */}
        <div style={{ background: "#FFFFFF", borderRadius: "10px", padding: "14px 16px", border: "1px solid #E2E8F0", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#0F172A", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>🌱 {lang === "hi" ? "फसल चुनें (फसल-विशिष्ट सिफारिशों के लिए):" : "Select Your Crop (for tailored agronomic directives):"}</span>
            <span style={{ fontSize: "11px", color: "#64748B" }}>Season: {currentCrop.season} · Duration: {currentCrop.durationDays} Days</span>
          </div>

          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "thin" }}>
            {CROPS.map((c) => {
              const isSelected = selectedCrop === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCrop(c.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "9999px",
                    border: isSelected ? "2px solid #059669" : "1px solid #CBD5E1",
                    background: isSelected ? "#ECFDF5" : "#FFFFFF",
                    color: isSelected ? "#065F46" : "#334155",
                    fontSize: "12.5px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "0 2px 6px rgba(5,150,105,0.2)" : "none",
                  }}
                >
                  <span style={{ fontSize: "15px" }}>{c.icon}</span>
                  <span>{c.name[lang] || c.name.en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN ADVISORY ACTION SECTION (The user's key ask: "today's what to do in the crops and what to not do") */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
          {/* 1. GREEN CARD: WHAT TO DO TODAY */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              border: "2px solid #10B981",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ background: "#ECFDF5", padding: "12px 16px", borderBottom: "1px solid #A7F3D0", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>✅</span>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#065F46", margin: 0 }}>
                  {lang === "hi" ? "आज क्या करें (करणीय कार्य)" : "WHAT TO DO TODAY (Recommended Action)"}
                </h3>
                <div style={{ fontSize: "11px", color: "#047857" }}>
                  {cropTitle} · {lang === "hi" ? "मौसम अनुसार अनुशंसित कार्य" : "Tailored to today's downscaled forecast"}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {dos.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    borderRadius: "8px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13.5px", color: "#065F46" }}>{item.title}</strong>
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#DCFCE7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>
                      {item.tag}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. RED CARD: WHAT NOT TO DO TODAY */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              border: "2px solid #EF4444",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ background: "#FEF2F2", padding: "12px 16px", borderBottom: "1px solid #FECACA", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.4rem" }}>🚫</span>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#991B1B", margin: 0 }}>
                  {lang === "hi" ? "आज क्या न करें (सख्त निषेध / सावधानियां)" : "WHAT NOT TO DO TODAY (Strict Prohibitions)"}
                </h3>
                <div style={{ fontSize: "11px", color: "#B91C1C" }}>
                  {cropTitle} · {lang === "hi" ? "फसल नुकसान से बचने हेतु चेतावनी" : "Critical precautions to prevent financial loss"}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {donts.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#FFF5F5",
                    border: "1px solid #FED7D7",
                    borderRadius: "8px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13.5px", color: "#991B1B" }}>❌ {item.title}</strong>
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#FEE2E2", color: "#991B1B", padding: "2px 6px", borderRadius: "4px" }}>
                      {item.warning}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Map & Panchayats Drill-Down in Farmer Mode */}
        <div style={{ background: "#FFFFFF", borderRadius: "10px", border: "1px solid #E2E8F0", padding: "16px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                🗺️ {lang === "hi" ? "मानचित्र पर ग्राम पंचायत चुनें" : "Click Map to Choose Any Village / Gram Panchayat"}
              </h3>
              <div style={{ fontSize: "11px", color: "#64748B" }}>
                {lang === "hi" ? "मानचित्र में सीधे क्लिक करके किसी भी पंचायत का फसल परामर्श देखें" : "Click anywhere on the map to switch Panchayats and load village advisories"}
              </div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "3px 8px", borderRadius: "4px" }}>
              Active: {gpData?.gp_name || "Ajnod"} (#{selectedGpCode})
            </span>
          </div>

          <div style={{ height: "460px", borderRadius: "8px", overflow: "hidden", border: "1px solid #E2E8F0" }}>
            <DrillDownMap
              breadcrumbs={breadcrumbs}
              onNavigateScope={(bc) => setBreadcrumbs((prev) => [...prev, bc])}
              selectedGpCode={selectedGpCode}
              onSelectGp={(lgd) => setSelectedGpCode(lgd)}
              activeLeadDay={1}
              mapMode="crop"
              activeVariable="rainfall"
              activeCropId={selectedCrop}
            />
          </div>
        </div>

        {/* Support & KVK Contact Footer */}
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong style={{ fontSize: "13px", color: "#065F46" }}>
              📞 {lang === "hi" ? "किसान सहायता केंद्र / वैज्ञानिक संपर्क" : "Kisan Support & Local Agronomist Hotline"}
            </strong>
            <div style={{ fontSize: "11.5px", color: "#047857" }}>
              {lang === "hi" ? "निःशुल्क राष्ट्रीय किसान कॉल सेंटर:" : "National Toll-Free Kisan Call Centre:"} <strong>1800-180-1551</strong> (सुबह 6:00 से रात 10:00 तक)
            </div>
          </div>
          <div style={{ fontSize: "11.5px", color: "#065F46", fontWeight: 600 }}>
            📍 Krishi Vigyan Kendra (KVK) Kasturbagram, Indore · Phone: 0731-2856230
          </div>
        </div>
      </div>
    </div>
  );
};
