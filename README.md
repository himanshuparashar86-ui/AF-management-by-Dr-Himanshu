# AF Management by Dr Himanshu — Heartline Healthcare LLP
Free mobile-first PWA prototype (v1.0).

## Included
- Staff and doctor workspaces; patient entry and WhatsApp JSON handover
- Human-readable internal record IDs
- Automated CHA₂DS₂-VA / CHA₂DS₂-VASc and vital-sign screen
- Doctor-only cardioversion decision pathway using selectable ESC 2024 or ACC/AHA 2023 cardioversion framework
- Cardioversion energy: use the specific defibrillator manufacturer's recommendation and hospital protocol; ESC 2024 does not specify one universal joule setting
- Long-term oral anticoagulation decision support based on selected guideline
- Cockcroft–Gault CrCl calculator from age, sex, weight and serum creatinine
- Optional doctor-selected anticoagulant dose reference for apixaban, rivaroxaban, edoxaban and dabigatran; warfarin remains INR-guided
- Doctor review save, treatment approval, correction request, PDF/print and JSON import/export
- Clinical references and jurisdiction notes in `CLINICAL_REFERENCES.md`

## Running
Serve the repository root over HTTPS (GitHub Pages) or localhost. Open the site and install it as a PWA if desired.

## Critical limitations
- This is a clinical decision-support prototype, not a validated medical device or production EHR.
- App role selection is not authentication. The current record storage is local browser storage and does not provide multi-device synchronization.
- JSON files and print/PDF outputs are not encrypted. Do not store or share identifiable patient data until the organisation approves suitable authentication, access controls, encryption, consent, retention, audit, backup and security policies.
- Doctor decision inputs are not a substitute for bedside assessment. Cardioversion recommendation requires the clinician to explicitly document whether instability is attributable to AF.
- Initial 200 J synchronized biphasic AF energy is shown as a 2025 AHA reference only; confirm the actual defibrillator waveform/device, local emergency protocol and operator competency.
- Anticoagulation score thresholds are presented as ESC 2024 or ACC/AHA 2023 pathways. Do not mix the CHA₂DS₂-VA and CHA₂DS₂-VASc thresholds.
- Cockcroft–Gault uses entered weight and serum creatinine in mg/dL. Body-composition extremes, unstable renal function, fluid overload, pregnancy, dialysis, liver disease and drug interactions require clinician/pharmacist review.
- Drug doses shown are reference doses based on US FDA labels only. They may differ from locally approved Indian product information. Verify the exact brand/generic Indian prescribing information, contraindications, interactions and renal/age/weight criteria before prescribing. The app does not select a drug or create a prescription.
- Dabigatran, apixaban, rivaroxaban and edoxaban labels differ by jurisdiction. The dose module is a prompt for review, not an automatic prescribing calculator.
- A bleeding-history flag blocks dose display pending clinical review; it does not automatically mean anticoagulation must be withheld.
- No antibiotics are recommended from CHA₂DS₂ scores. Infection needs a separate diagnosis.

## v1.0 doctor workflow
Doctor Mode now has a structured decision panel with:
- Explicit cardioversion pathway, including a separate clinician confirmation for AF-attributable instability.
- A synchronized biphasic initial energy reference for emergency AF cardioversion.
- One guideline only: 2024 ESC AF guideline pathway; no AHA/ACC alternative shown.
- Long-term oral anticoagulation recommendation separate from short-term/periprocedural parenteral anticoagulation.
- Cockcroft–Gault CrCl calculation and clinician-selected anticoagulant dose references.
- Human-readable internal record identifiers.


## Guideline policy in v1.0
The app uses the **2024 ESC Guidelines for the management of atrial fibrillation only**. The ACC/AHA pathway has been removed from the interface and decision logic. The 2024 ESC AF guideline is the latest comprehensive AF-specific guideline identified for this release (reviewed November 2026).

The ESC cardioversion pathway uses the >24-hour threshold: if AF duration is >24 h or unknown, elective cardioversion requires at least 3 weeks of therapeutic anticoagulation or TOE/TEE to exclude intracardiac thrombus. Most patients continue OAC for at least 4 weeks after cardioversion; the guideline permits omission only in patients with no thromboembolic risk factors and restoration of sinus rhythm within 24 h.

**Energy setting:** The 2024 ESC AF guideline does not specify one universal joule setting for synchronized cardioversion. The app therefore directs the clinician to the defibrillator manufacturer's recommended synchronized biphasic setting and the hospital's approved cardioversion protocol rather than importing an AHA energy recommendation into an ESC-only pathway.


## v1.0 staff workflow
- Staff-facing immediate next steps use simple Hindi/Hinglish and short action instructions.
- After doctor approval, doctor selects either DC cardioversion preparation or medical-management preparation.
- Staff sees only the relevant preparation checklist; staff does not see or choose the treatment decision or dose.
- Staff checklist completion is saved with staff identity and timestamp in the local record.
- If the patient deteriorates, staff must activate the hospital emergency response rather than wait for app/doctor messaging.

This remains a local-browser prototype. The language selector records the preferred staff language, while the currently authored staff checklist copy is simple Hindi/Hinglish. Full translations and production-grade access controls/synchronization require further implementation.
