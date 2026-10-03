import { describe, it, expect } from "vitest";
import { t, DICTIONARY } from "./i18n";

describe("i18n dictionary and translation helper", () => {
  it("translates brand name correctly in English and Hindi", () => {
    expect(t("brandName", "en")).toBe("Pragyan");
    expect(t("brandName", "hi")).toBe("प्रज्ञान");
  });

  it("translates tabs correctly", () => {
    expect(t("tabForecast", "en")).toBe("Forecast");
    expect(t("tabForecast", "hi")).toBe("पूर्वानुमान");

    expect(t("tabPastEvents", "en")).toBe("Past Events");
    expect(t("tabPastEvents", "hi")).toBe("विगत घटनाएँ");
  });

  it("contains all required translation keys for both English and Hindi", () => {
    const keys = Object.keys(DICTIONARY) as (keyof typeof DICTIONARY)[];
    expect(keys.length).toBeGreaterThan(15);
    for (const k of keys) {
      expect(DICTIONARY[k].en).toBeDefined();
      expect(DICTIONARY[k].hi).toBeDefined();
      expect(DICTIONARY[k].en.length).toBeGreaterThan(0);
      expect(DICTIONARY[k].hi.length).toBeGreaterThan(0);
    }
  });
});
