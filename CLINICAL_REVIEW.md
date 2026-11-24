# Clinical approval checklist before patient-care use

- Validate score components and guideline-specific thresholds.
- Validate ESC 2024 and ACC/AHA 2023 cardioversion pathways, exceptions and post-cardioversion anticoagulation.
- Validate emergency synchronized cardioversion pathway for instability attributable to AF.
- Validate WPW/pre-excited AF alerts and medication contraindications.
- Validate LVEF-based restrictions for diltiazem/verapamil.
- Add and validate HAS-BLED only after formal review.
- Add Cockcroft–Gault CrCl and label-based anticoagulant dose checks only after pharmacy review.
- Verify every drug dilution, final volume, infusion rate, compatibility, stability, access and monitoring requirement.
- Test with synthetic cases only; never use real patient data in development.
- Approve staff identity, access, audit, privacy, consent, retention, backup and incident-response policies.

- [ ] Validate local vital-sign thresholds and escalation policy. The app's SBP/DBP/SpO₂ screen is a prompt only, not an AF-specific haemodynamic stability diagnosis or full NEWS2 calculation.
- [ ] Confirm staff training on alternative oxygen saturation target ranges and repeat/verify abnormal oximetry readings.

- [ ] Validate staff escalation thresholds and checklist against the hospital's approved nursing/resuscitation protocol.
- [ ] Ensure staff mode hides treatment plans and anticoagulation / drug decisions under all workflow paths (including printed summaries).
- [ ] Confirm oxygen target ranges are prescribed individually; assess hypercapnia risk and avoid routine oxygen in normoxaemia.
- [ ] Confirm urinary catheter indication and IV cannulation prompts match local nursing policy.
- [ ] Test role-based staff/doctor presentation with synthetic data only.

- [ ] Approve the automatic red/amber vital-sign screening thresholds (SBP ≤90, MAP <65, DBP ≤40, SpO₂ ≤91; amber SBP 91–100, DBP 41–59, SpO₂ 92–93) against local escalation policy.
- [ ] Validate MAP calculation and rounding, including example 80/40 → approximately 53 mmHg.
- [ ] Confirm no staff workflow asks the user to manually declare stable/unstable.
- [ ] Confirm low SpO₂ triggers respiratory assessment and appropriate oxygen protocol but does not alone mandate cardioversion.
