import { describe, it, expect } from "vitest";
import { t, DICTIONARY, Language, TranslationKey } from "./i18n";

describe("i18n Localization Engine", () => {
  const languages: Language[] = ["en", "hi", "bn"];

  it("contains all critical keys across English, Hindi, and Bengali", () => {
    const keys = Object.keys(DICTIONARY) as TranslationKey[];
    
    // Check that we have comprehensive localization keys (>70)
    expect(keys.length).toBeGreaterThan(70);

    for (const key of keys) {
      const entry = DICTIONARY[key];
      expect(entry, `Entry for key "${key}" should exist`).toBeDefined();
      for (const lang of languages) {
        expect(entry[lang], `Missing translation key "${key}" for language "${lang}"`).toBeDefined();
        expect(typeof entry[lang]).toBe("string");
        expect(entry[lang].length).toBeGreaterThan(0);
      }
    }
  });

  it("correctly translates core navigation and status elements", () => {
    expect(t("brandName", "en")).toBe("Pragyan");
    expect(t("brandName", "hi")).toBe("प्रज्ञान");
    expect(t("brandName", "bn")).toBe("প্রজ্ঞান");

    expect(t("mapModeRisk", "en")).toBe("Risk Score");
    expect(t("mapModeRisk", "hi")).toBe("जोखिम स्कोर");
    expect(t("mapModeRisk", "bn")).toBe("ঝুঁকি স্কোর");

    expect(t("farmerMode", "en")).toBe("Farmer Mode");
    expect(t("farmerMode", "hi")).toBe("किसान मोड");
    expect(t("farmerMode", "bn")).toBe("কৃষক মোড");

    expect(t("statusDay", "en")).toBe("DAY");
    expect(t("statusDay", "hi")).toBe("दिवस");
    expect(t("statusDay", "bn")).toBe("দিন");
  });

  it("interpolates parameters accurately across languages", () => {
    const enSummary = t("synopticSummaryFavorable", "en", { day: 3 });
    expect(enSummary).toContain("Day 3");

    const hiSummary = t("synopticSummaryFavorable", "hi", { day: 3 });
    expect(hiSummary).toContain("दिवस 3");

    const bnSummary = t("synopticSummaryFavorable", "bn", { day: 3 });
    expect(bnSummary).toContain("দিন 3");

    const enBreadcrumb = t("constituentBlocksIn", "en", { name: "Anand" });
    expect(enBreadcrumb).toBe("CONSTITUENT BLOCKS IN Anand");

    const hiBreadcrumb = t("constituentBlocksIn", "hi", { name: "आनंद" });
    expect(hiBreadcrumb).toBe("आनंद के अंतर्गत आने वाले ब्लॉक");
  });

  it("falls back gracefully to key name when key is missing or invalid", () => {
    // @ts-expect-error testing fallback for non-existent key
    expect(t("non_existent_key", "hi")).toBe("non_existent_key");
  });
});
