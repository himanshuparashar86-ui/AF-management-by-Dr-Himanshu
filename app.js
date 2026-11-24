const $ = (id) => document.getElementById(id);
let records = JSON.parse(localStorage.getItem('hl_af_v1') || '[]');
let user = { role: '', name: '', language: 'hinglish' };

const ids = 'pName uhid age sex weight mobile hr sbp dbp spo2 symptoms duration reliability onset assessed ecg qrs wpw lvef creatinine htn diabetes hf stroke vascular bleeding valve notes'.split(' ');

function save() {
  localStorage.setItem('hl_af_v1', JSON.stringify(records));
  render();
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
}
function durationLabel(v) {
  return ({
    lt24: 'Less than 24 hours',
    '24to48': '24–48 hours',
    gt48: 'More than 48 hours',
    unknown: 'Unknown / uncertain'
  })[v] || 'Not entered';
}
function makeRecordId() {
  const d = new Date();
  const two = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${two(d.getMonth()+1)}${two(d.getDate())}`;
  const time = `${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HLAF-${date}-${time}-${suffix}`;
}
function formatRecordId(id) {
  const old = /^HLAF-(\d{13})$/.exec(String(id || ''));
  if (!old) return id;
  const d = new Date(Number(old[1]));
  if (Number.isNaN(d.getTime())) return id;
  const two = n => String(n).padStart(2, '0');
  return `HLAF-${d.getFullYear()}${two(d.getMonth()+1)}${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
}
function score(p) {
  const yes = k => p[k] === 'yes';
  const age = Number(p.age);
  const agePoints = Number.isFinite(age) && p.age !== '' ? (age >= 75 ? 2 : age >= 65 ? 1 : 0) : 0;
  const ageBand = p.age === '' ? 'Age not entered' : age >= 75 ? '75 years or older' : age >= 65 ? '65–74 years' : 'Under 65 years';
  const base = (yes('hf')?1:0) + (yes('htn')?1:0) + (yes('diabetes')?1:0) +
    (yes('stroke')?2:0) + (yes('vascular')?1:0) + agePoints;
  const female = p.sex === 'Female';
  return { va: base, vasc: base + (female ? 1 : 0), agePoints, ageBand, female };
}
function hemodynamicScreen(p) {
  const number = k => p[k] !== undefined && p[k] !== '' && Number.isFinite(Number(p[k])) ? Number(p[k]) : null;
  const sbp = number('sbp'), dbp = number('dbp'), spo2 = number('spo2');
  const map = sbp !== null && dbp !== null ? (sbp + 2*dbp)/3 : null;
  const flags = Array.isArray(p.instability) ? p.instability : [];
  const red = [], amber = [];
  const hypotensionRed = (sbp !== null && sbp <= 90) || (map !== null && map < 65) || (dbp !== null && dbp <= 40);
  const hypoxaemiaRed = spo2 !== null && spo2 <= 91;
  if (sbp !== null && sbp <= 90) red.push(`SBP ${sbp} mmHg (≤90)`);
  if (map !== null && map < 65) red.push(`Calculated MAP ${Math.round(map)} mmHg (<65)`);
  if (dbp !== null && dbp <= 40) red.push(`DBP ${dbp} mmHg (≤40)`);
  if (hypoxaemiaRed) red.push(`SpO₂ ${spo2}% (≤91%)`);
  if (flags.length) red.push(...flags);
  if (sbp !== null && sbp > 90 && sbp <= 100) amber.push(`SBP ${sbp} mmHg (91–100)`);
  if (dbp !== null && dbp < 60 && dbp > 40) amber.push(`DBP ${dbp} mmHg (41–59)`);
  if (spo2 !== null && spo2 > 91 && spo2 <= 93) amber.push(`SpO₂ ${spo2}% (92–93%)`);
  const complete = sbp !== null && dbp !== null && spo2 !== null;
  const mapText = map === null ? 'MAP unavailable' : `MAP ${Math.round(map)} mmHg`;
  if (red.length) {
    return {
      level:'red', label: hypotensionRed && hypoxaemiaRed ? 'UNSTABLE SCREEN — hypotension with hypoxaemia' :
        hypotensionRed ? 'UNSTABLE SCREEN — severe hypotension / low MAP' :
        hypoxaemiaRed ? 'CRITICAL RED FLAG — low oxygen saturation' : 'CRITICAL RED FLAG — clinical instability sign',
      badge:'RED ALERT — immediate doctor review', reasons:red, map, mapText,
      hypotensionRed, hypoxaemiaRed, complete
    };
  }
  if (!complete) return {
    level:'incomplete', label:'Screen incomplete — enter SBP, DBP and SpO₂',
    badge:'Awaiting observations', reasons:[], map, mapText, hypotensionRed:false, hypoxaemiaRed:false, complete
  };
  if (amber.length) return {
    level:'amber', label:'Borderline observations — prompt doctor review',
    badge:'ORANGE CAUTION — review required', reasons:amber, map, mapText, hypotensionRed:false, hypoxaemiaRed:false, complete
  };
  return {
    level:'green', label:'No predefined vital-sign red flags detected',
    badge:'No vital-sign red flag', reasons:[], map, mapText, hypotensionRed:false, hypoxaemiaRed:false, complete
  };
}
function updateHemoScreen() {
  const p = {
    sbp:$('sbp').value, dbp:$('dbp').value, spo2:$('spo2').value,
    instability:[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value)
  };
  const s = hemodynamicScreen(p);
  const panel = $('hemoPanel');
  if (!panel) return;
  panel.className = `hemo-panel level-${s.level}`;
  $('hemoBadge').textContent = s.badge;
  $('hemoTitle').textContent = s.label;
  $('hemoDetail').textContent = s.level === 'red'
    ? 'Do not classify as stable. Call the doctor/emergency team now. The doctor must determine whether instability is attributable to AF.'
    : s.level === 'amber'
    ? 'Repeat and verify observations. Complete bedside assessment; do not infer stability from numbers alone.'
    : s.level === 'green'
    ? 'No predefined vital-sign red flags. Complete bedside assessment of perfusion, mental status, ischemia and pulmonary oedema.'
    : 'Missing observations must not be treated as normal or as proof of stability.';
  $('hemoReason').textContent = (s.reasons.length ? 'Flags: '+s.reasons.join('; ')+' · ' : '') +
    `${s.mapText}. Screening thresholds: SBP ≤90, MAP <65, DBP ≤40, SpO₂ ≤91; caution SBP 91–100, DBP 41–59 or SpO₂ 92–93.`;
  renderStaffLiveGuidance();
}
function staffAssessment(p) {
  const h = hemodynamicScreen(p);
  const urgent = h.level === 'red' || p.wpw !== 'no' || p.qrs === 'Wide';
  const caution = !urgent && h.level === 'amber';
  const priority = urgent ? 'अभी डॉक्टर / emergency team को बुलाएं' : caution ? 'डॉक्टर को जल्दी जानकारी दें' : 'अभी दिए गए BP/SpO₂ में बड़ा खतरे का संकेत नहीं';
  let shockTitle, shockText;
  if (h.hypotensionRed || (p.instability || []).some(x => /Shock|hypotension|ischemia|pulmonary edema|consciousness/i.test(x))) {
    shockTitle = 'Urgent doctor assessment — prepare defibrillator only as directed';
    shockText = 'Call the doctor/resuscitation team immediately. Prepare monitor/defibrillator as directed. The doctor must assess whether acute instability is caused by AF. If confirmed, the doctor-led emergency pathway is immediate synchronized DC cardioversion. Staff must not independently deliver a shock.';
  } else if (h.hypoxaemiaRed) {
    shockTitle = 'Low SpO₂ — respiratory assessment required; no automatic shock indication';
    shockText = 'Call the doctor promptly, assess airway/breathing and give oxygen only as indicated under the prescribed target and hospital protocol. Low SpO₂ alone does not mean DC cardioversion is indicated.';
  } else if (p.wpw !== 'no' || p.qrs === 'Wide') {
    shockTitle = 'ECG red flag — urgent doctor review';
    shockText = 'Call the doctor for urgent ECG review and follow the hospital escalation protocol. This ECG flag does not itself authorise a shock or medication.';
  } else {
    shockTitle = 'No automatic shock instruction from entered observations';
    shockText = 'Do not shock on the basis of AF or heart rate alone. The doctor confirms stability after bedside assessment.';
  }
  const tasks = [
    ['डॉक्टर को फोन करें', urgent ? 'अभी फोन करें। मरीज की हालत और BP/SpO₂ बताएं।' : 'जल्दी डॉक्टर को जानकारी दें और रिपोर्ट भेजें।'],
    ['ECG और मॉनिटर', 'ECG करें और मरीज को cardiac monitor पर लगाएं।'],
    ['BP और ऑक्सीजन चेक करें', 'BP, pulse और SpO₂ दोबारा लिखें। हालत बिगड़े तो तुरंत बताएं।'],
    ['हाथ में IV लाइन लगाएं', 'डॉक्टर/अस्पताल के तय protocol के अनुसार IV cannula लगाएं।'],
    ['Oxygen', 'सांस और SpO₂ देखें। जरूरत होने पर डॉक्टर/प्रोटोकॉल के अनुसार oxygen दें।'],
    ['Emergency सामान तैयार रखें', 'मरीज की हालत खराब हो तो emergency team बुलाएं। DC machine पास रखें; shock केवल डॉक्टर के निर्देश या emergency protocol के अनुसार।'],
    ['दवा खुद से न दें', 'Score देखकर कोई दवा, injection या antibiotic शुरू न करें। डॉक्टर के आदेश का इंतजार करें।']
  ];
  return {h,urgent,caution,priority,shockTitle,shockText,tasks};
}
function staffAssessmentHtml(p) {
  const a = staffAssessment(p), cls = a.urgent ? 'urgent' : a.caution ? 'caution' : 'normal';
  const tasks = a.tasks.map((t,i)=>`<li><label class="staff-task"><input type="checkbox"><span><b>${esc(t[0])}</b><small>${esc(t[1])}</small></span></label></li>`).join('');
  return `<div class="staff-result ${cls}">
    <div class="staff-result-head"><small>STAFF ASSESSMENT</small><strong>${esc(a.priority)}</strong></div>
    <p><b>Automatic vital-sign screen:</b> ${esc(a.h.label)}</p>
    ${a.h.reasons.length?`<p><b>Reason:</b> ${esc(a.h.reasons.join('; '))}</p>`:''}
    <h4>Shock / cardioversion</h4><p><b>${esc(a.shockTitle)}</b></p><p>${esc(a.shockText)}</p>
    <h4>Staff preparation checklist</h4><ul class="staff-task-list">${tasks}</ul>
    <p class="staff-no-treatment"><b>Treatment details are hidden in Staff Mode.</b> Follow the doctor’s documented instructions after review.</p>
  </div>`;
}
function renderStaffLiveGuidance() {
  const host = $('staffLiveGuidance');
  if (!host || user.role !== 'staff') { if(host) host.classList.add('hidden'); return; }
  const p = {
    sbp:$('sbp').value, dbp:$('dbp').value, spo2:$('spo2').value, hr:$('hr').value,
    qrs:$('qrs').value, wpw:$('wpw').value,
    instability:[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value)
  };
  const h = hemodynamicScreen(p);
  const action = h.level==='red' ? 'RED ALERT: call doctor / emergency team immediately. Prepare monitoring and emergency equipment as directed; doctor decides whether AF-related instability requires synchronized cardioversion.' :
    h.level==='amber' ? 'ORANGE CAUTION: repeat observations and notify the doctor promptly.' :
    h.level==='green' ? 'No predefined vital-sign red flags. Continue observations and complete bedside assessment.' :
    'Enter SBP, DBP and SpO₂ to display the staff guidance.';
  host.className = 'staff-guidance' + (h.level==='red'?' urgent':h.level==='amber'?' caution':'');
  host.innerHTML = `<b>Staff next step</b><p>${esc(action)}</p><small>Doctor-only: cardioversion decision, anticoagulation, rate/rhythm strategy and drug doses.</small>`;
}
function collect() {
  const p = {};
  ids.forEach(k => p[k] = $(k)?.value ?? '');
  p.instability = [...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value);
  p.hemodynamicScreen = hemodynamicScreen(p);
  return p;
}
function updateAutoScore() {
  const ageRaw=$('age').value, sex=$('sex').value, age=Number(ageRaw);
  const valid=ageRaw!=='' && Number.isFinite(age) && age>=0;
  const age6574=valid && age>=65 && age<=74, age75=valid && age>=75;
  $('age6574Auto').textContent=valid?(age6574?'Yes':'No'):'Enter age above';
  $('age6574PointsAuto').textContent=valid?(age6574?'+1 point applied':'0 points'):'+1 point when Yes';
  $('age75Auto').textContent=valid?(age75?'Yes':'No'):'Enter age above';
  $('age75PointsAuto').textContent=valid?(age75?'+2 points applied':'0 points'):'+2 points when Yes';
  $('femaleAuto').textContent=!sex?'Select sex above':sex==='Female'?'Yes':sex==='Male'?'No':'Other / not specified';
  $('femalePointsAuto').textContent=!sex?'+1 point when Yes':sex==='Female'?'+1 CHA₂DS₂-VASc point applied':sex==='Male'?'0 points':'Confirm sex category with clinician';
}
function crcl(p) {
  const age=Number(p.age), wt=Number(p.weight), scr=Number(p.creatinine);
  if (!p.age || !p.weight || !p.creatinine || !Number.isFinite(age) || !Number.isFinite(wt) || !Number.isFinite(scr) ||
      age<18 || age>=140 || wt<=0 || scr<=0) return {value:null,reason:'Enter valid adult age, weight in kg and serum creatinine in mg/dL.'};
  if (p.sex!=='Male' && p.sex!=='Female') return {value:null,reason:'Select Male or Female to apply the Cockcroft–Gault sex factor; otherwise verify manually.'};
  const factor=p.sex==='Female'?0.85:1;
  const value=((140-age)*wt*factor)/(72*scr);
  if (!Number.isFinite(value) || value<=0) return {value:null,reason:'Inputs do not produce a valid Cockcroft–Gault estimate.'};
  return {value,reason:'Cockcroft–Gault equation using entered weight and serum creatinine.'};
}
function anticoagDecision(p, scores, guideline) {
  if (p.bleeding==='yes') return {
    level:'caution', decision:'review',
    text:'Bleeding history / active bleeding is marked. Clarify whether bleeding is active, its severity and reversibility; do not auto-start or auto-dose anticoagulation from this app.',
    route:'No route or dose is auto-selected until the bleeding history is clinically reviewed.'
  };
  if (p.valve==='yes') return {
    level:'normal', decision:'vka',
    text:'The form flags a mechanical valve or moderate/severe rheumatic mitral stenosis. A vitamin K antagonist (warfarin) pathway is required; DOAC options should not be selected.',
    route:'Long-term oral VKA with INR-guided dosing; do not use a fixed warfarin dose from this app.'
  };
  if (guideline==='esc') {
    if (scores.va>=2) return {
      level:'normal', decision:'recommend',
      text:`CHA₂DS₂-VA ${scores.va}: long-term oral anticoagulation is recommended under the 2024 ESC framework, unless contraindicated.`,
      route:'Long-term stroke prevention: ORAL anticoagulant. IV UFH is not required merely because the CHA₂DS₂-VA score is elevated.'
    };
    if (scores.va===1) return {
      level:'caution', decision:'consider',
      text:'CHA₂DS₂-VA 1: consider oral anticoagulation after individual risk–benefit assessment and shared decision-making.',
      route:'If anticoagulation is chosen for long-term prevention, the route is oral; IV heparin is not selected by the score alone.'
    };
    return {
      level:'normal', decision:'not-routine',
      text:'CHA₂DS₂-VA 0: routine long-term oral anticoagulation is generally not indicated by this score alone; assess additional risk factors.',
      route:'No routine long-term OAC recommendation from this score alone.'
    };
  }
  return {level:'caution',decision:'review',text:'Sex category is not adequate for automatic application of the selected ESC 2024 CHA₂DS₂-VA pathway. Clinician interpretation is required.',route:'Use CHA₂DS₂-VA for the ESC 2024 stroke-prevention pathway.'};
}

function doseReference(agent,p,renal,oac) {
  if (oac && oac.decision==='vka' && (!agent || agent==='none' || agent==='warfarin')) return 'Vitamin K antagonist pathway: warfarin with INR-guided, individualized dosing. No fixed warfarin dose is generated.';
  if (oac && !['recommend','consider','vka'].includes(oac.decision)) return 'No routine oral anticoagulation dose is suggested from the selected score pathway alone. If another indication exists, make an individual clinician decision.';
  if (oac && oac.decision==='review') return 'Dose not generated: the stroke-risk pathway requires clinician interpretation.';
  if (!agent || agent==='none') return 'Select the intended anticoagulant to display its dose reference. The app does not choose the drug for you.';
  if (p.bleeding==='yes') return 'Dose not displayed: bleeding history / active bleeding requires clinician review first.';
  if (p.valve==='yes' && agent!=='warfarin') return 'DOAC dose blocked: mechanical valve / moderate-severe rheumatic MS is flagged. Use the VKA pathway under specialist supervision.';
  if (agent==='warfarin') return 'Warfarin: individualize and titrate to INR (commonly target 2.0–3.0 for non-valvular AF; valve-specific targets may differ). No fixed dose is generated.';
  if (renal.value===null) return `Dose not calculated. ${renal.reason}`;
  const c=renal.value, age=Number(p.age), wt=Number(p.weight), scr=Number(p.creatinine);
  if (agent==='apixaban') {
    const criteria=[age>=80,wt<=60,scr>=1.5].filter(Boolean).length;
    if (c<15) return `Cockcroft–Gault CrCl ${c.toFixed(1)} mL/min. Very low CrCl: dose not auto-generated; specialist and local label review required.`;
    return `US FDA NVAF label reference: ${criteria>=2?'2.5 mg orally twice daily':'5 mg orally twice daily'}. Dose reduction criteria met: ${criteria}/3 (age ≥80 years, weight ≤60 kg, serum creatinine ≥1.5 mg/dL). This dose rule is not based on CrCl alone.`;
  }
  if (agent==='rivaroxaban') {
    if (c<15) return `CrCl ${c.toFixed(1)} mL/min: US label advises avoiding rivaroxaban below 15 mL/min. Do not auto-prescribe.`;
    return `US FDA NVAF label reference: ${c>50?'20 mg orally once daily with evening meal':'15 mg orally once daily with evening meal'} (CrCl ${c.toFixed(1)} mL/min).`;
  }
  if (agent==='edoxaban') {
    if (c>95) return `CrCl ${c.toFixed(1)} mL/min: US label says do not use edoxaban for NVAF when CrCl >95 mL/min.`;
    if (c<15) return `CrCl ${c.toFixed(1)} mL/min: no NVAF dose generated for CrCl <15 mL/min.`;
    return `US FDA NVAF label reference: ${c<=50?'30 mg orally once daily':'60 mg orally once daily'} (CrCl ${c.toFixed(1)} mL/min).`;
  }
  if (agent==='dabigatran') {
    if (c<15) return `CrCl ${c.toFixed(1)} mL/min: no dose recommendation available in this reference below 15 mL/min.`;
    if (c<=30) return `US FDA NVAF label reference: 75 mg orally twice daily for CrCl 15–30 mL/min. Check P-gp interactions and local label carefully.`;
    return `US FDA NVAF label reference: 150 mg orally twice daily for CrCl >30 mL/min. Check P-gp interactions, age, bleeding risk and local label carefully.`;
  }
  return 'Dose reference unavailable for this selection. Check the locally approved product information.';
}
function cardioversionDecision(p, review, scores, oac) {
  const h=hemodynamicScreen(p);
  const urgentECG=p.wpw!=='no'||p.qrs==='Wide';
  if (review.afInstability==='yes') {
    return {
      level:'urgent',
      title:'YES — immediate synchronized DC cardioversion is recommended',
      detail:'Doctor has marked haemodynamic instability as attributable to AF. Do not delay emergency cardioversion for 3 weeks of anticoagulation or TEE. Start/continue therapeutic anticoagulation as soon as clinically feasible under the emergency protocol (oral OAC or parenteral UFH/LMWH may be selected by the treating team according to urgency and patient factors); do not delay the shock.',
      energy:'Use synchronized biphasic cardioversion with the energy setting recommended by the specific defibrillator manufacturer and the hospital cardioversion protocol. The 2024 ESC AF guideline does not specify one universal joule setting. Confirm synchronization markers before every shock; provide sedation when feasible.',
      note:'If the rhythm is pre-excited AF / WPW or the diagnosis is uncertain, use the appropriate expert emergency rhythm pathway. This energy reference is for synchronized AF cardioversion, not unsynchronized defibrillation.'
    };
  }
  if (review.afInstability==='unknown' && h.level==='red') {
    return {
      level:'urgent',
      title:'RED ALERT — emergency bedside assessment; AF-related instability not yet confirmed',
      detail:'Entered observations meet the urgent screening threshold. The doctor must immediately determine whether instability is caused by AF. If yes, immediate synchronized DC cardioversion is recommended; do not delay for anticoagulation or TEE.',
      energy:'If the doctor confirms instability attributable to AF: perform immediate synchronized electrical cardioversion using the defibrillator manufacturer-recommended AF energy setting and the hospital protocol; ESC 2024 does not specify one universal joule value.',
      note:'Low SpO₂ alone does not establish AF-caused instability; assess respiratory and other causes.'
    };
  }
  if (review.afInstability==='no' && h.level==='red') {
    return {
      level:'caution',
      title:'NO AF-triggered emergency cardioversion based on the current attribution',
      detail:'A vital-sign red flag remains present, but the doctor has recorded that the instability is not attributable to AF. Urgently investigate and treat the alternative cause. Reassess the rhythm and haemodynamics.',
      energy:'No AF-specific emergency shock instruction from this assessment. If the clinical picture changes, reassess immediately.',
      note:'Do not interpret this as a declaration that the patient is safe or stable.'
    };
  }
  if (review.afInstability==='unknown') {
    return {
      level:'caution',
      title:'Cardioversion decision not yet determined',
      detail:'Complete the bedside haemodynamic assessment and record whether instability is attributable to AF. Do not convert this incomplete assessment into an automatic cardioversion decision.',
      energy:'No energy setting recommended until a cardioversion indication is established.',
      note:'The doctor makes the final rate/rhythm and cardioversion decision.'
    };
  }

  const dur=p.duration;
  const prolongedEsc=(dur==='24to48'||dur==='gt48'||dur==='unknown');
  const prolongedAcc=(dur==='gt48'||dur==='unknown');
  if (review.tee==='thrombus') {
    return {
      level:'urgent',
      title:'NO — defer elective cardioversion; TEE/TOE reports thrombus',
      detail:'Do not proceed with elective cardioversion while left atrial/appendage thrombus is present. Institute therapeutic anticoagulation and repeat imaging after the guideline-appropriate treatment interval before reconsidering.',
      energy:'No elective shock energy should be scheduled while thrombus is present.',
      note:'If the patient becomes acutely unstable, the emergency decision is separate and requires senior clinician judgement.'
    };
  }
  const protectedByOac=review.preOac==='yes';
  const protectedByTee=review.tee==='clear';
  if (review.guideline==='esc' && prolongedEsc) {
    if (protectedByOac || protectedByTee) {
      return {
        level:'normal',
        title:'YES — elective/early cardioversion may be considered after clinician review',
        detail:protectedByOac?'ESC 2024 pathway: ≥3 weeks therapeutic OAC with confirmed adherence is recorded. Confirm anticoagulant adequacy and continue therapeutic anticoagulation after cardioversion.':
          'ESC 2024 pathway: TEE/TOE is recorded as showing no atrial thrombus. Arrange therapeutic periprocedural anticoagulation and continue OAC after cardioversion.',
        energy:'Use the specific defibrillator manufacturer-recommended synchronized biphasic AF setting and the hospital protocol; ESC 2024 does not specify a universal joule value.',
        note:'Most patients require at least 4 weeks of OAC after cardioversion; longer-term OAC follows stroke-risk assessment.'
      };
    }
    return {
      level:'caution',
      title:'NO — defer elective cardioversion for now',
      detail:'ESC 2024 pathway: AF duration is in the 24–48 h, >48 h or unknown category. Before elective cardioversion, provide ≥3 weeks of therapeutic anticoagulation with confirmed adherence OR perform TEE/TOE to exclude atrial thrombus.',
      energy:'No elective shock energy is scheduled until the anticoagulation or imaging condition is met.',
      note:'If clinical instability attributable to AF develops, use the emergency pathway instead.'
    };
  }

  return {
    level:'caution',
    title:'Cardioversion decision requires exact AF duration and guideline review',
    detail:'AF duration or onset reliability is incomplete. Confirm the exact onset time and review therapeutic anticoagulation/TEE status before scheduling elective cardioversion.',
    energy:'No energy setting recommended until a cardioversion indication is established.',
    note:'Emergency cardioversion is a separate pathway if instability attributable to AF is confirmed.'
  };
}
function doctorReviewValues(r) {
  const saved=r.doctorReview || {};
  return {
    guideline:'esc',
    afInstability:saved.afInstability || 'unknown',
    preOac:saved.preOac || 'unknown',
    tee:saved.tee || 'notdone',
    agent:saved.agent || 'none'
  };
}
function doctorDecisionData(r, review) {
  const p=r.patient, scores=score(p), renal=crcl(p);
  const oac=anticoagDecision(p,scores,review.guideline);
  const cardioversion=cardioversionDecision(p,review,scores,oac);
  const dose=doseReference(review.agent,p,renal,oac);
  return {scores,renal,oac,cardioversion,dose};
}
function doctorSafetyFlags(p){
  const flags=[];
  if(p.wpw!=='no') flags.push('Possible / uncertain pre-excited AF: urgent expert ECG review. Avoid AV-nodal blockers and IV amiodarone in pre-excited AF.');
  if(p.qrs==='Wide') flags.push('Wide QRS: urgent expert rhythm assessment before rate-control medication.');
  if(p.lvef!=='' && Number(p.lvef)<=40) flags.push('Reduced LVEF entered: avoid IV diltiazem / verapamil in moderate-to-severe LV systolic dysfunction or decompensated HFrEF.');
  if(p.bleeding==='yes') flags.push('Bleeding history / active bleeding marked: clarify whether bleeding is currently active before prescribing.');
  return flags;
}
function doctorDecisionHtml(r, review) {
  const d=doctorDecisionData(r,review);
  const safety=doctorSafetyFlags(r.patient);
  const cvClass=d.cardioversion.level==='urgent'?'urgent':d.cardioversion.level==='caution'?'caution':'normal';
  const oacClass=d.oac.level==='caution'?'caution':'normal';
  const crclText=d.renal.value===null?d.renal.reason:`Cockcroft–Gault CrCl: ${d.renal.value.toFixed(1)} mL/min`;
  return `<div class="doctor-decision">
    <div class="score-strip"><b>CHA₂DS₂-VA: ${d.scores.va}</b><b>CHA₂DS₂-VASc: ${d.scores.vasc}</b></div>
    <section class="doctor-card ${cvClass}">
      <small> CARDIOVERSION DECISION SUPPORT · ESC 2024 ONLY </small>
      <h4>${esc(d.cardioversion.title)}</h4>
      <p>${esc(d.cardioversion.detail)}</p>
      <p><b>Energy reference:</b> ${esc(d.cardioversion.energy)}</p>
      <small>${esc(d.cardioversion.note)}</small>
      <p><b>Post-cardioversion anticoagulation:</b> Continue OAC for at least 4 weeks after cardioversion in most patients. ESC 2024 allows omission only when there are no thromboembolic risk factors and sinus rhythm is restored within 24 h of AF onset; long-term OAC is based on risk regardless of rhythm outcome.</p>
    </section>
    <section class="doctor-card ${oacClass}">
      <small> LONG-TERM STROKE PREVENTION · ESC 2024 ONLY </small>
      <h4>Anticoagulation: ${esc(d.oac.text)}</h4>
      <p>${esc(d.oac.route)}</p>
      <small>Score-based OAC is a long-term stroke-prevention decision. IV UFH/LMWH is not selected solely by CHA₂DS₂ score; peri-cardioversion anticoagulation is a separate decision.</small>
    </section>
    <section class="doctor-card renal-card">
      <small> RENAL FUNCTION / DOSE CHECK </small>
      <h4>${esc(crcl(p).value===null?'Cockcroft–Gault CrCl not calculated':crclText)}</h4>
      <p>${esc(d.dose)}</p>
      <small>Drug-dose output is a reference only, based on US FDA product labelling; confirm the locally approved Indian product information, drug interactions, renal status, hepatic function, contraindications and the final prescription.</small>
    </section>
    ${safety.length?`<section class="doctor-card caution"><small>ADDITIONAL SAFETY FLAGS</small><ul>${safety.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
    <p class="clinical-footnote"><b>Decision support, not an automatic order.</b> Review ECG, symptoms, perfusion, LVEF, QTc, potassium/magnesium, bleeding status, current medicines, interactions and local protocol before prescribing or performing cardioversion.</p>
  </div>`;
}
function doctorPanelHtml(r) {
  const v=doctorReviewValues(r);
  return `<div class="doctor-panel" id="doctorPanel">
    <h4>Doctor decision panel</h4>
    <div class="grid">
      <label>Is haemodynamic instability attributable to AF?<select id="drAfInstability"><option value="unknown" ${v.afInstability==='unknown'?'selected':''}>Not yet assessed</option><option value="yes" ${v.afInstability==='yes'?'selected':''}>Yes — attributable to AF</option><option value="no" ${v.afInstability==='no'?'selected':''}>No — another cause</option></select></label>
      <label>Therapeutic anticoagulation ≥3 weeks with adherence confirmed?<select id="drPreOac"><option value="unknown" ${v.preOac==='unknown'?'selected':''}>Unknown / not confirmed</option><option value="yes" ${v.preOac==='yes'?'selected':''}>Yes</option><option value="no" ${v.preOac==='no'?'selected':''}>No</option></select></label>
      <label>TEE / TOE result<select id="drTee"><option value="notdone" ${v.tee==='notdone'?'selected':''}>Not done / not available</option><option value="clear" ${v.tee==='clear'?'selected':''}>No atrial thrombus detected</option><option value="thrombus" ${v.tee==='thrombus'?'selected':''}>Atrial thrombus detected</option><option value="indeterminate" ${v.tee==='indeterminate'?'selected':''}>Indeterminate</option></select></label>
      <label>Anticoagulant selected by doctor<select id="drAgent"><option value="none" ${v.agent==='none'?'selected':''}>Not selected</option><option value="apixaban" ${v.agent==='apixaban'?'selected':''}>Apixaban</option><option value="rivaroxaban" ${v.agent==='rivaroxaban'?'selected':''}>Rivaroxaban</option><option value="edoxaban" ${v.agent==='edoxaban'?'selected':''}>Edoxaban</option><option value="dabigatran" ${v.agent==='dabigatran'?'selected':''}>Dabigatran</option><option value="warfarin" ${v.agent==='warfarin'?'selected':''}>Warfarin</option></select></label>
    </div>
    <div id="doctorDecisionOutput">${doctorDecisionHtml(r,v)}</div>
    <div class="actions"><button type="button" class="light" id="saveDoctorReview">Save doctor review inputs</button></div>
  </div>`;
}
function renderDoctorPanel(r) {
  const host=$('doctorDecisionOutput');
  if (!host) return;
  const v={
    guideline:'esc',
    afInstability:$('drAfInstability').value,
    preOac:$('drPreOac').value,
    tee:$('drTee').value,
    agent:$('drAgent').value
  };
  host.innerHTML=doctorDecisionHtml(r,v);
}
function captureDoctorReview() {
  return {
    guideline:'esc',
    afInstability:$('drAfInstability').value,
    preOac:$('drPreOac').value,
    tee:$('drTee').value,
    agent:$('drAgent').value,
    reviewedBy:user.name,
    reviewedAt:new Date().toISOString()
  };
}
function bindDoctorPanel(r) {
  ['drAfInstability','drPreOac','drTee','drAgent'].forEach(id => {
    $(id)?.addEventListener('change',()=>renderDoctorPanel(r));
  });
  $('saveDoctorReview')?.addEventListener('click',()=>{
    r.doctorReview=captureDoctorReview();
    r.updatedAt=new Date().toISOString();
    r.history=r.history||[];
    r.history.push({event:'Doctor decision inputs saved',by:user.name,at:r.updatedAt});
    save();
    openRecord(r.id);
  });
}
function advice(p) {
  const s=score(p), h=hemodynamicScreen(p), a=[];
  if(h.level==='red') a.push('URGENT SCREEN ALERT: '+h.label+'. If instability is attributable to AF, immediate synchronized electrical cardioversion is recommended; do not delay for anticoagulation or TEE.');
  else if(h.level==='amber') a.push('CAUTION: Borderline observations. Repeat and review clinically.');
  else if(h.level==='green') a.push('No predefined vital-sign red flags; bedside stability assessment remains essential.');
  else a.push('Haemodynamic screen incomplete; do not infer stability.');
  if(p.wpw!=='no') a.push('Possible/uncertain pre-excitation: urgent expert ECG review. Avoid AV-nodal blockers and IV amiodarone in pre-excited AF.');
  if(p.qrs==='Wide') a.push('Wide QRS: urgent ECG/clinical review before selecting rate-control medication.');
  a.push(`CHA₂DS₂-VA ${s.va}; CHA₂DS₂-VASc ${s.vasc}. Age ${p.age||'not entered'} years → ${s.ageBand} (${s.agePoints} point(s)); sex ${p.sex||'not specified'} ${s.female?'adds 1 point to CHA₂DS₂-VASc only':'does not add a sex point'}.`);
  return {s,a,urgent:h.level==='red'||p.wpw!=='no'||p.qrs==='Wide'};
}
function tab(t) {
  ['list','form','transfer'].forEach(x=>$(x).classList.toggle('hidden',x!==t));
}
function render() {
  const pending=records.filter(r=>r.status==='Pending review').length;
  const approved=records.filter(r=>r.status==='Approved').length;
  $('stats').textContent=`${pending} pending review · ${approved} approved`;
  $('records').innerHTML=records.slice().reverse().map(r=>`<div class="patient">
    <div><b>${esc(r.patient.pName)}</b><br><small>${esc(formatRecordId(r.id))} · ${esc(r.status)} · ${esc(r.by)}</small></div>
    <button class="light" data-id="${esc(r.id)}">Open</button>
  </div>`).join('')||'<p class="hint">No records on this device.</p>';
  $('choose').innerHTML=records.map(r=>`<option value="${esc(r.id)}">${esc(r.patient.pName)} · ${esc(formatRecordId(r.id))}</option>`).join('');
  document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openRecord(b.dataset.id));
}
function exportableRecord(r) {
  const copy=JSON.parse(JSON.stringify(r));
  if(user.role==='staff') { delete copy.plan; delete copy.approvedBy; delete copy.approvedAt; }
  return copy;
}
function exportR(r) {
  const blob=new Blob([JSON.stringify({format:'HeartlineAFTransfer',version:1,record:exportableRecord(r)},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${formatRecordId(r.id)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function staffApprovedWorkflowHtml(r) {
  const pathway=r.approvedPathway || 'medical';
  const isDc=pathway==='cardioversion';
  const items=isDc ? [
    'डॉक्टर के आदेश और मरीज की पहचान दोबारा मिलाएं',
    'मरीज को ECG monitor पर लगाएं',
    'DC machine चालू करके सही काम कर रही है या नहीं देखें',
    'Cardioversion pads डॉक्टर के निर्देश के अनुसार लगाएं',
    'Consent form भरवाएं और sign करवाएं; emergency में hospital policy मानें',
    'IV cannula और emergency medicines/equipment तैयार रखें',
    'Oxygen, suction और airway सामान पास रखें',
    'Sedation की तैयारी केवल डॉक्टर के आदेश पर करें',
    'हर step पूरा होने पर tick करें और डॉक्टर को बताएं'
  ] : [
    'डॉक्टर के आदेश और मरीज की पहचान दोबारा मिलाएं',
    'हाथ में IV cannula लगाएं',
    'मरीज को ECG monitor पर लगाएं',
    'BP, pulse और SpO₂ लिखें',
    'Infusion pump और IV सामान तैयार रखें',
    'Allergy और चल रही दवाओं की जानकारी डॉक्टर को बताएं',
    'दवा केवल डॉक्टर के लिखे आदेश के अनुसार तैयार करें',
    'दवा शुरू करने से पहले नाम, dose और route दोबारा मिलाएं',
    'दवा देने के बाद मरीज की हालत और vitals दर्ज करें'
  ];
  const done=(r.staffChecklistDone||[]);
  return `<section class="staff-approved-workflow">
    <div class="staff-workflow-title"><b>डॉक्टर ने plan approve कर दिया है</b><small>${isDc?'DC cardioversion की तैयारी करें':'Medical treatment की तैयारी करें'}</small></div>
    <p>नीचे दिए गए काम एक-एक करके करें। Treatment का फैसला डॉक्टर का है।</p>
    <div class="staff-checklist" data-checklist-record="${esc(r.id)}">
      ${items.map((item,i)=>`<label class="staff-check-item"><input type="checkbox" data-task="${i}" ${done.includes(i)?'checked':''}><span>${esc(item)}</span></label>`).join('')}
    </div>
    <button type="button" class="light" id="saveStaffChecklist">काम पूरे होने की जानकारी Save करें</button>
    <small class="hint">अगर मरीज की हालत बिगड़े तो checklist पूरी करने का इंतजार न करें—तुरंत emergency team बुलाएं।</small>
  </section>`;
}
function openRecord(id) {
  const r=records.find(x=>x.id===id);
  if(!r) return;
  document.querySelectorAll('[data-record-detail]').forEach(el=>el.remove());
  const d=advice(r.patient);
  const act=user.role==='doctor'&&r.status!=='Approved'?'<button id="approve">Approve treatment plan</button>':
    user.role==='staff'&&r.status==='Approved'?'<button class="light" id="correction">Request correction</button>':'';
  const staffBlock=user.role==='staff'?staffAssessmentHtml(r.patient):
    `<h4>Initial clinical data</h4><p>CHA₂DS₂-VA: ${d.s.va} · CHA₂DS₂-VASc: ${d.s.vasc}</p><p>Automatic screen: ${esc(hemodynamicScreen(r.patient).label)}</p>`;
  const doctorBlock=user.role==='doctor'?doctorPanelHtml(r):'';
  const planBlock=user.role==='doctor'&&r.plan?`<h4>Doctor-approved treatment plan</h4><p>${esc(r.plan)}</p><small>Approved by ${esc(r.approvedBy)} · ${new Date(r.approvedAt).toLocaleString()}</small>`:
    user.role==='staff'&&r.status==='Approved'?staffApprovedWorkflowHtml(r):'';
  $('records').insertAdjacentHTML('afterbegin',`<div class="card" data-record-detail>
    <h3>${esc(r.patient.pName)} — ${esc(r.status)}</h3>
    <p><b>Internal record ID:</b> ${esc(formatRecordId(r.id))} · <b>UHID:</b> ${esc(r.patient.uhid||'Not entered')}</p>
    <p>Age ${esc(r.patient.age)} · ${esc(r.patient.sex)} · HR ${esc(r.patient.hr||'—')} · BP ${esc(r.patient.sbp||'—')}/${esc(r.patient.dbp||'—')} · SpO₂ ${esc(r.patient.spo2||'—')} · AF duration ${esc(durationLabel(r.patient.duration))}</p>
    ${staffBlock}${doctorBlock}${planBlock}
    ${r.correction&&user.role==='doctor'?`<p>Correction request (${esc(r.correction.status)}): ${esc(r.correction.reason)}</p>`:''}
    ${act}<button class="light" id="oneExport">Export file</button>
  </div>`);
  if(user.role==='doctor') bindDoctorPanel(r);
  $('saveStaffChecklist')?.addEventListener('click',()=>{
    if(user.role!=='staff'||r.status!=='Approved')return;
    r.staffChecklistDone=[...document.querySelectorAll('[data-checklist-record] input[data-task]:checked')].map(x=>Number(x.dataset.task));
    r.updatedAt=new Date().toISOString();
    r.history=r.history||[];r.history.push({event:'Staff preparation checklist updated',by:user.name,at:r.updatedAt,completed:r.staffChecklistDone.length});
    save();openRecord(r.id);
  });
  $('approve')?.addEventListener('click',()=>{
    const review=captureDoctorReview();
    const pathwayChoice=prompt('Select approved pathway: type 1 for DC cardioversion, 2 for medical management. This only selects the staff preparation checklist.');
    if(!['1','2'].includes((pathwayChoice||'').trim())) return alert('Please select 1 or 2. No approval saved.');
    const plan=prompt('Enter the doctor-approved treatment plan and exact instructions. Verify doses, contraindications and local product information.');
    if(!plan) return;
    r.approvedPathway=pathwayChoice.trim()==='1'?'cardioversion':'medical';
    r.staffChecklistDone=[];
    r.doctorReview=review;r.plan=plan;r.status='Approved';r.approvedBy=user.name;
    r.approvedAt=new Date().toISOString();r.updatedAt=r.approvedAt;
    r.history=r.history||[];r.history.push({event:'Doctor approved treatment plan',by:user.name,at:r.approvedAt});
    save();openRecord(r.id);
  });
  $('correction')?.addEventListener('click',()=>{
    const reason=prompt('Describe correction requested; do not overwrite approved data.');
    if(!reason)return;
    r.correction={reason,status:'Requested',by:user.name,at:new Date().toISOString()};
    r.history=r.history||[];r.history.push({event:'Correction requested',by:user.name,at:r.correction.at});
    save();openRecord(r.id);
  });
  $('oneExport').onclick=()=>exportR(r);
}

$('enter').onclick=()=>{
  if(!$('name').value.trim())return alert('Enter your name');
  user={role:$('role').value,name:$('name').value.trim(),language:$('staffLanguage')?.value||'hinglish'};
  $('login').classList.add('hidden');$('app').classList.remove('hidden');
  $('hello').textContent=`${user.name} · ${user.role} mode`;
  $('calc').textContent=user.role==='staff'?'Show simple staff assessment':'Calculate initial assessment';
  $('new').classList.toggle('hidden',user.role!=='staff');
  renderStaffLiveGuidance();render();
};
$('switch').onclick=()=>{user={role:'',name:'',language:'hinglish'};$('app').classList.add('hidden');$('login').classList.remove('hidden')};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('new').onclick=()=>{
  if(user.role!=='staff')return alert('Only staff can create a patient submission.');
  $('patientForm').reset();updateAutoScore();updateHemoScreen();
  $('assessed').value=new Date().toISOString().slice(0,16);
  $('result').classList.add('hidden');tab('form');
};
$('age').addEventListener('input',updateAutoScore);
$('sex').addEventListener('change',updateAutoScore);
$('calc').onclick=()=>{
  const p=collect();
  $('result').classList.remove('hidden');
  if(user.role==='staff') {
    $('result').className='result';
    $('result').innerHTML=staffAssessmentHtml(p);
  } else {
    const d=advice(p);
    $('result').className='result '+(d.urgent?'danger':'');
    $('result').innerHTML=`<b>Initial screen only</b><ul>${d.a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><small>Import/submit the record, then use Doctor Mode decision panel for the full pathway.</small>`;
  }
};
$('patientForm').onsubmit=e=>{
  e.preventDefault();
  if(user.role!=='staff')return alert('Only staff can submit records.');
  const p=collect();
  if(!p.duration)return alert('AF duration is required.');
  const now=new Date().toISOString();
  records.push({id:makeRecordId(),patient:p,status:'Pending review',by:user.name,createdAt:now,updatedAt:now,history:[{event:'Submitted',by:user.name,at:now}]});
  save();alert('Patient assessment saved. Export the JSON file and share it with the doctor through your approved channel.');tab('list');
};
$('download').onclick=()=>{const r=records.find(x=>x.id===$('choose').value);if(r)exportR(r);else alert('Select a record.')};
$('whatsapp').onclick=async()=>{
  const r=records.find(x=>x.id===$('choose').value);if(!r)return alert('Select a record.');
  const f=new File([JSON.stringify({format:'HeartlineAFTransfer',version:1,record:exportableRecord(r)},null,2)],`${formatRecordId(r.id)}.json`,{type:'application/json'});
  const msg=`AF assessment for review. Patient: ${r.patient.pName}. Record: ${formatRecordId(r.id)}. AF duration: ${durationLabel(r.patient.duration)}. Vital-sign screen: ${hemodynamicScreen(r.patient).label}. Import the attached JSON file in AF Management.`;
  if(navigator.canShare?.({files:[f]})) {
    try { await navigator.share({title:'AF patient handover',text:msg,files:[f]}); }
    catch(e){if(e.name!=='AbortError')alert('Share unavailable. Export JSON and attach manually in WhatsApp.');}
  } else { exportR(r);window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');alert('Attach the downloaded JSON file in WhatsApp.');}
};
$('print').onclick=()=>{
  const r=records.find(x=>x.id===$('choose').value);if(!r)return alert('Select a record.');
  const w=window.open('','_blank'),d=advice(r.patient);
  if(user.role==='staff') {
    const sh=staffAssessment(r.patient);
    w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Staff Assessment</h2><p>Patient: ${esc(r.patient.pName)} · UHID: ${esc(r.patient.uhid)} · Age: ${esc(r.patient.age)}</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)}</p><p><b>${esc(sh.priority)}</b></p><p><b>Automatic screen:</b> ${esc(sh.h.label)}</p><p><b>Shock / cardioversion:</b> ${esc(sh.shockText)}</p><h3>Staff preparation checklist</h3><ul>${sh.tasks.map(t=>`<li><b>${esc(t[0])}:</b> ${esc(t[1])}</li>`).join('')}</ul><small>Staff view: medication and treatment decisions remain doctor-only.</small><script>window.print()<\/script>`);
  } else {
    const rv=doctorReviewValues(r),dd=doctorDecisionData(r,rv);
    w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Doctor Review</h2><p>Patient: ${esc(r.patient.pName)} · Record: ${esc(formatRecordId(r.id))} · UHID: ${esc(r.patient.uhid)}</p><p>Age: ${esc(r.patient.age)} · Sex: ${esc(r.patient.sex)} · Weight: ${esc(r.patient.weight)} kg · Creatinine: ${esc(r.patient.creatinine)} mg/dL</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)} · AF duration: ${esc(durationLabel(r.patient.duration))}</p><h3>CHA₂DS₂-VA ${dd.scores.va} · CHA₂DS₂-VASc ${dd.scores.vasc}</h3><h3>Cardioversion</h3><p><b>${esc(dd.cardioversion.title)}</b></p><p>${esc(dd.cardioversion.detail)}</p><p>${esc(dd.cardioversion.energy)}</p><h3>Anticoagulation</h3><p>${esc(dd.oac.text)} ${esc(dd.oac.route)}</p><h3>Renal / dose reference</h3><p>${esc(dd.renal.value===null?dd.renal.reason:`Cockcroft–Gault CrCl ${dd.renal.value.toFixed(1)} mL/min`)}</p><p>${esc(dd.dose)}</p><small>Clinical decision support only. US label references must be checked against the locally approved Indian product information before prescribing.</small><script>window.print()<\/script>`);
  }
  w.document.close();
};
$('import').onclick=async()=>{
  const f=$('file').files[0];if(!f)return alert('Choose JSON file.');
  try{
    const o=JSON.parse(await f.text()),r=o.record;
    if(o.format!=='HeartlineAFTransfer'||!r?.id||!r.patient)throw Error('Invalid transfer file.');
    const i=records.findIndex(x=>x.id===r.id);
    if(i>=0&&records[i].status==='Approved'&&user.role!=='doctor')return alert('Staff cannot overwrite an approved record.');
    if(i>=0)records[i]=r;else records.push(r);
    save();alert('Imported. Confirm patient identity and inspect the record in the Patients tab.');tab('list');
  }catch(e){alert('Import failed: '+e.message);}
};
['sbp','dbp','spo2'].forEach(id=>$(id).addEventListener('input',updateHemoScreen));
document.querySelectorAll('[name=inst]').forEach(el=>el.addEventListener('change',updateHemoScreen));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
