# Clinical decisions pending — Dr. Himanshu / Pharmacy

**This document is a decision list, not a software change request.** These items were raised in the independent review. They have not been implemented or altered in v1.9. Do not change clinical wording, doses, dosing formulas, thresholds, score policy or medication references until Dr. Himanshu gives explicit approval.

1. **Dose-reference policy:** The current `doseReference` information includes wording derived from a US FDA label. Decide whether to remove it or retain it with a clear label and verify it against Indian product information. No dose reference was changed in v1.9.
2. **Dabigatran 75 mg BD / CrCl 15–30 mL/min:** Review the US-specific rule against the applicable Indian label. Also decide whether age ≥80 years and verapamil-related criteria should be represented. No dabigatran dose formula or logic was changed.
3. **HCM and cardiac amyloidosis:** Decide whether these history questions should be added and how they should affect the clinical assessment. No questions or score formulas were changed.
4. **CHA₂DS₂-VASc display:** Decide whether to keep it beside CHA₂DS₂-VA or move/hide it under an ESC-only reference. The existing display/calculation remains unchanged.
5. **Rheumatic AF / mitral stenosis:** Decide whether the current “moderate–severe rheumatic MS” wording adequately captures the intended history. No clinical wording was altered.
6. **Doctor approval when AF attribution is not assessed:** Decide whether a confirmation is required before approving during a red alert when AF attribution remains “Not yet assessed.” No new confirmation or clinical decision rule was added.
7. **LVEF threshold/wording:** Review the current ≤40% flag language against the ESC 2024 source and approve any exact wording or threshold change separately. It remains unchanged.

## Approval record

For each item, record Dr. Himanshu's decision and date before opening a separate clinical-change request. A later approved change should be documented in a dedicated clinical changelog and independently verified; it must not be bundled silently into a technical release.
