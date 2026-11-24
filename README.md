# AF Management by Dr Himanshu — Heartline Healthcare LLP

Free mobile-first PWA prototype (v0.6). No paid API, subscription or external JavaScript dependency.

## Run locally
Serve this folder over localhost or HTTPS (service workers require a secure context). Example: `python -m http.server 8000`, then open `http://localhost:8000`.

## Included
- Automatic vital-sign screening from SBP, DBP and SpO₂ with red-flag / caution / no-trigger states
- Bedside clinical instability checkboxes retained for perfusion, altered consciousness, ischemia and pulmonary oedema because these cannot be inferred from BP and SpO₂ alone

- Visible, read-only age-band and female-sex score components auto-filled from patient age and sex

- Staff/doctor workspace selection and patient intake
- AF duration, vitals, ECG and clinical history form; duration labels display in plain language
- CHA₂DS₂-VA and CHA₂DS₂-VASc calculations with age points derived automatically from entered age and the female-sex point derived automatically from the sex field
- Decision-support flags for instability, suspected pre-excitation, wide QRS, prolonged/unknown AF duration, reduced LVEF, bleeding and valvular disease
- JSON export/import for WhatsApp file handover
- Doctor approval, staff correction request and UI-level lock
- Browser print / Save as PDF
- PWA manifest and offline app-shell caching

## Critical limitations
This is a prototype, not a production clinical record system. There is **no live synchronization**: records remain in the current browser's local storage and are transferred by file. Role selection is not secure authentication. The approval lock is not tamper-proof. Export files and PDFs are not encrypted. Do not use real patient-identifiable information until your organisation approves privacy, security, consent, retention and device policies. GitHub is for source code only; never commit patient data.

Clinical algorithms are incomplete decision-support prompts, not prescriptions. Score thresholds, HAS-BLED, renal dose criteria, anticoagulant selection, drug calculators and local protocols require clinician/pharmacy validation. The duration text distinguishes ESC 2024 >24h and ACC/AHA 2023 48h frameworks; verify current guideline details before use.

For production use, add verified individual accounts, server-side role permissions, encrypted transport/storage, audit logs, backups, retention and security testing. Free hosting tiers may not be appropriate for identifiable health data.

## Automatic haemodynamic screen (v0.6)
The app no longer asks staff to select a generic stable/unstable status. It screens entered SBP, DBP and SpO₂:
- SBP ≤90 mmHg or SpO₂ ≤91%: urgent assessment flag.
- SBP 91–100 mmHg, DBP <60 mmHg or SpO₂ 92–93%: caution flag.
- All other entered values: no predefined vital-sign red flag detected, but this is not confirmation of haemodynamic stability.
- Missing any of the three values: screen incomplete.
These are conservative prompts to trigger bedside review, not validated AF-specific diagnostic criteria or a replacement for a complete early-warning score. The SpO₂ thresholds reflect NEWS2 Scale 1 observation bands; use an alternate target range only when selected by a qualified clinician. Clinical instability attributable to AF must be judged from the whole patient, including perfusion, mental status, ischemia and pulmonary oedema.

## Staff-only presentation (v0.6)
- Staff mode shows a plain-language priority, a cardioversion escalation/preparation message and a nursing preparation checklist.
- Staff mode hides CHA₂DS₂ anticoagulation interpretation, medication suggestions and the doctor's treatment-plan text. Staff can see whether doctor review is pending/completed.
- Oxygen guidance is conditional on hypoxaemia / respiratory distress and prescribed target; routine oxygen is not advised for patients already within target.
- Urinary catheterisation is not routine for AF; only if clinically indicated for accurate urine-output monitoring and directed under local protocol.
- The app never instructs staff to deliver a shock. It asks staff to call the clinician and prepare equipment; synchronized DC cardioversion is a clinician-led emergency pathway when instability is attributable to AF.

- Staff-mode exports redact the doctor's saved treatment-plan text; doctor mode exports may include it.
