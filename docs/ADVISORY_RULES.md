# Pragyan Advisory Rule Schema Specification

**Document ID:** `docs/ADVISORY_RULES.md`  
**System:** Pragyan Agro-Meteorological Rule Registry v3  
**Compliance:** SIH26074 Guardrails 1 to 7

---

## 1. Rule Record Schema (YAML)

Every rule in `config/advisory_rules/*.yaml` must conform to the following schema:

```yaml
- id: str                   # Unique stable identifier (e.g. wheat.irrigation.cri)
  crops: [str]              # List of applicable canonical crops (e.g. [wheat])
  stages: [str]             # List of applicable stage IDs (or ['all'])
  trigger: str              # Python-evaluable expression over variables
  action: str               # Direct actionable instruction (English)
  why: str                  # Agronomic justification and impact explanation
  when: str                 # Specific operational timing window
  severity: str             # calm | watch | alert
  verifiable_event: str     # Machine-verifiable physical event for advisory scoring
  source: str               # Mandated citation (PoP, publication, institution, page)
  status: str               # ACTIVE | NEEDS_EXPERT_REVIEW | DISABLED
  reviewed_by: str          # Name/Title of expert agronomist or KVK panel
  translations:
    hi:
      action: str           # Hindi translated action
      why: str              # Hindi translated why
      when: str             # Hindi translated when
    bn:
      action: str           # Bengali translated action
      why: str              # Bengali translated why
      when: str             # Bengali translated when
```

---

## 2. Guardrails & Validation Linter Rules

1. **Guardrail 1 (Mandatory Source):** If `source` is empty or generic without a publication title, rule must be set to `NEEDS_EXPERT_REVIEW` and will NOT be evaluated in production.
2. **Guardrail 2 (No Chemical Brands or Doses):** Prohibited words in `action` or `why`:
   `Mancozeb`, `Tricyclazole`, `Thiamethoxam`, `Chlorpyrifos`, `Glyphosate`, `g/L`, `ml/L`, `kg/ha`.
   Advisories must provide operational weather windows only and refer farmers to the nearest KVK or official ICAR IPM package.
3. **Guardrail 3 (Translations):** Both `hi` and `bn` translations must be present for status `ACTIVE`.
4. **Guardrail 4 (Serving Policy Downgrade):** If a panchayat has `LOW_CONFIDENCE` or is served via `BLOCK_VALUE`, advisory confidence is automatically downgraded to `"Uncertain"` with explicit disclosure.
