/**
 * Pragyan Trilingual (English / Hindi / Bengali) Localization Engine
 * Provides comprehensive translation dictionary with zero missing keys.
 */

export type Language = "en" | "hi" | "bn";

export const DICTIONARY = {
  // Brand & Subtitle
  brandName: { en: "Pragyan", hi: "प्रज्ञान", bn: "প্রজ্ঞান" },
  brandTagline: {
    en: "Panchayat Micro-Weather Intelligence & Agro-Advisories",
    hi: "ग्राम पंचायत स्तरीय सूक्ष्म मौसम एवं कृषि परामर्श प्रणाली",
    bn: "গ্রাম পঞ্চায়েত স্তরের মাইক্রো-আবহাওয়া ও কৃষি পরামর্শ ব্যবস্থা",
  },
  pilotBadge: {
    en: "Madhya Pradesh Pilot · Panchayat Weather Intelligence",
    hi: "मध्य प्रदेश पायलट · ग्राम पंचायत मौसम प्रज्ञान",
    bn: "মধ্যপ্রদেশ পাইলট · পঞ্চায়েত আবহাওয়া বুদ্ধিমত্তা",
  },
  dataVintage: {
    en: "Archived 2024 Test-Period Data",
    hi: "अभिलेखागार 2024 परीक्षण डेटा",
    bn: "সংরক্ষিত ২০২৪ পরীক্ষার ডেটা",
  },
  snapshotMode: {
    en: "Demo Snapshot Mode (Offline Fallback)",
    hi: "डेमो स्नैपशॉट मोड (ऑफ़लाइन फ़ॉलबैक)",
    bn: "ডেমো স্ন্যাপশট মোড (অফলাইন ফলব্যাক)",
  },

  // Tabs
  tabOperations: { en: "Operations", hi: "संचालन", bn: "অপারেশনস" },
  tabForecast: { en: "Forecast", hi: "पूर्वानुमान", bn: "পূর্বাভাস" },
  tabAlerts: { en: "Alerts", hi: "चेतावनी", bn: "সতর্কতা" },
  tabEvidence: { en: "Evidence & Models", hi: "प्रमाण व मॉडल", bn: "প্রমাণ ও মডেল" },
  tabModel: { en: "Model", hi: "मॉडल", bn: "মডেল" },
  tabPastEvents: { en: "Past Events", hi: "विगत घटनाएँ", bn: "বিগত ঘটনা" },
  tabReplay: { en: "Replay", hi: "रीप्ले", bn: "রিপ্লে" },
  tabReplaySub: { en: "a real event", hi: "विगत घटना", bn: "বাস্তব ঘটনা" },
  tabMethodology: { en: "About", hi: "परिचय", bn: "পরিচিতি" },
  tabAbout: { en: "About", hi: "परिचय", bn: "পরিচিতি" },
  tabCommand: { en: "Command", hi: "कमांड", bn: "কমান্ড" },
  tabHealth: { en: "Health & Quality", hi: "स्वास्थ्य व गुणवत्ता", bn: "স্বাস্থ্য ও গুণমান" },
  tabApiWidget: { en: "API & Widget", hi: "एपीआई व विजेट", bn: "এপিআই ও উইজেট" },
  lowBandwidth: { en: "Low BW", hi: "न्यून बैंडविड्थ", bn: "কম ব্যান্ডউইথ" },
  farmerMode: { en: "Farmer Mode", hi: "किसान मोड", bn: "কৃষক মোড" },
  farmerModeActive: { en: "Farmer Mode Active", hi: "किसान मोड सक्रिय", bn: "কৃষক মোড সক্রিয়" },

  // Topbar Status
  statusIssued: { en: "ISSUED", hi: "जारी", bn: "প্রকাশিত" },
  statusValid: { en: "VALID", hi: "मान्य", bn: "বৈধ" },
  statusDay: { en: "DAY", hi: "दिवस", bn: "দিন" },
  statusAlert: { en: "ALERT", hi: "चेतावनी", bn: "সতর্কতা" },

  // Weather Variables
  varRainfall: { en: "Rainfall", hi: "वर्षा", bn: "বৃষ্টিপাত" },
  varTemperature: { en: "Temperature", hi: "तापमान", bn: "তাপমাত্রা" },
  varTempMax: { en: "Max Temp", hi: "अधिकतम तापमान", bn: "সর্বোচ্চ তাপমাত্রা" },
  varTempMin: { en: "Min Temp", hi: "न्यूनतम तापमान", bn: "সর্বনিম্ন তাপমাত্রা" },
  varHumidity: { en: "Relative Humidity", hi: "आर्द्रता (RH)", bn: "আপেক্ষিক আর্দ্রতা" },
  varWind: { en: "Wind Speed", hi: "हवा की गति", bn: "বায়ুর গতি" },
  varET0: { en: "Evapotranspiration (ET₀)", hi: "वाष्पोत्सर्जन (ET₀)", bn: "বাষ্পীভবন (ET₀)" },

  // Granularity / Resolution Toggle
  granularityPanchayat: { en: "Downscaled Panchayat (1km)", hi: "डाउनस्केल्ड ग्राम पंचायत (1 किमी)", bn: "ডাউনস্কেল্ড পঞ্চায়েত (১ কিমি)" },
  granularityBlock: { en: "Coarse NWP (25km)", hi: "मोटा मॉडल (25 किमी)", bn: "সাধারণ মডেল (২৫ কিমি)" },

  // Risk Status & Badges
  statusCalm: { en: "Calm", hi: "शांत", bn: "শান্ত" },
  statusFavorable: { en: "Favorable", hi: "अनुकूल", bn: "অনুকূল" },
  statusAdvisory: { en: "Advisory", hi: "सलाह", bn: "পরামর্শ" },
  statusWatch: { en: "Watch", hi: "निगरानी", bn: "নজরদারি" },
  statusWarning: { en: "Warning", hi: "चेतावनी", bn: "সতর্কতা" },
  statusOffgrid: { en: "Off-Grid", hi: "ऑफ-ग्रिड", bn: "অফ-গ্রিড" },
  statusNotMeasured: { en: "NOT YET MEASURED", hi: "अभी मापा नहीं गया", bn: "এখনও পরিমাপ করা হয়নি" },
  statusNotRecorded: { en: "NOT RECORDED IN TEST ARCHIVE", hi: "परीक्षण पुरालेख में दर्ज नहीं", bn: "টেস্ট আর্কাইভে রেকর্ড নেই" },

  // Hero Section
  heroKicker: { en: "ALL INDIA · 603 GRAM PANCHAYATS PILOT · DAY", hi: "संपूर्ण भारत · 603 ग्राम पंचायत पायलट · दिवस", bn: "সমগ্র ভারত · ৬০৩ গ্রাম পঞ্চায়েত পাইলট · দিন" },
  heroHeadline1: { en: "Panchayat-level weather risks,", hi: "ग्राम पंचायत स्तर पर मौसम जोखिम,", bn: "পঞ্চায়েত স্তরে আবহাওয়া ঝুঁকি," },
  heroHeadline2: { en: "before they hit your crops.", hi: "आपकी फसलों को नुकसान पहुँचाने से पहले।", bn: "আপনার ফসলের ক্ষতি করার আগেই।" },
  heroSubtitle: {
    en: "ECMWF ERA5 & IFS downscaled to 1km downscaled 1km resolution. 14 Gram Panchayats in severe ALERT status today.",
    hi: "ईसीएमडब्ल्यूएफ ईआरए5 और आईएफएस 1 किमी कैडस्ट्रल रिज़ॉल्यूशन तक डाउनस्केल। आज 14 ग्राम पंचायतें गंभीर चेतावनी स्थिति में हैं।",
    bn: "ইসিএমডব্লিউএফ ইআরএ৫ এবং আইএফএস ১ কিমি রেজোলিউশনে ডাউনস্কেল করা। আজ ১৪টি গ্রাম পঞ্চায়েত গুরুতর সতর্কতায় রয়েছে।",
  },
  heroNote: {
    en: "Authoritative forecast unit: Gram Panchayat (LGD polygon). District and State metrics are derived aggregate averages across scored panchayats.",
    hi: "आधिकारिक पूर्वानुमान इकाई: ग्राम पंचायत (एलजीडी कैडस्ट्रल बहुभुज)। जिला और राज्य मीट्रिक मूल्यांकित पंचायतों के औसत मान हैं।",
    bn: "প্রামাণ্য পূর্বাভাস একক: গ্রাম পঞ্চায়েত (এলজিডি পলিগন)। জেলা এবং রাজ্য মেট্রিকগুলি পঞ্চায়েত গড়ের সমষ্টি।",
  },
  heroRiskRatioTitle: { en: "NATIONAL PILOT RISK RATIO", hi: "राष्ट्रीय पायलट जोखिम अनुपात", bn: "জাতীয় পাইলট ঝুঁকি অনুপাত" },
  heroRiskRatioDesc: {
    en: "of pilot Gram Panchayats exceed agromet threat threshold.",
    hi: "पायलट ग्राम पंचायतें कृषि-मौसम संकट सीमा से अधिक हैं।",
    bn: "পাইলট গ্রাম পঞ্চায়েত কৃষি-আবহাওয়া ঝুঁকি সীমা অতিক্রম করেছে।",
  },
  heroVsYesterday: { en: "vs yesterday", hi: "कल की तुलना में", bn: "গতকালের তুলনায়" },
  heroActiveAlerts: { en: "ACTIVE ALERTS (DAY 1)", hi: "सक्रिय चेतावनियाँ (दिवस 1)", bn: "সক্রিয় সতর্কতা (দিন ১)" },
  heroImdThreshold: { en: "IMD severe threshold exceeded", hi: "आईएमडी गंभीर सीमा पार", bn: "আইএমডি তীব্র সীমা অতিক্রম" },
  heroPilotGps: { en: "PILOT GRAM PANCHAYATS", hi: "पायलट ग्राम पंचायतें", bn: "পাইলট গ্রাম পঞ্চায়েত" },
  heroCadastralGrid: { en: "1km grid across 55 MP districts", hi: "मध्य प्रदेश के 55 जिलों में ग्रिड", bn: "মধ্যপ্রদেশের ৫৫টি জেলায় গ্রিড" },
  heroModelAgreement: { en: "MODEL AGREEMENT", hi: "मॉडल सहमति", bn: "মডেল ঐক্যমত্য" },
  heroMultiPhysics: { en: "Multi-physics ensemble consensus", hi: "मल्टी-फिजिक्स एन्सेम्बल सहमति", bn: "মাল্টি-ফিজিক্স ঐক্যমত্য" },
  heroHighestRiskGp: { en: "HIGHEST RISK PANCHAYAT", hi: "उच्चतम जोखिम पंचायत", bn: "সর্বোচ্চ ঝুঁকিপূর্ণ পঞ্চায়েত" },
  heroExploreMap: { en: "Explore Operations Map", hi: "परिचालन मानचित्र देखें", bn: "অপারেশন ম্যাপ দেখুন" },
  heroThePanchayatMap: { en: "The Panchayat Map", hi: "ग्राम पंचायत मानचित्र", bn: "পঞ্চায়েত মানচিত্র" },
  heroRiskTrajectory: { en: "Risk by forecast day", hi: "पूर्वानुमान दिवस अनुसार जोखिम", bn: "পূর্বাভাস দিন অনুযায়ী ঝুঁকি" },
  heroWereWeRight: { en: "Were we right?", hi: "क्या हम सही थे? (सत्यापन)", bn: "আমরা কি সঠিক ছিলাম?" },
  heroDay3Watch: { en: "Day 3 Crossover Watch", hi: "दिवस 3 क्रॉसओवर निगरानी", bn: "৩য় দিন ক্রসওভার নজরদারি" },
  chartForecastRisk: { en: "Forecast Risk", hi: "पूर्वानुमान जोखिम", bn: "পূর্বাভাস ঝুঁকি" },
  chartUncertaintyBand: { en: "80% Uncertainty Band", hi: "80% अनिश्चितता सीमा", bn: "৮০% অনিশ্চয়তা ব্যান্ড" },
  chartCriticalThreshold: { en: "Critical Threshold (55%)", hi: "गंभीर सीमा (55%)", bn: "সংকটজনক সীমা (৫৫%)" },
  liveMonitor: { en: "LIVE MONITOR", hi: "सक्रिय निगरानी", bn: "লাইভ নজরদারি" },

  // Operational Freshness Strip
  feedOperational: {
    en: "Operational Model Run: ECMWF IFS Cycle 00z downscaled to 1km Downscaled Grid",
    hi: "परिचालन मॉडल रन: ECMWF IFS चक्र 00z 1 किमी कैडस्ट्रल ग्रिड पर डाउनस्केल",
    bn: "অপারেশনাল মডেল রান: ECMWF IFS সাইকেল ০০z ১ কিমি গ্রিডে ডাউনস্কেল করা",
  },
  feedValidity: {
    en: "VALIDITY: DAY {day} · 603 PILOT PANCHAYATS SCORED · 0% MISSING VALUES",
    hi: "वैधता: दिवस {day} · 603 पायलट ग्राम पंचायतें मूल्यांकित · 0% अनुपलब्ध मान",
    bn: "মেয়াদ: দিন {day} · ৬০৩ পাইলট পঞ্চায়েত মূল্যায়িত · ০% অনুপস্থিত মান",
  },

  // Map Modes & Toolbar
  mapModeRisk: { en: "Risk Score", hi: "जोखिम स्कोर", bn: "ঝুঁকি স্কোর" },
  mapModeVariable: { en: "Dominant Variable", hi: "मुख्य मौसम कारक", bn: "প্রধান উপাদান" },
  mapModeAgreement: { en: "Model Agreement", hi: "मॉडल सहमति", bn: "মডেল ঐক্যমত্য" },
  mapModeCrop: { en: "🌱 Crop Advisory Layers", hi: "🌱 फसल परामर्श परतें", bn: "🌱 ফসল পরামর্শ স্তর" },

  cropMetricIrrigation: { en: "IRRIGATION DUE", hi: "सिंचाई आवश्यकता", bn: "সেচের সময়" },
  cropMetricSowing: { en: "SOWING WINDOW", hi: "बुवाई खिड़की", bn: "বপনের সময়" },
  cropMetricSpray: { en: "SPRAY SAFETY", hi: "छिड़काव सुरक्षा", bn: "স্প্রে নিরাপত্তা" },

  cropDurumWheat: { en: "Wheat (Durum)", hi: "गेहूं (मालवी/कठिया)", bn: "গম (ডুরম)" },
  cropBreadWheat: { en: "Wheat (Bread)", hi: "गेहूं (शरबती)", bn: "গম (রুটি)" },
  cropChickpea: { en: "Chickpea (Gram)", hi: "चना (ग्राम)", bn: "ছোলা" },
  cropMustard: { en: "Mustard", hi: "सरसों / राई", bn: "সরিষা" },
  cropSoybean: { en: "Soybean", hi: "सोयाबीन", bn: "সয়াবিন" },
  cropMaize: { en: "Maize", hi: "मक्का", bn: "ভুট্টা" },
  cropCotton: { en: "Cotton", hi: "कपास", bn: "তুলা" },

  // Omnibox Search
  searchPlaceholder: {
    en: "Search State, District, Block, or Panchayat (e.g. Sanwer, 133203)...",
    hi: "राज्य, जिला, ब्लॉक या पंचायत खोजें (उदा. सांवेर, 133203)...",
    bn: "রাজ্য, জেলা, ব্লক বা পঞ্চায়েত খুঁজুন (উদাঃ সানভের, ১৩৩২০৩)...",
  },
  useMyLocation: { en: "Use My Location", hi: "मेरा स्थान उपयोग करें", bn: "আমার অবস্থান ব্যবহার করুন" },

  // Map Status Bar
  pilotEvaluationTier: { en: "PILOT EVALUATION TIER", hi: "पायलट मूल्यांकन स्तर", bn: "পাইলট মূল্যায়ন স্তর" },
  gpsScoredLabel: { en: "GPS SCORED", hi: "पंचायतें मूल्यांकित", bn: "পঞ্চায়েত মূল্যায়িত" },
  synopticSummaryLabel: { en: "SYNOPTIC SUMMARY:", hi: "मौसम सारांश:", bn: "আবহাওয়া সারসংক্ষেপ:" },
  synopticSummaryFavorable: {
    en: "Day {day} conditions in Madhya Pradesh remain favorable across all 603 scored panchayats: standard seasonal field operations recommended.",
    hi: "मध्य प्रदेश में दिवस {day} की स्थिति सभी 603 मूल्यांकित पंचायतों में अनुकूल है: मौसमी कृषि कार्य जारी रखने की सलाह।",
    bn: "মধ্যপ্রদেশে দিন {day}-এর পরিস্থিতি ৬০৩টি মূল্যায়িত পঞ্চায়েতে অনুকূল রয়েছে: সাধারণ কৃষিকাজ চালুর পরামর্শ।",
  },
  synopticSummaryAlert: {
    en: "Day {day} has elevated alert share: intense convective precipitation micro-cells detected across western/central districts.",
    hi: "दिवस {day} पर चेतावनी का स्तर अधिक है: पश्चिमी और मध्य जिलों में भारी वर्षा व जलभराव की संभावना।",
    bn: "দিন {day}-এ সতর্কতা স্তর বৃদ্ধি পেয়েছে: পশ্চিম ও মধ্য জেলাগুলিতে ভারী বৃষ্টিপাতের সম্ভাবনা।",
  },
  blockOutlineNotice: {
    en: "Block outlines not available (603-panchayat pilot sample)",
    hi: "ब्लॉक रूपरेखा उपलब्ध नहीं (603-पंचायत पायलट नमूना)",
    bn: "ব্লক রূপরেখা অনুপলব্ধ (৬০৩ পঞ্চায়েত পাইলট নমুনা)",
  },

  // Map Legend
  legendRiskTitle: { en: "Panchayat Risk Severity:", hi: "पंचायत जोखिम तीव्रता:", bn: "পঞ্চায়েত ঝুঁকি তীব্রতা:" },
  legendCalm: { en: "Calm (<25)", hi: "शांत (<25)", bn: "শান্ত (<২৫)" },
  legendWatch: { en: "Watch (25–54)", hi: "निगरानी (25–54)", bn: "নজরদারি (২৫–৫৪)" },
  legendAlert: { en: "Alert (≥55)", hi: "चेतावनी (≥55)", bn: "সতর্কতা (≥৫৫)" },
  legendNoData: { en: "Outside ML coverage (not modelled)", hi: "पायलट से बाहर (मॉडल नहीं)", bn: "পাইলটের বাইরে (মডেল নেই)" },
  legendOutsideCoverage: { en: "Outside ML coverage (not modelled)", hi: "पायलट से बाहर (मॉडल नहीं)", bn: "পাইলটের বাইরে (মডেল নেই)" },
  legendAdviceSame: { en: "Advice Same as Block", hi: "ब्लॉक के समान सलाह", bn: "ব্লকের অনুরূপ পরামর্শ" },
  legendAdviceDiffers: { en: "Advice Differs from Block", hi: "ब्लॉक से भिन्न सलाह", bn: "ব্লক থেকে ভিন্ন পরামর্শ" },
  legendAdviceRobustDiffers: { en: "Robust Divergence (≥10% prob)", hi: "मजबूत विचलन (≥10% संभावना)", bn: "স্পষ্ট পার্থক্য (≥১০% সম্ভাবনা)" },
  legendVerifiableWell: { en: "Well Verifiable (≤30km)", hi: "उत्कृष्ट सत्यापन (≤30 किमी)", bn: "উত্তম যাচাইযোগ্য (≤৩০ কিমি)" },
  legendVerifiablePartial: { en: "Partial (30–80km)", hi: "आंशिक सत्यापन (30–80 किमी)", bn: "আংশিক যাচাই (৩০–৮০ কিমি)" },
  legendVerifiablePoor: { en: "Poorly Verifiable (>80km)", hi: "सीमित सत्यापन (>80 किमी)", bn: "সীमित যাচাই (>৮০ কিমি)" },

  // 10-Day Lead Rail
  railTitle: { en: "10-DAY LEAD HORIZON", hi: "10-दिवसीय पूर्वानुमान क्षितिज", bn: "১০ দিনের পূর্বাভাস দিগন্ত" },
  railScoredSub: { en: "Scored across 603 Panchayats", hi: "603 पंचायतों का मूल्यांकन", bn: "৬০৩ পঞ্চায়েতে মূল্যায়িত" },
  railNote: {
    en: "Day 4 shows the highest alert concentration (46% mean risk) driven by active convective rainbands over Central MP.",
    hi: "दिवस 4 पर मध्य प्रदेश में सक्रिय मानसूनी बादलों के कारण सर्वाधिक चेतावनी (46% औसत जोखिम) है।",
    bn: "৪র্থ দিনে মধ্যপ্রদেশের উপর সক্রিয় মেঘমালার কারণে সর্বাধিক সতর্কতা (৪৬% গড় ঝুঁকি) দেখা যাচ্ছে।",
  },

  // Inspector Panel Labels
  selectedPanchayat: { en: "Selected Panchayat", hi: "चयनित ग्राम पंचायत", bn: "নির্বাচিত গ্রাম পঞ্চায়েত" },
  elevation: { en: "Elevation", hi: "ऊंचाई", bn: "উচ্চতা" },
  slope: { en: "Slope", hi: "ढलान", bn: "ঢাল" },
  landcover: { en: "Land Cover", hi: "भूमि आवरण", bn: "ভূমি আচ্ছাদন" },
  confidenceBand: { en: "80% Confidence Interval", hi: "80% विश्वास अंतराल", bn: "৮০% অনিশ্চয়তা ব্যবধান" },
  agrometAdvisory: { en: "Agro-Meteorological Advisory", hi: "कृषि मौसम परामर्श", bn: "কৃষি আবহাওয়া পরামর্শ" },
  actionLabel: { en: "Action Required", hi: "आवश्यक कार्रवाई", bn: "প্রয়োজনীয় পদক্ষেপ" },
  whyLabel: { en: "Why / Meteorological Trigger", hi: "कारण / मौसम का आधार", bn: "কারণ / আবহাওয়ার ভিত্তি" },
  timingLabel: { en: "Operational Window", hi: "समय सीमा", bn: "সময়সীমা" },
  highestRiskPanchayats: { en: "HIGHEST RISK PANCHAYATS", hi: "उच्चतम जोखिम पंचायतें", bn: "সর্বোচ্চ ঝুঁকিপূর্ণ পঞ্চায়েত" },
  rankedTopEvaluated: { en: "Ranked top evaluated panchayats for Day {day}", hi: "दिवस {day} की शीर्ष संवेदनशील पंचायतें", bn: "দিন {day}-এর শীর্ষ ঝুঁকিপূর্ণ পঞ্চায়েত" },
  loadingRankedGps: { en: "Loading ranked high-risk panchayats...", hi: "उच्च जोखिम पंचायतों की सूची लोड हो रही है...", bn: "শীর্ষ ঝুঁকিপূর্ণ পঞ্চায়েতের তালিকা লোড হচ্ছে..." },
  copyLink: { en: "Copy Link", hi: "लिंक कॉपी करें", bn: "লিঙ্ক কপি করুন" },
  copied: { en: "✓ Copied", hi: "✓ कॉपी हो गया", bn: "✓ কপি হয়েছে" },
  cropAdvisoryBtn: { en: "🌱 Crop Advisory", hi: "🌱 फसल परामर्श", bn: "🌱 ফসল পরামর্শ" },
  peakRiskHorizon: { en: "PEAK RISK HORIZON", hi: "चरम जोखिम क्षितिज", bn: "সর্বোচ্চ ঝুঁকি দিগন্ত" },
  highestHazardOccurs: {
    en: "Highest hazard occurs on Day {day}. Triggered by intense convective precipitation.",
    hi: "सर्वाधिक जोखिम दिवस {day} पर है। इसका मुख्य कारण तीव्र संवहनी वर्षा है।",
    bn: "সর্বাধিক বিপদ দিন {day}-এ ঘটবে। তীব্র বৃষ্টিপাতের কারণে এটি উদ্ভূত।",
  },
  whatDrivesRisk: { en: "WHAT DRIVES THIS RISK", hi: "इस जोखिम के मुख्य कारक", bn: "এই ঝুঁকির প্রধান কারণসমূহ" },
  elevationVsMean: { en: "Elevation vs block mean", hi: "ब्लॉक औसत की तुलना में ऊंचाई", bn: "ব্লকের গড় উচ্চতার পার্থক্য" },
  slopeSolarExposure: { en: "Aspect & slope solar exposure", hi: "ढलान व सौर विकिरण प्रभाव", bn: "ঢাল ও সৌর বিকিরণ" },
  coarseBaseline: { en: "Coarse NWP baseline", hi: "व्यापक मौसम मॉडल आधार", bn: "সাধারণ আবহাওয়া মডেল ভিত্তি" },
  vegetationNdvi: { en: "Vegetation cover (NDVI)", hi: "वनस्पति आवरण (NDVI)", bn: "উদ্ভিদ আচ্ছাদন (NDVI)" },
  historicalClimate: { en: "Historical climatology", hi: "ऐतिहासिक जलवायु रिकॉर्ड", bn: "ঐতিহাসিক জলবায়ু তথ্য" },
  downscaledVsCoarse: { en: "DOWNSCALED VS COARSE", hi: "1 किमी बनाम 25 किमी पूर्वानुमान", bn: "১ কিমি বনাম ২৫ কিমি তুলনা" },
  panchayatEffect: { en: "Panchayat Effect", hi: "पंचायत प्रभाव (माइक्रो-क्लाइमेट)", bn: "পঞ্চায়েত প্রভাব" },
  listenAdvisory: { en: "Listen to Advisory", hi: "परामर्श सुनें (Audio)", bn: "পরামর্শ শুনুন (অডিও)" },
  stopAudio: { en: "Stop Audio", hi: "ऑडियो रोकें", bn: "অডিও থামান" },

  // Soil Moisture & Irrigation
  soilWaterBalance: { en: "Root-Zone Soil Water Balance", hi: "जड़-क्षेत्र मृदा जल संतुलन", bn: "মূল-অঞ্চল মাটির আর্দ্রতা" },
  irrigationSchedule: { en: "Prescriptive Irrigation", hi: "सिंचाई परामर्श", bn: "সেচ পরামর্শ" },
  soilProfileNotice: {
    en: "Assumed default soil profile (60 cm root zone: FC 140 mm, WP 65 mm, MAD 50%), not measured",
    hi: "अनुमानित डिफ़ॉल्ट मृदा प्रोफ़ाइल (60 सेमी जड़ क्षेत्र: FC 140 मिमी, WP 65 मिमी, MAD 50%), वास्तविक मापन नहीं",
    bn: "ডিফল্ট মাটির প্রোফাইল (৬০ সেমি মূল অঞ্চল), পরিমাপকৃত নয়",
  },

  // 10-Day Synchronized Forecast Card
  tendayCardTitle: { en: "10-DAY SYNCHRONIZED MULTI-VARIABLE FORECAST", hi: "10-दिवसीय समकालिक बहु-चर पूर्वानुमान", bn: "১০ দিনের সমন্বিত বহুমুখী পূর্বাভাস" },
  btnFocusedChart: { en: "Focused Chart", hi: "विस्तृत चार्ट", bn: "বিস্তারিত চার্ট" },
  btnSmallMultiples: { en: "Small Multiples", hi: "सभी चर (लघु चार्ट)", bn: "সব চলক চার্ট" },
  btnShowTable: { en: "Show Numbers Table", hi: "डेटा तालिका देखें", bn: "উপাত্ত সারণী দেখুন" },
  btnHideTable: { en: "Hide Numbers Table", hi: "तालिका छिपाएं", bn: "সারণী লুকান" },
  btnCsv: { en: "CSV", hi: "सीएसवी", bn: "সিএসভি" },
  layerDownscaled: { en: "Downscaled (1km)", hi: "डाउनस्केल्ड (1 किमी)", bn: "ডাউনস্কেল্ড (১ কিমি)" },
  layerCoarse: { en: "Coarse NWP (25km)", hi: "मोटा मॉडल (25 किमी)", bn: "সাধারণ মডেল (২৫ কিমি)" },
  layerUncertainty: { en: "80% Range", hi: "80% अनिश्चितता सीमा", bn: "৮০% অনিশ্চয়তা পরিসর" },
  layerDelta: { en: "Panchayat Delta", hi: "पंचायत विचलन", bn: "পঞ্চায়েত পার্থক্য" },
  verificationHonestyTitle: {
    en: "VERIFICATION HONESTY (MADHYA PRADESH PILOT)",
    hi: "सत्यापन पारदर्शिता (मध्य प्रदेश पायलट)",
    bn: "যাচাইকরণ স্বচ্ছতা (মধ্যপ্রদেশ পাইলট)",
  },
  cadastralMaeVsClim: {
    en: "1KM DOWNSCALED MAE VS COARSE CLIMATOLOGY",
    hi: "1 किमी कैडस्ट्रल त्रुटि बनाम जलवायु आधार",
    bn: "১ কিমি ক্যাডাস্ট্রাল ত্রুটি বনাম জলবায়ু",
  },

  // Farmer Advisory Modal & Mode Card
  farmerCardTitle: { en: "Farmer Agromet Card", hi: "किसान कृषि-मौसम कार्ड", bn: "কৃষক কৃষি-আবহাওয়া কার্ড" },
  farmerWhatToDo: { en: "1. What To Do (Action)", hi: "1. क्या करें (सलाह)", bn: "১. করণীয় (পরামর্শ)" },
  farmerWeatherReason: { en: "2. Weather Reason (Warning)", hi: "2. मौसम का कारण (चेतावनी)", bn: "২. আবহাওয়ার কারণ (সতর্কতা)" },
  farmerSafeWindow: { en: "3. Safe Window (Timing)", hi: "3. सुरक्षित समय (कब करें)", bn: "৩. উপযুক্ত সময় (কখন করবেন)" },
  farmerAudioListen: { en: "Listen to Advisory", hi: "परामर्श सुनें (Audio)", bn: "পরামর্শ শুনুন (অডিও)" },
  farmerAudioStop: { en: "Stop Audio", hi: "ऑडियो रोकें", bn: "অডিও থামান" },
  farmerShareWa: { en: "Share on WhatsApp", hi: "व्हाट्सएप पर भेजें", bn: "হোয়াটসঅ্যাপে পাঠান" },
  farmerViewFullDossier: { en: "View Full Scientific Dossier", hi: "पूर्ण वैज्ञानिक विवरण देखें", bn: "সম্পূর্ণ বৈজ্ঞানিক তথ্য দেখুন" },

  // Alerts & CAP Tab
  alertsTitle: { en: "OPERATIONAL WEATHER ALERTS & CAP FEED", hi: "परिचालन मौसम चेतावनियाँ एवं सीएपी फीड", bn: "আবহাওয়া সতর্কতা ও সিএপি ফিড" },
  alertsSubtitle: {
    en: "Common Alerting Protocol (CAP v1.2) XML feeds and active threat advisories for Gram Panchayats in Madhya Pradesh.",
    hi: "मध्य प्रदेश की ग्राम पंचायतों के लिए कॉमन अलर्टिंग प्रोटोकॉल (CAP v1.2) एक्सएमएल फीड और सक्रिय मौसम चेतावनियाँ।",
    bn: "মধ্যপ্রদেশের গ্রাম পঞ্চায়েতগুলির জন্য কমন অ্যালার্টিং প্রটোকল (CAP v1.2) সতর্কতা ও পরামর্শ।",
  },
  filterSeverityAll: { en: "All Severities", hi: "सभी चेतावनियाँ", bn: "সব ধরনের সতর্কতা" },
  filterAlertOnly: { en: "Alert Only", hi: "केवल गंभीर चेतावनी (Alert)", bn: "কেবল তীব্র সতর্কতা" },
  filterWatchOnly: { en: "Watch Only", hi: "केवल निगरानी (Watch)", bn: "কেবল নজরদারি" },
  searchAlertsPlaceholder: { en: "Filter by district or panchayat...", hi: "जिला या पंचायत से खोजें...", bn: "জেলা বা পঞ্চায়েত দিয়ে খুঁজুন..." },
  oneRowPerGp: { en: "One row per Panchayat", hi: "प्रति पंचायत एक पंक्ति", bn: "প্রতি পঞ্চায়েতে একটি সারি" },
  colSeverity: { en: "Severity", hi: "तीव्रता", bn: "তীব্রতা" },
  colPanchayat: { en: "Panchayat", hi: "ग्राम पंचायत", bn: "গ্রাম পঞ্চায়েত" },
  colDistrict: { en: "District", hi: "ज़िला", bn: "জেলা" },
  colHazard: { en: "Hazard / Trigger", hi: "खतरा / कारण", bn: "বিপদ / কারণ" },
  colEffective: { en: "Effective Window", hi: "प्रभाव काल", bn: "কার্যকর সময়সীমা" },
  colCapXml: { en: "CAP XML", hi: "सीएपी एक्सएमएल", bn: "সিএপি এক্সএমএল" },

  // Evidence & Model Tab
  evidenceTitle: { en: "VERIFICATION EVIDENCE & MODEL AUDIT", hi: "सत्यापन साक्ष्य एवं मॉडल ऑडिट", bn: "যাচাইকরণ প্রমাণ ও মডেল নিরীক্ষা" },
  evidenceSubtitle: {
    en: "Honest statistical validation of downscaled weather predictions against coarse NWP and synthetic lapse-rate baselines.",
    hi: "व्यापक मौसम मॉडल एवं स्थानीय वेधशालाओं के विरुद्ध डाउनस्केल्ड भविष्यवाणियों का सांख्यिकीय सत्यापन।",
    bn: "সাধারণ আবহাওয়া মডেলের বিপরীতে ডাউনস্কেল্ড পূর্বাভাসের পরিসংখ্যানগত যাচাইকরণ।",
  },
  baselineComparison: { en: "Downscaling Baseline Ladder Comparison", hi: "डाउनस्केलिंग बेसलाइन तुलना सीढ़ी", bn: "ডাউনস্কেলিং বেসলাইন তুলনা" },
  independentValidationNotice: {
    en: "Not independent validation (target derived from the same lapse-rate formula)",
    hi: "स्वतंत्र वेधशाला सत्यापन नहीं (समान लैप्स-दर सूत्र से उत्पन्न लक्ष्य)",
    bn: "স্বতন্ত্র নিরীক্ষণ নয় (একই ল্যাপস-রেট সূত্র থেকে প্রাপ্ত)",
  },
  stationValidationHeader: {
    en: "Regional Station Consistency Check (Synthetic Lapse-Rate Targets)",
    hi: "क्षेत्रीय केंद्र निरंतरता परीक्षण (सिंथेटिक लैप्स-दर लक्ष्य)",
    bn: "আঞ্চলিক কেন্দ্র ধারাবাহিকতা যাচাই",
  },
  noRainGaugesNotice: {
    en: "Pipeline consistency check on synthetic targets. Real independent in-situ station validation is not yet instrumented.",
    hi: "सिंथेटिक लक्ष्यों पर पाइपलाइन निरंतरता परीक्षण। वास्तविक स्वतंत्र वेधशाला सत्यापन अभी स्थापित नहीं है।",
    bn: "সিন্থেটিক লক্ষ্যমাত্রার উপর পাইপলাইন ধারাবাহিকতা পরীক্ষা।",
  },

  // Past Events & Replay
  replayTitle: { en: "HINDCAST / HISTORICAL EVENT REPLAY", hi: "पूर्व घटना रीप्ले एवं हाइंडकास्ट इंजन", bn: "ঐতিহাসিক ঘটনা রিপ্লে ইঞ্জিন" },
  replaySubtitle: {
    en: "Replay real historical extreme weather events step-by-step to test downscaling calibration and decision fidelity.",
    hi: "डाउनस्केलिंग सटीकता का परीक्षण करने के लिए वास्तविक ऐतिहासिक मौसम घटनाओं का दिवस-वार रीप्ले।",
    bn: "ডাউনস্কেলিং নির্ভুলতা পরীক্ষা করতে বাস্তব ঐতিহাসিক আবহাওয়া ঘটনার দিন-ভিত্তিক রিপ্লে।",
  },
  replayPlay: { en: "Play", hi: "चलाएं", bn: "প্লে করুন" },
  replayPause: { en: "Pause", hi: "रोकें", bn: "থামান" },
  replayPrev: { en: "‹ Prev", hi: "‹ पिछला", bn: "‹ পূর্ববর্তী" },
  replayNext: { en: "Next ›", hi: "अगला ›", bn: "পরবর্তী ›" },
  replayDayN: { en: "Day {day}", hi: "दिवस {day}", bn: "দিন {day}" },
  replayCloseEnoughTitle: { en: "DUAL CLOSE-ENOUGH VERIFICATION", hi: "दोहरा निकटता सत्यापन", bn: "দ্বৈত নির্ভুলতা যাচাইকরণ" },
  replayHonestFootnote: {
    en: "Band edges are set from how this model's own predictions were spread on validation data, not chosen by hand. IMD operational thresholds (config/imd_thresholds.yaml) + multi-driver risk score formula (docs/RISK_SCORE.md).",
    hi: "बैंड सीमाएं हाथ से तय करने के बजाय इस मॉडल की अपनी भविष्यवाणियों के सत्यापन डेटा पर आधारित हैं। आईएमडी परिचालन सीमाएं (config/imd_thresholds.yaml) + बहु-कारक जोखिम सूत्र (docs/RISK_SCORE.md)।",
    bn: "ব্যান্ডের প্রান্তগুলি হাত দিয়ে বেছে নেওয়ার পরিবর্তে মডেলের পূর্বাভাসের বিস্তার থেকে নির্ধারণ করা হয়েছে। আইএমডি থ্রেশহোল্ড ও ঝুঁকি স্কোর সূত্র।",
  },

  // Methodology / About Tab
  aboutTitle: { en: "ABOUT PRAGYAN WEATHER INTELLIGENCE", hi: "प्रज्ञान मौसम प्रज्ञान प्रणाली के बारे में", bn: "প্রজ্ঞান আবহাওয়া ব্যবস্থা সম্পর্কে" },
  aboutSubtitle: {
    en: "How Pragyan bridges the last-mile gap between coarse numerical weather prediction and actionable panchayat farming advice.",
    hi: "प्रज्ञान कैसे व्यापक मौसम मॉडलों और जमीनी स्तर पर किसान परामर्श के बीच के अंतर को पाटता है।",
    bn: "প্রজ্ঞান কীভাবে সাধারণ আবহাওয়া মডেল ও কৃষকের মাঠপর্যায়ের পরামর্শের মধ্যকার ব্যবধান দূর করে।",
  },

  // Common UI
  refresh: { en: "Refresh", hi: "ताज़ा करें", bn: "রিফ্রেশ" },
  close: { en: "Close", hi: "बंद करें", bn: "বন্ধ করুন" },
  sourceLabel: { en: "Data Source", hi: "डेटा स्रोत", bn: "উপাত্ত উৎস" },
  asOf: { en: "As of", hi: "समय", bn: "সময়" },
  constituentBlocksIn: { en: "CONSTITUENT BLOCKS IN {name}", hi: "{name} के अंतर्गत आने वाले ब्लॉक", bn: "{name}-এর অন্তর্গত ব্লকসমূহ" },
  viewGps: { en: "View GPs →", hi: "पंचायतें देखें →", bn: "পঞ্চায়েত দেখুন →" },
} as const;

export type TranslationKey = keyof typeof DICTIONARY;

/**
 * Returns translated string for given key in requested language.
 * Falls back to Hindi if Bengali key is missing, or English as universal default.
 */
export function t(key: TranslationKey, lang: Language, params?: Record<string, string | number>): string {
  const item = DICTIONARY[key];
  if (!item) return String(key);
  let str = (item as any)[lang] || item.en || String(key);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return str;
}
