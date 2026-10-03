/**
 * GramMausam Bilingual (English / Hindi) Localization Engine
 * Provides complete dual-language string dictionary with zero missing keys.
 */

export type Language = "en" | "hi" | "bn";

export const DICTIONARY = {
  brandName: { en: "Pragyan", hi: "प्रज्ञान", bn: "প্রজ্ঞান" },
  brandTagline: {
    en: "Panchayat Micro-Weather Intelligence & Agro-Advisories",
    hi: "ग्राम पंचायत स्तरीय मौसम एवं कृषि परामर्श प्रणाली",
    bn: "গ্রাম পঞ্চায়েত স্তরের আবহাওয়া ও কৃষি পরামর্শ ব্যবস্থা",
  },
  pilotBadge: {
    en: "Panchayat Weather Intelligence",
    hi: "पंचायत मौसम प्रज्ञान",
    bn: "পঞ্চায়েত আবহাওয়া বুদ্ধিমত্তা",
  },
  dataVintage: {
    en: "Archived 2024 Test-Period Data",
    hi: "अभिलेखागार 2024 परीक्षण डेटा",
    bn: "সংরক্ষিত ২০২৪ পরীক্ষার ডেটা",
  },
  snapshotMode: {
    en: "Demo Snapshot Mode (Offline Fallback)",
    hi: "डेमो स्नैपशॉट मोड (ऑफ़लाइन फ़ॉलबैक)",
    bn: "ডেমো স্ন্যাপশট মোড",
  },

  // Tabs
  tabOperations: { en: "Operations", hi: "संचालन (Operations)", bn: "অপারেশনস" },
  tabForecast: { en: "Forecast", hi: "पूर्वानुमान", bn: "পূর্বাভাস" },
  tabAlerts: { en: "Alerts", hi: "चेतावनी", bn: "সতর্কতা" },
  tabEvidence: { en: "Evidence", hi: "प्रमाण व सटीकता", bn: "প্রমাণ" },
  tabModel: { en: "Model", hi: "मॉडल", bn: "মডেল" },
  tabPastEvents: { en: "Past Events", hi: "विगत घटनाएँ", bn: "বিগত ঘটনা" },
  tabReplay: { en: "Replay", hi: "रीप्ले", bn: "রিপ্লে" },
  tabMethodology: { en: "About", hi: "हमारे बारे में", bn: "সম্পর্কে" },
  tabAbout: { en: "About", hi: "हमारे बारे में", bn: "সম্পর্কে" },
  farmerMode: { en: "Farmer Mode", hi: "किसान मोड", bn: "কৃষক মোড" },

  // Weather Variables
  varRainfall: { en: "Rainfall", hi: "वर्षा" },
  varTemperature: { en: "Temperature", hi: "तापमान" },
  varHumidity: { en: "Humidity", hi: "आर्द्रता" },
  varWind: { en: "Wind Speed", hi: "हवा की गति" },
  varET0: { en: "Evapotranspiration (ET₀)", hi: "वाष्पोत्सर्जन (ET₀)" },

  // Granularity / Resolution Toggle
  granularityPanchayat: { en: "Downscaled Panchayat", hi: "डाउनस्केल ग्राम पंचायत" },
  granularityBlock: { en: "Coarse Block NWP", hi: "मोटा ब्लॉक पूर्वानुमान" },

  // Status & Badges
  statusFavorable: { en: "Favorable", hi: "अनुकूल" },
  statusAdvisory: { en: "Advisory", hi: "सलाह" },
  statusWatch: { en: "Watch", hi: "निगरानी" },
  statusWarning: { en: "Warning", hi: "चेतावनी" },
  statusOffgrid: { en: "Off-Grid", hi: "ऑफ-ग्रिड" },
  statusNotMeasured: { en: "NOT YET MEASURED", hi: "अभी मापा नहीं गया" },
  statusNotRecorded: { en: "NOT RECORDED IN TEST ARCHIVE", hi: "परीक्षण पुरालेख में दर्ज नहीं" },

  // Inspector Panel Labels
  selectedPanchayat: { en: "Selected Panchayat", hi: "चयनित ग्राम पंचायत" },
  elevation: { en: "Elevation", hi: "ऊंचाई" },
  slope: { en: "Slope", hi: "ढलान" },
  landcover: { en: "Land Cover", hi: "भूमि आवरण" },
  confidenceBand: { en: "80% Confidence Interval", hi: "80% विश्वास अंतराल" },
  agrometAdvisory: { en: "Agro-Meteorological Advisory", hi: "कृषि मौसम परामर्श" },
  actionLabel: { en: "Action Required", hi: "आवश्यक कार्रवाई" },
  whyLabel: { en: "Why / Meteorological Trigger", hi: "कारण / मौसम का आधार" },
  timingLabel: { en: "Operational Window", hi: "समय सीमा" },

  // Soil Moisture & Irrigation
  soilWaterBalance: { en: "Root-Zone Soil Water Balance", hi: "जड़-क्षेत्र मृदा जल संतुलन" },
  irrigationSchedule: { en: "Prescriptive Irrigation", hi: "सिंचाई परामर्श" },
  soilProfileNotice: {
    en: "Assumed default soil profile (60 cm root zone: FC 140 mm, WP 65 mm, MAD 50%), not measured",
    hi: "अनुमानित डिफ़ॉल्ट मृदा प्रोफ़ाइल (60 सेमी जड़ क्षेत्र: FC 140 मिमी, WP 65 मिमी, MAD 50%), वास्तविक मापन नहीं",
  },

  // Map Controls & Tooltips
  leadDay: { en: "Lead Day", hi: "अग्रिम दिन" },
  searchPlaceholder: { en: "Search Panchayat or LGD Code...", hi: "पंचायत या एलजीडी कोड खोजें..." },
  blockFilter: { en: "Filter Block", hi: "प्रखंड चुनें" },
  allBlocks: { en: "All 10 Blocks", hi: "सभी 10 प्रखंड" },
  highUncertaintyNotice: {
    en: "wider spread than other panchayats (relative)",
    hi: "अन्य पंचायतों की तुलना में व्यापक प्रसार (सापेक्ष)",
  },

  // Evidence & Validation
  baselineComparison: { en: "Downscaling Baseline Ladder Comparison", hi: "डाउनस्केलिंग बेसलाइन तुलना सीढ़ी" },
  independentValidationNotice: {
    en: "Not independent validation (target derived from the same lapse-rate formula)",
    hi: "स्वतंत्र सत्यापन नहीं (लक्ष्य मान समान लैप्स-दर सूत्र से उत्पन्न)",
  },
  stationValidationHeader: {
    en: "Regional Station Consistency Check (Synthetic Lapse-Rate Targets)",
    hi: "क्षेत्रीय केंद्र निरंतरता परीक्षण (सिंथेटिक लैप्स-दर लक्ष्य)",
  },
  noRainGaugesNotice: {
    en: "Pipeline consistency check on synthetic targets. Real independent in-situ station validation is not yet instrumented.",
    hi: "सिंथेटिक लक्ष्यों पर पाइपलाइन निरंतरता परीक्षण। वास्तविक स्वतंत्र वेधशाला सत्यापन अभी स्थापित नहीं है।",
  },

  // Alerts & CAP
  capExportBtn: { en: "Download CAP 1.2 XML", hi: "CAP 1.2 XML डाउनलोड करें" },
  alertsThatWereRight: { en: "Historical Alerts Verification", hi: "विगत चेतावनियों का सत्यापन" },

  // Common UI
  refresh: { en: "Refresh", hi: "ताज़ा करें" },
  close: { en: "Close", hi: "बंद करें" },
  sourceLabel: { en: "Data Source", hi: "डेटा स्रोत" },
  asOf: { en: "As of", hi: "समय" },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

export function t(key: TranslationKey, lang: Language): string {
  const item = DICTIONARY[key];
  if (!item) return key;
  return (item as any)[lang] || item.en;
}
