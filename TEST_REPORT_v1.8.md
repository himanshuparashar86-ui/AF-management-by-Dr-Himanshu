# AF Management v1.8 — Build and workflow checks

## Automated checks completed
- JavaScript syntax validation (`node --check`).
- HTML parsed; no duplicate element IDs found.
- Manifest JSON parsed successfully; service-worker cache version is `heartline-af-v18`.
- Doctor can create more than one staff profile and generate a profile invitation TXT.
- Staff profile invitation imports on a clean browser context and populates the staff profile selector.
- Staff record access is filtered by profile ID when available; staff backup contains only records visible to that staff profile.
- A staff TXT backup restores the staff profile and patient records on a clean browser context.
- Weekly staff backup gate blocks normal use after seven days and unlocks after the staff TXT backup is generated.
- Weekly doctor backup gate blocks normal use after seven days and unlocks after the full JSON backup is generated.
- Doctor full JSON backup includes the staff directory and all records held locally on that device.
- Stable AF does not show the AF-attributable instability question; qualifying clinical instability makes it available.
- Rate control, rhythm control, anticoagulant and investigation catalogues remain present, including injectable UFH/enoxaparin and the requested investigations.
- Doctor edit/delete controls, treatment builder, and TXT transfer parser remain present.
- UTF-8 TXT transfer / legacy patient JSON parsing passed.
- Browser simulation completed without JavaScript page errors.

## Not completed / requires real-device testing
- Actual WhatsApp delivery and receipt were not tested.
- Real Android/iOS PWA installation, OS-level file handling, and offline launch must be tested on the intended phones.
- The browser can confirm that a backup download was triggered, but cannot confirm the file was safely stored outside the PWA.
- Clinical thresholds, emergency checklists, and all medication protocols still require local clinical governance review.

## Important architecture and safety limitations
This remains an offline-first, device-local prototype. It has no cloud database and no automatic synchronization. Staff profiles and patient records move between devices only through manually shared files. Staff profile selection is not secure authentication; a user can select a role/profile on a device. Files contain identifiable health information and are not encrypted in this prototype. Use dummy data for testing until authentication, encryption, access control, audit, retention, backup security and clinical validation are addressed.
