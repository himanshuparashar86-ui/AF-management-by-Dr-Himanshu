# Version 1.1 — Doctor profile and patient record access

- Doctor Mode now defaults to Dr. Himanshu Parashar and English; no doctor name or language prompt is shown.
- Staff Mode continues to collect the staff member's name and staff language preference.
- Patient detail content now renders in a dedicated panel separate from the patient-list buttons.
- Patient opening uses event delegation for more reliable taps/clicks.
- Doctor Mode clearly explains the WhatsApp JSON import workflow when no records are present on that device.
- Imported records open immediately after successful import.
- Service-worker cache bumped to v11.
- ESC 2024 remains the only guideline framework presented.

Limitations remain: local browser/device storage only, no automatic cross-device synchronisation, no secure authentication, and no encryption of exported JSON.
