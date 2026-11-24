# AF Management by Dr Himanshu — Heartline Healthcare LLP

Free mobile-first PWA prototype (v0.4). No paid API, subscription or external JavaScript dependency.

## Run locally
Serve this folder over localhost or HTTPS (service workers require a secure context). Example: `python -m http.server 8000`, then open `http://localhost:8000`.

## Included
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
