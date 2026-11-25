const $ = (id) => document.getElementById(id);
let records = [];
let lastSeenRecordsRaw = localStorage.getItem('hl_af_v1') || '[]';
try { const stored = JSON.parse(lastSeenRecordsRaw); records = Array.isArray(stored) ? stored.filter(r => r && r.id && r.patient) : []; } catch (e) { console.warn('Stored AF records could not be read:', e); }
let editingRecordId = null;
let treatmentDrafts = {};
try { const d=JSON.parse(localStorage.getItem('hl_af_treatment_drafts_v1')||'{}'); treatmentDrafts=d&&typeof d==='object'?d:{}; } catch(e) { treatmentDrafts={}; }
function persistTreatmentDrafts(){ return storageWrite('hl_af_treatment_drafts_v1',JSON.stringify(treatmentDrafts)); }
let auditTrail = [];
try { const a=JSON.parse(localStorage.getItem('hl_af_audit_v1')||'[]'); auditTrail=Array.isArray(a)?a:[]; } catch(e) { auditTrail=[]; }
let treatmentFavourites = [];
try { const f=JSON.parse(localStorage.getItem('hl_af_favourites_v1')||'[]'); treatmentFavourites=Array.isArray(f)?f:[]; } catch(e) { treatmentFavourites=[]; }
let staffProfiles=[];
try { const s=JSON.parse(localStorage.getItem('hl_af_staff_profiles_v1')||'[]'); staffProfiles=Array.isArray(s)?s.filter(x=>x&&x.id&&x.name):[]; } catch(e) { staffProfiles=[]; }
let weeklyBackupState={};
try { const b=JSON.parse(localStorage.getItem('hl_af_weekly_backup_v1')||'{}'); weeklyBackupState=b&&typeof b==='object'?b:{}; } catch(e) { weeklyBackupState={}; }
let wizardDrafts={};
try { const d=JSON.parse(localStorage.getItem('hl_af_wizard_drafts_v1')||'{}'); wizardDrafts=d&&typeof d==='object'?d:{}; } catch(e) { wizardDrafts={}; }
let user={role:'',name:'',language:'english',staffId:'',staffProfile:null};
let backupLockActive=false;
const WEEKLY_BACKUP_MS=7*24*60*60*1000;
const APP_STARTED_KEY='hl_af_app_started_v1';
if(!localStorage.getItem(APP_STARTED_KEY)) localStorage.setItem(APP_STARTED_KEY,new Date().toISOString());
function storageWrite(key,value){try{localStorage.setItem(key,value);return true;}catch(error){const message=error?.name==='QuotaExceededError'?'Device storage is full. Export a backup and free device storage before continuing.':`Could not save local data: ${error.message||error}`;alert(message);return false;}}
function saveStaffProfiles(){return storageWrite('hl_af_staff_profiles_v1',JSON.stringify(staffProfiles));}
function saveWeeklyBackupState(){return storageWrite('hl_af_weekly_backup_v1',JSON.stringify(weeklyBackupState));}
function persistWizardDrafts(){return storageWrite('hl_af_wizard_drafts_v1',JSON.stringify(wizardDrafts));}
function backupScopeKey(){return user.role==='doctor'?'doctor':`staff:${user.staffId||normalizedStaffName(user.name)}`;}
function getBackupState(){const key=backupScopeKey();if(!weeklyBackupState[key]){const baseline=localStorage.getItem(APP_STARTED_KEY);weeklyBackupState[key]={lastBackupAt:null,dueFrom:baseline||new Date().toISOString(),initializedAt:new Date().toISOString()};saveWeeklyBackupState();}return weeklyBackupState[key];}
function isWeeklyBackupDue(){return AFManagementCore.isBackupDue(getBackupState(),Date.now(),WEEKLY_BACKUP_MS);}
function markBackupComplete(fileName,blobSize){const key=backupScopeKey();const previous=weeklyBackupState[key]||{};weeklyBackupState[key]={...previous,lastBackupAt:new Date().toISOString(),lastFileName:fileName,lastFileSize:blobSize,lastGeneratedAt:new Date().toISOString()};if(!saveWeeklyBackupState()){weeklyBackupState[key]=previous;return false;}backupLockActive=false;$('weeklyBackupGate')?.classList.add('hidden');document.body.classList.remove('backup-locked');renderBackupMeta();return true;}
function confirmBackupSaved(fileName,blobSize){const sizeText=typeof blobSize==='number'?`${(blobSize/1024).toFixed(1)} KB`:'size unavailable';const saved=confirm(`Backup download was started. File: ${fileName} (${sizeText}).

Can you see this file in your Downloads / Files folder?

OK = Yes, I can see the file.
Cancel = No / retry backup.`);if(!saved){alert('Backup is not marked complete. The weekly lock remains active. Please retry and confirm only after locating the file.');return false;}return markBackupComplete(fileName,blobSize);}
function weeklyBackupDueText(){const s=getBackupState();return s.lastBackupAt?new Date(s.lastBackupAt).toLocaleString():'No backup generated yet';}
function currentWizardDraftKey(){return user.role==='staff'&&user.staffId?`staff:${user.staffId}`:'';}
function saveWizardDraft(){const key=currentWizardDraftKey();if(!key||!$('patientForm'))return;const values={};ids.forEach(id=>{if($(id))values[id]=$(id).value;});const draft={staffId:user.staffId,staffName:user.name,step:wizardCurrentStep,editingRecordId:editingRecordId||null,values,instability:[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value),savedAt:new Date().toISOString()};wizardDrafts[key]=draft;persistWizardDrafts();}
function clearWizardDraft(){const key=currentWizardDraftKey();if(key&&wizardDrafts[key]){delete wizardDrafts[key];persistWizardDrafts();}}
function resumeWizardDraft(){
  const key=currentWizardDraftKey(),draft=key?wizardDrafts[key]:null;
  if(!draft||draft.staffId!==user.staffId)return false;
  const when=draft.savedAt?new Date(draft.savedAt).toLocaleString():'previously';
  if(!confirm(`An unfinished patient entry for ${user.name} was saved ${when}.\n\nResume this entry?`))return false;
  if(draft.editingRecordId){
    const existing=records.find(r=>r.id===draft.editingRecordId);
    if(!existing||!canAccessRecord(existing)||existing.status!=='Pending review'){
      clearWizardDraft();alert('The pending record being edited is no longer available for staff correction. The saved edit draft has been cleared.');return false;
    }
    editingRecordId=existing.id;$('formTitle').textContent=`Edit patient: ${existing.patient.pName||''}`;$('submitPatient').textContent='Save corrected pending entry';$('cancelEdit').classList.remove('hidden');
  } else {
    editingRecordId=null;$('formTitle').textContent='Patient assessment';$('submitPatient').textContent='Submit for doctor review';$('cancelEdit').classList.add('hidden');
  }
  fillPatientForm(draft.values||{});
  document.querySelectorAll('[name=inst]').forEach(el=>el.checked=(draft.instability||[]).includes(el.value));
  setWizardStep(Number(draft.step)||1);tab('form');return true;
}
function normalizedStaffName(value) { return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
function recordOwner(r) { return r?.enteredBy || r?.by || r?.history?.[0]?.by || ''; }
function canAccessRecord(r) { if(user.role==='doctor')return true; if(user.role!=='staff')return false; if(user.staffId&&r?.enteredById)return r.enteredById===user.staffId; return normalizedStaffName(recordOwner(r))===normalizedStaffName(user.name); }
function visibleRecords() { return records.filter(canAccessRecord); }
const DEFAULT_DOCTOR_NAME = 'Dr. Himanshu Parashar';
let activeRecordId = null;
let wizardCurrentStep = 1;
const WIZARD_STEP_TITLES = ['Patient demographics','Clinical assessment','Risk scores and history','Staff directions and final review'];
const WIZARD_STEP_HINTS = ['Enter patient name, age and sex. Complete all required details to continue.','Enter current observations, symptoms, AF duration and ECG status.','Confirm risk factors using Yes, No or Unknown. Do not guess.','Review the safety alert and preparation steps, then submit to the doctor.'];

const ids = 'pName uhid age sex weight mobile hr sbp dbp spo2 symptoms duration reliability onset assessed ecg qrs wpw lvef creatinine htn diabetes hf stroke vascular bleeding valve notes'.split(' ');

function save() {
  try {
    const latest=localStorage.getItem('hl_af_v1') || '[]';
    if(latest!==lastSeenRecordsRaw){
      throw new Error('Another AF Management tab changed patient records. Your changes were not saved to avoid overwriting newer data. Reload this tab and review the latest record.');
    }
    const raw=JSON.stringify(records);
    if(!storageWrite('hl_af_v1',raw))return false;
    lastSeenRecordsRaw=raw;
    if(!storageWrite('hl_af_audit_v1',JSON.stringify(auditTrail)))return false;
    if(!storageWrite('hl_af_favourites_v1',JSON.stringify(treatmentFavourites)))return false;
    if(!saveStaffProfiles()||!saveWeeklyBackupState()||!persistTreatmentDrafts())return false;
    render();return true;
  } catch(error){alert(error.message||'Could not save patient data. Export a backup and retry.');return false;}
}
function bumpRecordRevision(record,at=new Date().toISOString()){
  record.revision=Math.max(0,Number(record.revision)||0)+1;
  record.updatedAt=at;
  return record;
}
function invalidateApprovedPlanAfterClinicalEdit(record,at){
  if(record.status==='Approved'||(Array.isArray(record.treatmentOrders)&&record.treatmentOrders.length)){
    record.status='Needs re-approval';record.planNeedsReapproval=true;record.planOutdatedAt=at;
  }
}
function validateIncomingRecord(record){
  const result=AFManagementCore.validateRecord(record);
  if(!result.valid)throw new Error(`Invalid patient record: ${result.reason}`);
  return record;
}
function recordVersionDecision(existing,incoming){return AFManagementCore.compareRecordVersions(existing,incoming);}
function planVersionDecision(existing,incoming){
  const a=Number(existing.planRevision)||0,b=Number(incoming.planRevision)||0;
  if(a&&b){if(b<a)return {decision:'stale',reason:'incoming plan revision is older'};if(b>a)return {decision:'newer',reason:'incoming plan revision is newer'};const at=Date.parse(incoming.approvedAt||'')||0,bt=Date.parse(existing.approvedAt||'')||0;return at>bt?{decision:'conflict',reason:'same plan revision has a later approval timestamp'}:{decision:'same',reason:'same or older plan revision'};}
  const at=Date.parse(incoming.approvedAt||incoming.updatedAt||'')||0,bt=Date.parse(existing.approvedAt||existing.updatedAt||'')||0;
  if(at&&bt&&at<bt)return {decision:'stale',reason:'incoming approval is older'};
  if(at&&bt&&at>bt)return {decision:'legacy-confirm',reason:'legacy plan has no plan revision'};
  return {decision:'legacy-confirm',reason:'plan revision metadata is missing'};
}
function mergeIncomingRecords(existingRecords,incomingRecords,source='import'){
  const map=new Map(existingRecords.map(r=>[r.id,r]));const accepted=[],skipped=[],confirmations=[];
  const incomingIds=new Set();
  for(const raw of incomingRecords){validateIncomingRecord(raw);if(incomingIds.has(raw.id))throw new Error('Incoming file contains duplicate patient record IDs. Nothing was imported.');incomingIds.add(raw.id);const incoming=JSON.parse(JSON.stringify(raw));const existing=map.get(incoming.id);
    if(!existing){incoming.revision=Math.max(1,Number(incoming.revision)||1);incoming.planRevision=Math.max(0,Number(incoming.planRevision)||0);map.set(incoming.id,incoming);accepted.push(incoming.id);continue;}
    const verdict=recordVersionDecision(existing,incoming);
    if(verdict.decision==='stale'||verdict.decision==='same'){skipped.push({id:incoming.id,reason:verdict.reason});continue;}
    if(verdict.decision==='legacy-confirm'||verdict.decision==='conflict'||existing.status==='Approved')confirmations.push({id:incoming.id,name:existing.patient?.pName||incoming.patient?.pName||incoming.id,reason:verdict.reason||'existing record is approved'});
    else {const clinicalChanged=JSON.stringify(existing.patient)!==JSON.stringify(incoming.patient);if(clinicalChanged&&(existing.status==='Approved'||incoming.status==='Approved')){incoming.status='Needs re-approval';incoming.planNeedsReapproval=true;incoming.planOutdatedAt=new Date().toISOString();}map.set(incoming.id,incoming);accepted.push(incoming.id);}
  }
  if(confirmations.length){const summary=confirmations.slice(0,8).map(x=>`${x.name} (${x.id}): ${x.reason}`).join('\n');const ok=confirm(`Some existing records need confirmation before replacement.

${summary}

Replace only these records with the incoming file?`);if(ok){for(const item of confirmations){const candidate=incomingRecords.find(r=>r.id===item.id);if(candidate){const replacement=JSON.parse(JSON.stringify(candidate));const current=map.get(candidate.id);if(current&&JSON.stringify(current.patient)!==JSON.stringify(replacement.patient)&&(current.status==='Approved'||replacement.status==='Approved')){replacement.status='Needs re-approval';replacement.planNeedsReapproval=true;replacement.planOutdatedAt=new Date().toISOString();}map.set(candidate.id,replacement);accepted.push(candidate.id);}}}else confirmations.forEach(x=>skipped.push({id:x.id,reason:'user declined replacement'}));}
  return {records:[...map.values()],accepted,skipped};
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
  const ageValid = p.age !== '' && Number.isFinite(age) && age >= 0;
  const agePoints = ageValid ? (age >= 75 ? 2 : age >= 65 ? 1 : 0) : 0;
  const ageBand = !ageValid ? 'Age not entered' : age >= 75 ? '75 years or older' : age >= 65 ? '65–74 years' : 'Under 65 years';
  const scoreKeys = ['hf','htn','diabetes','stroke','vascular'];
  const unknownCriteria = scoreKeys.filter(k => !['yes','no'].includes(p[k]));
  if (!ageValid) unknownCriteria.push('age');
  const base = (yes('hf')?1:0) + (yes('htn')?1:0) + (yes('diabetes')?1:0) +
    (yes('stroke')?2:0) + (yes('vascular')?1:0) + agePoints;
  const female = p.sex === 'Female';
  return { va: base, vasc: base + (female ? 1 : 0), agePoints, ageBand, female, unknownCriteria, complete: unknownCriteria.length===0 };
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
function hasPotentialAfRelatedInstability(p) {
  const h=hemodynamicScreen(p);
  const clinicalFlags=Array.isArray(p.instability)?p.instability:[];
  const bedsideInstability=clinicalFlags.some(x=>/shock|poor perfusion|severe hypotension|ongoing ischemia|acute pulmonary edema|altered consciousness/i.test(String(x)));
  // Low SpO₂ alone needs urgent respiratory assessment, but is not by itself an AF-cardioversion indication.
  return !!(h.hypotensionRed || bedsideInstability);
}
function hasUrgentEcgConcern(p) {
  return p.qrs==='Wide' || p.wpw==='yes';
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
  const possibleAfInstability=hasPotentialAfRelatedInstability(p);
  const urgentEcg=hasUrgentEcgConcern(p);
  const ecgUncertain=p.wpw==='uncertain' || p.qrs==='Unknown';
  const urgent = possibleAfInstability || h.hypoxaemiaRed || urgentEcg;
  const caution = !urgent && (h.level === 'amber' || ecgUncertain);
  const priority = possibleAfInstability
    ? 'अभी डॉक्टर / emergency team को बुलाएं'
    : h.hypoxaemiaRed
      ? 'ऑक्सीजन कम है — डॉक्टर को अभी बताएं'
      : urgentEcg
        ? 'ECG में urgent finding — डॉक्टर को तुरंत बताएं'
        : caution
          ? 'डॉक्टर को जल्दी जानकारी दें'
          : 'अभी दिए गए observations में बड़ा खतरे का संकेत नहीं';

  let focusedGuidance='';
  if (possibleAfInstability) {
    focusedGuidance = `<section class="staff-cardioversion-prep"><h4>Possible AF-related instability — DC cardioversion की तैयारी करें</h4><p>मरीज की हालत गंभीर हो सकती है। डॉक्टर और emergency team को तुरंत बुलाएं। DC cardioversion की जरूरत पड़ सकती है, यदि डॉक्टर पुष्टि करें कि instability AF की वजह से है।</p><p>DC machine और pads तैयार रखें, मरीज को continuous ECG monitor पर रखें और oxygen, suction तथा airway/emergency सामान पास रखें। Shock केवल डॉक्टर के निर्देश और hospital emergency protocol के अनुसार दिया जाएगा।</p></section>`;
  } else if (h.hypoxaemiaRed) {
    focusedGuidance = `<section class="staff-respiratory-alert"><h4>Low oxygen saturation — तुरंत respiratory assessment</h4><p>डॉक्टर को अभी बताएं। मरीज की सांस, SpO₂ और airway देखें। Oxygen केवल clinical need और hospital protocol / prescribed target के अनुसार दें। सांस की तकलीफ और SpO₂ पर लगातार नजर रखें।</p></section>`;
  } else if (urgentEcg) {
    focusedGuidance = `<section class="staff-respiratory-alert"><h4>Urgent ECG review</h4><p>Wide QRS या pre-excitation की आशंका है। ECG तुरंत डॉक्टर को दिखाएं और बिना डॉक्टर के निर्देश कोई rate-control दवा न दें।</p></section>`;
  } else if (ecgUncertain) {
    focusedGuidance = `<section class="staff-respiratory-alert"><h4>ECG details confirm करें</h4><p>QRS / WPW की जानकारी अधूरी है। ECG डॉक्टर से verify करवाएं।</p></section>`;
  }

  const tasks = [
    ['डॉक्टर को फोन करें', urgent ? 'अभी फोन करें। मरीज की हालत और BP/SpO₂ बताएं।' : 'डॉक्टर को जानकारी दें और assessment भेजें।'],
    ['ECG और मॉनिटर', 'ECG करें और मरीज को cardiac monitor पर लगाएं।'],
    ['BP और ऑक्सीजन चेक करें', 'BP, pulse और SpO₂ दोबारा लिखें। हालत बिगड़े तो तुरंत बताएं।'],
    ['हाथ में IV लाइन लगाएं', 'डॉक्टर/अस्पताल के तय protocol के अनुसार IV cannula लगाएं।'],
    ['Oxygen', 'सांस और SpO₂ देखें। जरूरत होने पर डॉक्टर/प्रोटोकॉल के अनुसार oxygen दें।'],
    ['Emergency सामान तैयार रखें', possibleAfInstability ? 'Emergency trolley, oxygen, suction और airway सामान पास रखें। DC machine की तैयारी ऊपर दिए निर्देश के अनुसार करें।' : 'मरीज की हालत बिगड़े तो emergency team बुलाएं और hospital emergency protocol follow करें।'],
    ['दवा खुद से न दें', 'Score देखकर कोई दवा, injection या antibiotic शुरू न करें। डॉक्टर के आदेश का इंतजार करें।']
  ];
  return {h,urgent,caution,priority,possibleAfInstability,focusedGuidance,tasks};
}
function staffAssessmentHtml(p) {
  const a = staffAssessment(p), cls = a.urgent ? 'urgent' : a.caution ? 'caution' : 'normal';
  const tasks = a.tasks.map((t,i)=>`<li><label class="staff-task"><input type="checkbox"><span><b>${esc(t[0])}</b><small>${esc(t[1])}</small></span></label></li>`).join('');
  return `<div class="staff-result ${cls}">
    <div class="staff-result-head"><small>STAFF ASSESSMENT</small><strong>${esc(a.priority)}</strong></div>
    <p><b>Automatic vital-sign screen:</b> ${esc(a.h.label)}</p>
    ${a.h.reasons.length?`<p><b>Reason:</b> ${esc(a.h.reasons.join('; '))}</p>`:''}
    ${a.focusedGuidance}
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
  const possibleAfInstability=hasPotentialAfRelatedInstability(p);
  const urgentEcg=hasUrgentEcgConcern(p);
  let action='Enter SBP, DBP and SpO₂ to display the staff guidance.';
  if(possibleAfInstability) action='RED ALERT: अभी डॉक्टर और emergency team को बुलाएं। मरीज को monitor पर लगाएं और possible AF-related instability के कारण DC cardioversion की तैयारी करें; डॉक्टर पुष्टि करेंगे कि इसकी जरूरत है या नहीं।';
  else if(h.hypoxaemiaRed) action='RED ALERT: SpO₂ कम है। डॉक्टर को अभी बताएं, सांस/airway देखें और hospital protocol के अनुसार respiratory support तैयार करें.';
  else if(urgentEcg) action='URGENT ECG REVIEW: ECG तुरंत डॉक्टर को दिखाएं। बिना निर्देश rate-control दवा न दें.';
  else if(h.level==='amber') action='ORANGE CAUTION: observations दोबारा check करें और डॉक्टर को जल्दी बताएं.';
  else if(h.level==='green') action='No predefined vital-sign red flags. Routine monitoring जारी रखें और bedside assessment पूरा करें.';
  host.className = 'staff-guidance' + ((possibleAfInstability||h.hypoxaemiaRed)?' urgent':(h.level==='amber'||urgentEcg)?' caution':'');
  host.innerHTML = `<b>Staff next step</b><p>${esc(action)}</p><small>Treatment decisions, medicines and doses are doctor-only.</small>`;
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
  renderRiskScoreSummary();
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
  if (p.bleeding!=='no') return {
    level:'caution', decision:'review',
    text:p.bleeding==='yes'?'Bleeding history / active bleeding is marked. Clarify whether bleeding is active, its severity and reversibility; do not auto-start or auto-dose anticoagulation from this app.':'Bleeding history is unknown. Confirm bleeding status before any anticoagulation decision.',
    route:'No route or dose is auto-selected until the bleeding history is clinically reviewed.'
  };
  if (p.valve==='yes') return {
    level:'normal', decision:'vka',
    text:'The form flags a mechanical valve or moderate/severe rheumatic mitral stenosis. A vitamin K antagonist pathway (warfarin or acenocoumarol / Acitrom) is required; DOAC options should not be selected.',
    route:'Long-term oral VKA with INR-guided dosing; the treating doctor selects warfarin or acenocoumarol and individualizes the dose.'
  };
  if (p.valve!=='no') return {
    level:'caution', decision:'review',
    text:'Mechanical valve / moderate-severe rheumatic mitral stenosis status is unknown. Confirm valve history before selecting an anticoagulant; do not assume a DOAC is suitable.',
    route:'No DOAC pathway should be chosen until valve status is clarified.'
  };
  if (scores.unknownCriteria?.length) return {
    level:'caution', decision:'review',
    text:`Stroke-risk score is provisional. Confirm these missing / unknown criteria before applying the CHA₂DS₂-VA threshold: ${scores.unknownCriteria.join(', ')}. Unknown must not be treated as No.`,
    route:'Do not make a definitive score-based long-term anticoagulation decision until the missing risk history has been confirmed.'
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
  if (agent==='ufh') return 'IV unfractionated heparin selected. The app does not calculate an IV bolus or infusion. The treating doctor must enter the indication-specific regimen, weight-based dose if applicable, monitoring target (e.g. aPTT / anti-Xa), and adjustment protocol in the treatment order.';
  if (agent==='enoxaparin') return 'Enoxaparin (Clexane) selected. The app does not calculate a dose. The treating doctor must individualize the SC regimen by indication, body weight, renal function, bleeding risk and local product information.';
  if (oac && oac.decision==='vka' && (!agent || agent==='none' || agent==='warfarin' || agent==='acenocoumarol')) return 'Vitamin K antagonist pathway: warfarin or acenocoumarol (Acitrom), with INR-guided individualized dosing. No fixed dose is generated.';
  if (oac && !['recommend','consider','vka'].includes(oac.decision)) return 'No routine oral anticoagulation dose is suggested from the selected score pathway alone. If another indication exists, make an individual clinician decision.';
  if (oac && oac.decision==='review') return 'Dose not generated: the stroke-risk pathway requires clinician interpretation.';
  if (!agent || agent==='none') return 'Select the intended anticoagulant to display its dose reference. The app does not choose the drug for you.';
  if (p.bleeding==='yes') return 'Dose not displayed: bleeding history / active bleeding requires clinician review first.';
  if (p.valve==='yes' && !['warfarin','acenocoumarol'].includes(agent)) return 'DOAC dose blocked: mechanical valve / moderate-severe rheumatic MS is flagged. Use the VKA pathway under specialist supervision.';
  if (agent==='warfarin' || agent==='acenocoumarol') return `${agent==='warfarin'?'Warfarin':'Acenocoumarol (Acitrom)'}: individualize and titrate to INR. No fixed dose is generated.`;
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
  if (agent==='dabigatran') {
    if (c<15) return `CrCl ${c.toFixed(1)} mL/min: no dose recommendation available in this reference below 15 mL/min.`;
    if (c<=30) return `US FDA NVAF label reference: 75 mg orally twice daily for CrCl 15–30 mL/min. Check P-gp interactions and local label carefully.`;
    return `US FDA NVAF label reference: 150 mg orally twice daily for CrCl >30 mL/min. Check P-gp interactions, age, bleeding risk and local label carefully.`;
  }
  return 'Dose reference unavailable for this selection. Check the locally approved product information.';
}
function cardioversionDecision(p, review, scores, oac) {
  const h=hemodynamicScreen(p);
  const possibleAfInstability=hasPotentialAfRelatedInstability(p);
  const afAttribution=possibleAfInstability?review.afInstability:'not-applicable';
  if (afAttribution==='yes') {
    return {
      level:'urgent',
      title:'YES — immediate synchronized DC cardioversion is recommended',
      detail:'Doctor has marked haemodynamic instability as attributable to AF. Do not delay emergency cardioversion for 3 weeks of anticoagulation or TEE. Start/continue therapeutic anticoagulation as soon as clinically feasible under the emergency protocol (oral OAC or parenteral UFH/LMWH may be selected by the treating team according to urgency and patient factors); do not delay the shock.',
      energy:'Use synchronized biphasic cardioversion with the energy setting recommended by the specific defibrillator manufacturer and the hospital cardioversion protocol. The 2024 ESC AF guideline does not specify one universal joule setting. Confirm synchronization markers before every shock; provide sedation when feasible.',
      note:'If the rhythm is pre-excited AF / WPW or the diagnosis is uncertain, use the appropriate expert emergency rhythm pathway. This energy reference is for synchronized AF cardioversion, not unsynchronized defibrillation.'
    };
  }
  if (afAttribution==='unknown' && possibleAfInstability) {
    return {
      level:'urgent',
      title:'RED ALERT — emergency bedside assessment; AF-related instability not yet confirmed',
      detail:'Entered observations meet the urgent screening threshold. The doctor must immediately determine whether instability is caused by AF. If yes, immediate synchronized DC cardioversion is recommended; do not delay for anticoagulation or TEE.',
      energy:'If the doctor confirms instability attributable to AF: perform immediate synchronized electrical cardioversion using the defibrillator manufacturer-recommended AF energy setting and the hospital protocol; ESC 2024 does not specify one universal joule value.',
      note:'Low SpO₂ alone does not establish AF-caused instability; assess respiratory and other causes.'
    };
  }
  if (afAttribution==='no' && possibleAfInstability) {
    return {
      level:'caution',
      title:'NO AF-triggered emergency cardioversion based on the current attribution',
      detail:'A vital-sign red flag remains present, but the doctor has recorded that the instability is not attributable to AF. Urgently investigate and treat the alternative cause. Reassess the rhythm and haemodynamics.',
      energy:'No AF-specific emergency shock instruction from this assessment. If the clinical picture changes, reassess immediately.',
      note:'Do not interpret this as a declaration that the patient is safe or stable.'
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
  const assessmentHasInstability=hasPotentialAfRelatedInstability(r.patient);
  const savedAgent=saved.agent==='edoxaban'?'none':(saved.agent||'none');
  const savedInstability=['yes','no','unknown'].includes(saved.afInstability)?saved.afInstability:'unknown';
  return {
    guideline:'esc',
    afInstability:assessmentHasInstability?savedInstability:'not-applicable',
    preOac:saved.preOac || 'unknown',
    tee:saved.tee || 'notdone',
    agent:savedAgent
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
    <div class="score-strip"><b>CHA₂DS₂-VA: ${d.scores.complete?'': '≥ '}${d.scores.va}${d.scores.complete?'':' (provisional)'}</b><b>CHA₂DS₂-VASc: ${d.scores.complete?'': '≥ '}${d.scores.vasc}${d.scores.complete?'':' (provisional)'}</b></div>${!d.scores.complete?`<p class="score-warning"><b>Incomplete risk history:</b> ${esc(d.scores.unknownCriteria.join(', '))}. Unknown values have not been counted as No; anticoagulation guidance remains provisional.</p>`:''}
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
      <h4>${esc(d.renal.value===null?'Cockcroft–Gault CrCl not calculated':crclText)}</h4>
      <p>${esc(d.dose)}</p>
      <small>Drug-dose output is a reference only, based on US FDA product labelling; confirm the locally approved Indian product information, drug interactions, renal status, hepatic function, contraindications and the final prescription.</small>
    </section>
    ${safety.length?`<section class="doctor-card caution"><small>ADDITIONAL SAFETY FLAGS</small><ul>${safety.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
    <p class="clinical-footnote"><b>Decision support, not an automatic order.</b> Review ECG, symptoms, perfusion, LVEF, QTc, potassium/magnesium, bleeding status, current medicines, interactions and local protocol before prescribing or performing cardioversion.</p>
  </div>`;
}
const ORDER_ITEMS = {
  rate: ['Diltiazem','Metoprolol','Esmolol','Digoxin','Other / custom order'],
  rhythm: ['Amiodarone','Flecainide','Propafenone','Other / custom order'],
  anticoagulation: ['Apixaban','Rivaroxaban','Dabigatran','Warfarin','Acitrom (acenocoumarol)','Unfractionated heparin (IV UFH)','Enoxaparin (Clexane)','Other / custom order'],
  cardioversion: ['Synchronized DC cardioversion','TEE / TOE assessment','Other / custom order'],
  investigation: ['12-lead ECG','Electrolytes (K⁺ / Mg²⁺)','Echocardiography','Thyroid function tests (TFT)','Complete blood count (CBC)','Kidney function tests (KFT)','Arterial blood gas (ABG)','Troponin I','NT-proBNP','Other / custom order'],
  supportive: ['Monitoring instruction','Oxygen instruction','IV access / preparation','Other / custom order']
};
function getOrderDraft(r) {
  if (!treatmentDrafts[r.id]) treatmentDrafts[r.id]=JSON.parse(JSON.stringify(r.treatmentOrders||[]));
  return treatmentDrafts[r.id];
}
function orderText(o) {
  return [o.categoryLabel,o.item,o.dose&&`Dose: ${o.dose}`,o.route&&`Route: ${o.route}`,o.dilution&&`Dilution / infusion: ${o.dilution}`,o.frequency&&`Frequency: ${o.frequency}`,o.duration&&`Duration: ${o.duration}`,o.instructions&&`Instructions: ${o.instructions}`].filter(Boolean).join(' · ');
}
function renderDraftOrderList(r) {
  const host=$('treatmentDraftList'); if(!host)return;
  const orders=getOrderDraft(r);
  host.innerHTML=orders.length?orders.map((o,i)=>`<div class="order-draft"><div><b>${esc(o.item||'Order')}</b><small>${esc(orderText(o))}</small></div><button type="button" class="light remove-order" data-index="${i}">Remove</button></div>`).join(''):'<p class="hint">No treatment orders added yet.</p>';
}
function populateOrderItems(category, selected='') {
  const select=$('tbItem'); if(!select)return;
  const items=ORDER_ITEMS[category]||ORDER_ITEMS.supportive;
  select.innerHTML='<option value="">Choose medicine / order</option>'+items.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
}
function renderTreatmentBuilder(r) {
  const path=r.approvedPathway||'medical';
  const favOptions=treatmentFavourites.map((f,i)=>`<option value="${i}">${esc(f.name)}</option>`).join('');
  const orders=getOrderDraft(r);
  return `<section class="treatment-builder" id="treatmentBuilder">
    <div class="treatment-builder-heading"><h4>Build treatment orders</h4><span class="hint">Doctor only · Orders remain drafts until you approve</span></div>
    <label>Staff preparation pathway<select id="tbPathway"><option value="medical" ${path!=='cardioversion'?'selected':''}>Medical management / medicines</option><option value="cardioversion" ${path==='cardioversion'?'selected':''}>DC cardioversion preparation</option></select></label>
    <div class="grid">
      <label>Order category<select id="tbCategory"><option value="rate">Rate control</option><option value="rhythm">Rhythm control</option><option value="anticoagulation">Anticoagulation</option><option value="cardioversion">Cardioversion</option><option value="investigation">Investigations</option><option value="supportive">Supportive / other</option></select></label>
      <label>Medicine / order<select id="tbItem"><option value="">Choose medicine / order</option></select></label>
      <label>Custom medicine / order name<input id="tbCustomItem" placeholder="Fill only when Other / custom order is selected"></label>
      <label>Dose / strength<input id="tbDose" placeholder="Enter prescribed dose"></label>
      <label>Route<select id="tbRoute"><option value="">Not specified</option><option>IV</option><option>Oral</option><option>SC</option><option>Procedure</option><option>Other</option></select></label>
      <label>Dilution / infusion details<input id="tbDilution" placeholder="Enter only if applicable"></label>
      <label>Frequency<input id="tbFrequency" placeholder="e.g. once, BD, infusion"></label>
      <label>Duration<input id="tbDuration" placeholder="Enter duration / stop time"></label>
    </div>
    <label>Instructions for staff<textarea id="tbInstructions" rows="2" placeholder="Monitoring, preparation, hold parameters, follow-up, etc."></textarea></label>
    <div class="actions"><button type="button" id="tbAddOrder">＋ Add order</button><button type="button" class="light" id="tbClearFields">Clear fields</button></div>
    <h5>Orders in this treatment plan</h5><div id="treatmentDraftList"></div>
    <div class="favourite-row"><label>My favourite regimens<select id="tbFavourite"><option value="">Select saved favourite</option>${favOptions}</select></label><div class="actions"><button type="button" class="light" id="tbLoadFavourite">Load favourite</button><button type="button" class="light" id="tbSaveFavourite">Save current orders as favourite</button></div></div>
    <p class="clinical-footnote">No dose is pre-filled or automatically prescribed. Enter and verify each dose, route, dilution, frequency and duration yourself. Check ECG, WPW/pre-excitation, LVEF, renal function, allergies, interactions and local product information before approval.</p>
  </section>`;
}
function bindTreatmentBuilder(r) {
  populateOrderItems($('tbCategory').value);
  renderDraftOrderList(r);
  $('tbCategory').addEventListener('change',()=>populateOrderItems($('tbCategory').value));
  $('tbAddOrder').addEventListener('click',()=>{
    const selectedItem=$('tbItem').value;
    if(!selectedItem)return alert('Choose a medicine or order first.');
    const category=$('tbCategory').value;
    const item=selectedItem==='Other / custom order'?$('tbCustomItem').value.trim():selectedItem;
    if(!item)return alert('Enter the custom medicine / order name.');
    if(['rate','rhythm','anticoagulation'].includes(category) && (!$('tbDose').value.trim()||!$('tbRoute').value))return alert('For a medicine order, enter the dose / strength and route before adding it.');
    if(category==='cardioversion')$('tbPathway').value='cardioversion';
    const categoryLabel=$('tbCategory').selectedOptions[0]?.textContent||category;
    const order={category,categoryLabel,item,dose:$('tbDose').value.trim(),route:$('tbRoute').value,dilution:$('tbDilution').value.trim(),frequency:$('tbFrequency').value.trim(),duration:$('tbDuration').value.trim(),instructions:$('tbInstructions').value.trim()};
    const draft=getOrderDraft(r); draft.push(order); treatmentDrafts[r.id]=draft;
    ['tbDose','tbDilution','tbFrequency','tbDuration','tbInstructions','tbCustomItem'].forEach(id=>$(id).value=''); $('tbRoute').value=''; $('tbItem').value='';
    persistTreatmentDrafts(); renderDraftOrderList(r);
  });
  $('treatmentDraftList').addEventListener('click',event=>{
    const b=event.target.closest('.remove-order'); if(!b)return;
    getOrderDraft(r).splice(Number(b.dataset.index),1); persistTreatmentDrafts(); renderDraftOrderList(r);
  });
  $('tbClearFields').addEventListener('click',()=>{
    ['tbDose','tbDilution','tbFrequency','tbDuration','tbInstructions','tbCustomItem'].forEach(id=>$(id).value='');$('tbRoute').value='';$('tbItem').value='';
  });
  $('tbSaveFavourite').addEventListener('click',()=>{
    const draft=getOrderDraft(r); if(!draft.length)return alert('Add at least one order before saving a favourite.');
    const name=prompt('Name this favourite regimen:'); if(!name||!name.trim())return;
    treatmentFavourites.push({name:name.trim(),pathway:$('tbPathway').value,orders:JSON.parse(JSON.stringify(draft)),savedAt:new Date().toISOString()});
    if(!storageWrite('hl_af_favourites_v1',JSON.stringify(treatmentFavourites))){treatmentFavourites.pop();return;}
    const select=$('tbFavourite'); select.innerHTML='<option value="">Select saved favourite</option>'+treatmentFavourites.map((f,i)=>`<option value="${i}">${esc(f.name)}</option>`).join('');
    select.value=String(treatmentFavourites.length-1); alert('Favourite regimen saved on this device.');
  });
  $('tbLoadFavourite').addEventListener('click',()=>{
    const f=treatmentFavourites[Number($('tbFavourite').value)]; if(!f)return alert('Select a saved favourite regimen.');
    treatmentDrafts[r.id]=JSON.parse(JSON.stringify(f.orders||[])); persistTreatmentDrafts(); $('tbPathway').value=f.pathway||'medical'; renderDraftOrderList(r);
  });
}
function generatePlanText(orders) {
  return (orders||[]).map((o,i)=>`${i+1}. ${orderText(o)}`).join('\n');
}
function staffApprovedOrdersHtml(r) {
  const orders=r.treatmentOrders||[];
  if(!orders.length)return '<p class="hint">Doctor-approved plan details are not attached. Contact the doctor.</p>';
  return `<section class="staff-order-summary"><h4>Doctor-approved treatment orders</h4>${orders.map((o,i)=>`<div class="staff-order-item"><b>${i+1}. ${esc(o.item)}</b><p>${esc(orderText(o))}</p></div>`).join('')}</section>`;
}
function downloadBlob(filename, content, type) {
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000); return {filename,size:blob.size,blob};
}
function uniqueFileStamp(){return `${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(36).slice(2,6)}`;}
async function encodeTransferPayload(payload){
  const json=JSON.stringify(payload);const digest=await AFManagementCore.sha256Hex(json);const bytes=new TextEncoder().encode(json);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return `SHA-256: ${digest}\nBASE64:\n${btoa(binary)}`;
}
async function decodeTransferPayload(section,requireChecksum=false){
  const text=String(section||'').trim();const m=text.match(/^SHA-256:\s*([a-f0-9]{64})\s+BASE64:\s*([A-Za-z0-9+/=\s]+)$/i);
  if(m){const binary=atob(m[2].replace(/\s+/g,''));const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));const json=new TextDecoder().decode(bytes);const actual=await AFManagementCore.sha256Hex(json);if(actual.toLowerCase()!==m[1].toLowerCase())throw new Error('File integrity check failed. The TXT file may be damaged or altered. Ask the sender to share it again.');return JSON.parse(json);}
  if(requireChecksum)throw new Error('This version-2 TXT file is missing its SHA-256 integrity checksum. Ask the sender to export it again.');
  // Backward compatibility: v1 TXT files did not include a checksum.
  const binary=atob(text.replace(/\s+/g,''));const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes));
}
function makeFullBackup() {
  return {format:'HeartlineAFBackup',version:3,appVersion:'1.9',backedUpAt:new Date().toISOString(),records:JSON.parse(JSON.stringify(records)),staffProfiles:JSON.parse(JSON.stringify(staffProfiles)),treatmentDrafts:JSON.parse(JSON.stringify(treatmentDrafts)),treatmentFavourites:JSON.parse(JSON.stringify(treatmentFavourites)),auditTrail:JSON.parse(JSON.stringify(auditTrail)),weeklyBackupState:JSON.parse(JSON.stringify(weeklyBackupState)),wizardDrafts:JSON.parse(JSON.stringify(wizardDrafts))};
}
function exportAllJson(options={}) {
  const filename=`Heartline_AF_Full_Backup_${uniqueFileStamp()}.json`;
  try{const result=downloadBlob(filename,JSON.stringify(makeFullBackup(),null,2),'application/json');return confirmBackupSaved(filename,result.size);}catch(error){alert(`Backup could not be generated: ${error.message||error}`);return false;}
}
function exportAllText() {
  const b=makeFullBackup();
  const lines=[`HEARTLINE HEALTHCARE LLP — AF MANAGEMENT COMPLETE DATA EXPORT`,`Generated: ${b.backedUpAt}`,`Records on this device: ${records.length}`,``,...records.map((r,i)=>{
    const p=r.patient||{}; const arr=[`========== PATIENT ${i+1} =========`,`Record ID: ${formatRecordId(r.id)}`,`Status: ${r.status||'Imported'}`,`Entered by: ${recordOwner(r)||'Not recorded'}`,`Approved by: ${r.approvedBy||'Not approved'}`,`Created: ${r.createdAt||''}`,`Updated: ${r.updatedAt||''}`,`Patient details:`];
    Object.entries(p).forEach(([k,v])=>arr.push(`  ${k}: ${typeof v==='object'?JSON.stringify(v):String(v??'')}`));
    if(r.treatmentOrders?.length){arr.push('Doctor-approved treatment orders:');r.treatmentOrders.forEach((o,j)=>arr.push(`  ${j+1}. ${orderText(o)}`));}
    if(r.plan)arr.push(`Plan summary: ${r.plan}`);
    if(r.history?.length){arr.push('Record history:');r.history.forEach(h=>arr.push(`  ${h.at||''} | ${h.by||''} | ${h.event||''}`));}
    arr.push('Complete structured record data:',JSON.stringify(r,null,2));
    return arr.join('\n');
  }),'',`Favourite regimens saved: ${treatmentFavourites.length}`,`Audit trail entries: ${auditTrail.length}`];
  downloadBlob(`Heartline_AF_Full_Export_${uniqueFileStamp()}.txt`,lines.join('\n'),'text/plain;charset=utf-8');
}
function exportAllPdf() {
  const w=window.open('','_blank'); if(!w)return alert('Allow pop-ups to create the complete PDF print view.');
  const pages=records.map((r,i)=>{
    const p=r.patient||{};
    const rows=Object.entries(p).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(typeof v==='object'?JSON.stringify(v):String(v??''))}</td></tr>`).join('');
    const orders=(r.treatmentOrders||[]).map((o,j)=>`<li><b>${esc(o.item)}</b><br>${esc(orderText(o))}</li>`).join('')||'<li>No treatment orders saved</li>';
    const hist=(r.history||[]).map(h=>`<li>${esc(h.at||'')} · ${esc(h.by||'')} · ${esc(h.event||'')}</li>`).join('');
    return `<section class="patient-page"><h2>Patient ${i+1}: ${esc(p.pName||'Unnamed')}</h2><p>Record: ${esc(formatRecordId(r.id))} · UHID: ${esc(p.uhid||'')} · Status: ${esc(r.status||'Imported')}</p><p>Entered by: ${esc(recordOwner(r))} · Approved by: ${esc(r.approvedBy||'Not approved')}</p><h3>Patient and assessment data</h3><table>${rows}</table><h3>Doctor-approved treatment orders</h3><ol>${orders}</ol><h3>Record history</h3><ul>${hist}</ul><p>Plan summary: ${esc(r.plan||'Not recorded')}</p><h3>Doctor review inputs</h3><pre>${esc(JSON.stringify(r.doctorReview||{},null,2))}</pre><h3>Staff checklist completion</h3><pre>${esc(JSON.stringify(r.staffChecklistDone||[],null,2))}</pre></section>`;
  }).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Heartline AF Complete Backup</title><style>body{font:12px Arial;color:#172d30;margin:22px}h1{color:#00646b}h2{border-bottom:2px solid #00646b;padding-bottom:6px}h3{margin:14px 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd7d7;text-align:left;padding:5px;vertical-align:top}th{width:30%;background:#eef5f5}.patient-page{page-break-after:always;break-after:page}.patient-page:last-child{page-break-after:auto;break-after:auto}li{margin:4px 0}.muted{color:#607477}@media print{button{display:none}}</style></head><body><h1>Heartline Healthcare LLP — AF Management</h1><h2>Complete patient data backup</h2><p>Generated: ${esc(new Date().toLocaleString())} · Records included: ${records.length}</p><p class="muted">This PDF is a readable backup copy. Use the JSON backup file to restore the app database.</p>${pages||'<p>No patient records are stored on this device.</p>'}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
function restoreFullBackup(obj) {
  if(obj?.format!=='HeartlineAFBackup'||![2,3].includes(Number(obj.version))||!Array.isArray(obj.records))throw new Error('This is not a valid Heartline AF full backup.');
  const backupIds=new Set();for(const r of obj.records){const check=AFManagementCore.validateRecord(r);if(!check.valid)throw new Error(`Backup contains an invalid patient record: ${check.reason}`);if(backupIds.has(r.id))throw new Error('Backup contains duplicate patient record IDs. Nothing was restored.');backupIds.add(r.id);}
  if(obj.staffProfiles!==undefined&&(!Array.isArray(obj.staffProfiles)||obj.staffProfiles.some(p=>!AFManagementCore.validateProfile(p).valid)))throw new Error('Backup contains invalid staff profiles.');
  if(obj.treatmentDrafts!==undefined&&!AFManagementCore.validateDraftMap(obj.treatmentDrafts))throw new Error('Backup contains invalid treatment drafts.');
  if(obj.weeklyBackupState!==undefined&&!AFManagementCore.validateWeeklyState(obj.weeklyBackupState))throw new Error('Backup contains invalid weekly backup metadata.');
  if(obj.wizardDrafts!==undefined&&!AFManagementCore.validateWizardDrafts(obj.wizardDrafts))throw new Error('Backup contains invalid wizard drafts.');
  if(obj.treatmentFavourites!==undefined&&!AFManagementCore.validateFavourites(obj.treatmentFavourites))throw new Error('Backup contains invalid favourite regimens.');
  if(obj.auditTrail!==undefined&&!AFManagementCore.validateAuditTrail(obj.auditTrail))throw new Error('Backup audit history is invalid.');
  const mode=$('restoreMode').value;
  if(mode==='replace') {
    if(!confirm(`Replace all ${records.length} records on this device with ${obj.records.length} records from the backup? This cannot be undone.`))return;
    records=JSON.parse(JSON.stringify(obj.records));
  } else {
    const result=mergeIncomingRecords(records,obj.records,'full-backup');records=result.records;
    if(result.skipped.length)alert(`${result.accepted.length} records imported. ${result.skipped.length} older, duplicate or declined records were not allowed to overwrite newer local records.`);
  }
  if(Array.isArray(obj.staffProfiles)) {
    if(mode==='replace') staffProfiles=JSON.parse(JSON.stringify(obj.staffProfiles));
    else {
      const byId=new Map(staffProfiles.map(s=>[s.id,s]));
      for(const incoming of obj.staffProfiles){const current=byId.get(incoming.id);if(!current){byId.set(incoming.id,incoming);continue;}const decision=AFManagementCore.compareProfileVersions(current,incoming);if(decision.decision==='newer')byId.set(incoming.id,incoming);else if(decision.decision==='legacy-confirm'||decision.decision==='conflict'){if(confirm(`A staff profile needs confirmation: ${incoming.name}. Replace the local profile status/details?`))byId.set(incoming.id,incoming);}}
      staffProfiles=[...byId.values()];
    }
    if(!saveStaffProfiles())throw new Error('Could not save restored staff profiles. Check device storage.');
  }
  if(obj.weeklyBackupState&&typeof obj.weeklyBackupState==='object') weeklyBackupState=mode==='replace'?JSON.parse(JSON.stringify(obj.weeklyBackupState)):{...weeklyBackupState,...JSON.parse(JSON.stringify(obj.weeklyBackupState))};
  if(obj.backedUpAt&&Number.isFinite(Date.parse(obj.backedUpAt))){const old=weeklyBackupState.doctor||{};const prior=Date.parse(old.lastBackupAt||'')||0;const incoming=Date.parse(obj.backedUpAt);if(incoming>prior)weeklyBackupState.doctor={...old,lastBackupAt:obj.backedUpAt,restoredFromBackup:true};}
  if(obj.treatmentDrafts&&typeof obj.treatmentDrafts==='object') treatmentDrafts=mode==='replace'?JSON.parse(JSON.stringify(obj.treatmentDrafts)):{...treatmentDrafts,...JSON.parse(JSON.stringify(obj.treatmentDrafts))};
  if(obj.treatmentFavourites&&Array.isArray(obj.treatmentFavourites)) treatmentFavourites=mode==='replace'?JSON.parse(JSON.stringify(obj.treatmentFavourites)):[...treatmentFavourites,...obj.treatmentFavourites.filter(f=>!treatmentFavourites.some(x=>String(x.name||'').toLowerCase()===String(f.name||'').toLowerCase()))];
  if(obj.wizardDrafts&&typeof obj.wizardDrafts==='object')wizardDrafts=mode==='replace'?JSON.parse(JSON.stringify(obj.wizardDrafts)):{...wizardDrafts,...obj.wizardDrafts};
  if(Array.isArray(obj.auditTrail)) auditTrail=mode==='replace'?JSON.parse(JSON.stringify(obj.auditTrail)):[...auditTrail,...obj.auditTrail];
  auditTrail.push({event:`Full backup restored (${mode})`,by:user.name,at:new Date().toISOString(),records:obj.records.length});
  if(!save())throw new Error('Backup data was prepared but could not be saved to this device. Check device storage and retry.');
  $('backupFile').value=''; tab('list'); $('recordDetail').innerHTML='';
  alert(`Backup restored. ${records.length} patient records are now stored on this device.`);
}

function doctorPanelHtml(r) {
  const v=doctorReviewValues(r);
  const showAfInstabilityQuestion=hasPotentialAfRelatedInstability(r.patient);
  return `<div class="doctor-panel" id="doctorPanel">
    <h4>Doctor decision panel</h4>
    <div class="grid">
      ${showAfInstabilityQuestion?`<label>Is haemodynamic instability attributable to AF?<select id="drAfInstability"><option value="unknown" ${v.afInstability==='unknown'?'selected':''}>Not yet assessed</option><option value="yes" ${v.afInstability==='yes'?'selected':''}>Yes — attributable to AF</option><option value="no" ${v.afInstability==='no'?'selected':''}>No — another cause</option></select></label>`:''}
      <label>Therapeutic anticoagulation ≥3 weeks with adherence confirmed?<select id="drPreOac"><option value="unknown" ${v.preOac==='unknown'?'selected':''}>Unknown / not confirmed</option><option value="yes" ${v.preOac==='yes'?'selected':''}>Yes</option><option value="no" ${v.preOac==='no'?'selected':''}>No</option></select></label>
      <label>TEE / TOE result<select id="drTee"><option value="notdone" ${v.tee==='notdone'?'selected':''}>Not done / not available</option><option value="clear" ${v.tee==='clear'?'selected':''}>No atrial thrombus detected</option><option value="thrombus" ${v.tee==='thrombus'?'selected':''}>Atrial thrombus detected</option><option value="indeterminate" ${v.tee==='indeterminate'?'selected':''}>Indeterminate</option></select></label>
      <label>Anticoagulant selected by doctor<select id="drAgent"><option value="none" ${v.agent==='none'?'selected':''}>Not selected</option><option value="apixaban" ${v.agent==='apixaban'?'selected':''}>Apixaban</option><option value="rivaroxaban" ${v.agent==='rivaroxaban'?'selected':''}>Rivaroxaban</option><option value="dabigatran" ${v.agent==='dabigatran'?'selected':''}>Dabigatran</option><option value="warfarin" ${v.agent==='warfarin'?'selected':''}>Warfarin</option><option value="acenocoumarol" ${v.agent==='acenocoumarol'?'selected':''}>Acitrom (acenocoumarol)</option><option value="ufh" ${v.agent==='ufh'?'selected':''}>IV Unfractionated heparin (UFH)</option><option value="enoxaparin" ${v.agent==='enoxaparin'?'selected':''}>Enoxaparin (Clexane)</option></select></label>
    </div>
    <div id="doctorDecisionOutput">${doctorDecisionHtml(r,v)}</div>
    <div class="actions"><button type="button" class="light" id="saveDoctorReview">Save doctor review inputs</button></div>
    ${renderTreatmentBuilder(r)}
  </div>`;
}
function renderDoctorPanel(r) {
  const host=$('doctorDecisionOutput');
  if (!host) return;
  const v={
    guideline:'esc',
    afInstability:$('drAfInstability')?.value || 'not-applicable',
    preOac:$('drPreOac').value,
    tee:$('drTee').value,
    agent:$('drAgent').value
  };
  host.innerHTML=doctorDecisionHtml(r,v);
}
function captureDoctorReview() {
  return {
    guideline:'esc',
    afInstability:$('drAfInstability')?.value || 'not-applicable',
    preOac:$('drPreOac').value,
    tee:$('drTee').value,
    agent:$('drAgent').value,
    reviewedBy:user.name,
    reviewedAt:new Date().toISOString()
  };
}
function bindDoctorPanel(r) {
  bindTreatmentBuilder(r);
  ['drAfInstability','drPreOac','drTee','drAgent'].forEach(id => {
    $(id)?.addEventListener('change',()=>renderDoctorPanel(r));
  });
  $('saveDoctorReview')?.addEventListener('click',()=>{
    const reviewAt=new Date().toISOString();const nextReview=captureDoctorReview();const priorReview=r.doctorReview||{};
    const decisionFields=['afInstability','preOac','tee','agent'];
    const decisionChanged=decisionFields.some(key=>(priorReview[key]||'')!==(nextReview[key]||''));
    if(decisionChanged)invalidateApprovedPlanAfterClinicalEdit(r,reviewAt);
    r.doctorReview=nextReview;bumpRecordRevision(r,reviewAt);
    r.history=r.history||[];
    r.history.push({event:'Doctor decision inputs saved',by:user.name,at:r.updatedAt});
    if(!save())return;
    openRecord(r.id);
  });
}
function advice(p) {
  const s=score(p), h=hemodynamicScreen(p), a=[];
  if(hasPotentialAfRelatedInstability(p)) a.push('URGENT CLINICAL INSTABILITY SCREEN: '+h.label+'. The doctor must assess whether instability is attributable to AF. If confirmed, immediate synchronized electrical cardioversion may be required; do not delay for anticoagulation or TEE.');
  else if(h.hypoxaemiaRed) a.push('CRITICAL LOW OXYGEN SATURATION: urgent respiratory assessment and treatment of the underlying cause are required. Low SpO₂ alone does not establish AF-related haemodynamic instability.');
  else if(h.level==='red') a.push('URGENT SCREEN ALERT: '+h.label+'. Complete immediate bedside assessment and determine the cause.');
  else if(h.level==='amber') a.push('CAUTION: Borderline observations. Repeat and review clinically.');
  else if(h.level==='green') a.push('No predefined vital-sign red flags; bedside stability assessment remains essential.');
  else a.push('Haemodynamic screen incomplete; do not infer stability.');
  if(p.wpw!=='no') a.push('Possible/uncertain pre-excitation: urgent expert ECG review. Avoid AV-nodal blockers and IV amiodarone in pre-excited AF.');
  if(p.qrs==='Wide') a.push('Wide QRS: urgent ECG/clinical review before selecting rate-control medication.');
  a.push(`CHA₂DS₂-VA ${s.complete?'':'at least '}${s.va}; CHA₂DS₂-VASc ${s.complete?'':'at least '}${s.vasc}. Age ${p.age||'not entered'} years → ${s.ageBand} (${s.agePoints} point(s)); sex ${p.sex||'not specified'} ${s.female?'adds 1 point to CHA₂DS₂-VASc only':'does not add a sex point'}.`);
  if(!s.complete) a.push('Score incomplete: confirm '+s.unknownCriteria.join(', ')+'. Unknown risk factors are not treated as No; do not use this provisional score as a final anticoagulation decision.');
  return {s,a,urgent:h.level==='red'||p.wpw!=='no'||p.qrs==='Wide'};
}
function wizardPageIsValid(step) {
  const page=$(`wizardPage${step}`); if(!page)return true;
  const fields=[...page.querySelectorAll('input[required],select[required],textarea[required]')];
  return fields.every(el=>el.checkValidity());
}
function updateWizardControls() {
  const page=$(`wizardPage${wizardCurrentStep}`);
  const back=$('wizardBack'), next=$('wizardNext'), msg=$('wizardValidationMessage');
  if(!page)return;
  const valid=wizardPageIsValid(wizardCurrentStep);
  if(back)back.disabled=wizardCurrentStep===1;
  if(next){next.classList.toggle('hidden',wizardCurrentStep===4);next.disabled=!valid;}
  if(msg){msg.classList.toggle('hidden',valid||wizardCurrentStep===4);msg.textContent='कृपया इस पेज के सभी जरूरी fields भरें। उसके बाद ही Next खुलेगा।';}
  for(let i=1;i<=4;i++)$(`wizardPage${i}`)?.classList.toggle('hidden',i!==wizardCurrentStep);
  const title=$('wizardStepTitle'),count=$('wizardStepCount'),hint=$('wizardStepHint'),fill=$('wizardProgressFill');
  const doctorEditing=user.role==='doctor'&&!!editingRecordId;
  if(title)title.textContent=`Step ${wizardCurrentStep} — ${doctorEditing&&wizardCurrentStep===4?'Review patient changes':WIZARD_STEP_TITLES[wizardCurrentStep-1]}`;
  if(count)count.textContent=`${wizardCurrentStep} of 4`;
  if(hint)hint.textContent=doctorEditing&&wizardCurrentStep===4?'Review the updated patient details before saving your changes.':WIZARD_STEP_HINTS[wizardCurrentStep-1];
  const modeLabel=$('wizardModeLabel'); if(modeLabel)modeLabel.textContent=doctorEditing?'DOCTOR PATIENT RECORD EDIT':'STAFF PATIENT ENTRY';
  if(fill)fill.style.width=`${wizardCurrentStep*25}%`;
  if(wizardCurrentStep===3)renderRiskScoreSummary();
  if(wizardCurrentStep===4)renderWizardFinalPage();
}
function setWizardStep(step) {
  wizardCurrentStep=Math.max(1,Math.min(4,step));
  updateWizardControls();
  if(user.role==='staff')saveWizardDraft();
  const formTop=$('wizardHeader'); if(formTop)formTop.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderRiskScoreSummary() {
  const host=$('riskScoreLive'); if(!host)return;
  const s=score(collect());
  host.innerHTML=`<b>CHA₂DS₂-VA / CHA₂DS₂-VASc score</b><div class="risk-score-values"><div><small>CHA₂DS₂-VA</small><strong>${s.complete?'': '≥ '}${s.va}</strong></div><div><small>CHA₂DS₂-VASc</small><strong>${s.complete?'': '≥ '}${s.vasc}</strong></div></div>${s.complete?'<p>Risk-factor inputs are complete. Doctor will review the score and clinical context.</p>':`<p class="score-warning">Provisional score only. Please confirm: ${esc(s.unknownCriteria.join(', '))}. Unknown values are not assumed to be No.</p>`}`;
}
function renderWizardFinalPage() {
  const p=collect(),s=score(p),host=$('wizardFinalReview');
  if(host)host.innerHTML=`<h4>Final patient-entry review</h4><div class="wizard-review-grid"><div><small>Patient</small><b>${esc(p.pName||'—')} · ${esc(p.age||'—')} · ${esc(p.sex||'—')}</b></div><div><small>Vitals</small><b>HR ${esc(p.hr||'—')} · BP ${esc(p.sbp||'—')}/${esc(p.dbp||'—')} · SpO₂ ${esc(p.spo2||'—')}%</b></div><div><small>AF episode</small><b>${esc(durationLabel(p.duration))} · ${esc(p.reliability||'—')}</b></div><div><small>Stroke risk</small><b>CHA₂DS₂-VA ${s.complete?'':'at least '}${s.va} · CHA₂DS₂-VASc ${s.complete?'':'at least '}${s.vasc}</b></div></div>${!s.complete?`<p class="score-warning">Risk history incomplete: ${esc(s.unknownCriteria.join(', '))}. The doctor will need to confirm these answers.</p>`:''}`;
  const res=$('result');
  if(res&&user.role==='staff') {res.classList.remove('hidden');res.className='result';res.innerHTML=staffAssessmentHtml(p);}
  if(user.role==='staff')renderStaffLiveGuidance();
}
function validateAllWizardPages() {
  for(let step=1;step<=4;step++) {
    const page=$(`wizardPage${step}`); if(!page)continue;
    const field=[...page.querySelectorAll('input[required],select[required],textarea[required]')].find(el=>!el.checkValidity());
    if(field){setWizardStep(step);field.reportValidity();return false;}
  }
  return true;
}
function tab(t) {
  if(backupLockActive&&t!=='transfer')return;
  ['list','form','transfer','staffAdmin'].forEach(x=>$(x).classList.toggle('hidden',x!==t));
  if(user.role==='doctor') document.querySelector('[data-tab="form"]').classList.toggle('hidden',!(t==='form'&&editingRecordId));
  if(user.role==='staff'&&editingRecordId)document.querySelector('[data-tab="form"]').classList.remove('hidden');
  if(user.role!=='doctor'&&t==='staffAdmin')return tab('list');
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active-tab',b.dataset.tab===t));
  if(t==='staffAdmin')renderStaffProfiles();
  if(t==='transfer')renderBackupMeta();
}
function render() {
  const shownRecords=visibleRecords();
  const pending=shownRecords.filter(r=>r.status==='Pending review').length;
  const approved=shownRecords.filter(r=>r.status==='Approved').length;
  $('stats').textContent=`${pending} pending review · ${approved} approved · ${shownRecords.length} total`;
  $('records').innerHTML=shownRecords.slice().reverse().map(r=>`<div class="patient">
    <div><b>${esc(r.patient.pName || 'Unnamed patient')}</b><br><small>${esc(formatRecordId(r.id))} · ${esc(r.status || 'Imported')} · ${esc(recordOwner(r) || 'Staff')}</small></div>
    <button class="light" type="button" data-id="${esc(r.id)}">Open patient</button>
  </div>`).join('') || (user.role==='doctor'
    ? '<div class="empty-records"><b>No patient records on this device.</b><p>Staff records do not sync automatically. Import the TXT transfer file received from staff to view the patient here.</p><button class="light" id="openImport" type="button">Import staff patient file</button></div>'
    : '<p class="hint">No patient records entered by your staff account yet. Create a new assessment to begin.</p>');
  $('choose').innerHTML=shownRecords.map(r=>`<option value="${esc(r.id)}">${esc(r.patient.pName || 'Unnamed patient')} · ${esc(formatRecordId(r.id))}</option>`).join('');
  $('doctorBackup').classList.toggle('hidden',user.role!=='doctor');
  $('staffBackupPanel').classList.toggle('hidden',user.role!=='staff');
  $('staffAdminTab').classList.toggle('hidden',user.role!=='doctor');
  if(user.role==='doctor')renderStaffProfiles();
  if(user.role==='doctor') {
    document.querySelector('[data-tab="form"]').classList.toggle('hidden',!editingRecordId);
    $('new').classList.add('hidden');
  } else {
    document.querySelector('[data-tab="form"]').classList.remove('hidden');
    $('new').classList.remove('hidden');
  }
}
function fillPatientForm(p) {
  ids.forEach(k=>{ if($(k)) $(k).value=p[k]??''; });
  document.querySelectorAll('[name=inst]').forEach(el=>el.checked=(p.instability||[]).includes(el.value));
  updateAutoScore(); updateHemoScreen();
}
function startEditRecord(id) {
  const r=records.find(x=>x.id===id);if(!r)return;
  const doctorCanEdit=user.role==='doctor';const staffCanEdit=user.role==='staff'&&canAccessRecord(r)&&r.status==='Pending review';
  if(!doctorCanEdit&&!staffCanEdit)return alert('Only Doctor Mode can edit approved records. Staff may correct their own pending entries.');
  editingRecordId=id; fillPatientForm(r.patient); setWizardStep(1);
  $('formTitle').textContent=`Edit patient: ${r.patient.pName||''}`;
  $('submitPatient').textContent=doctorCanEdit?'Save patient changes':'Save corrected pending entry'; $('cancelEdit').classList.remove('hidden');
  document.querySelector('[data-tab="form"]').classList.remove('hidden'); tab('form');
}
function cancelPatientEdit() {
  editingRecordId=null; if(user.role==='staff')clearWizardDraft(); $('patientForm').reset(); setWizardStep(1); updateAutoScore(); updateHemoScreen();
  $('formTitle').textContent='Patient assessment'; $('submitPatient').textContent='Submit for doctor review'; $('cancelEdit').classList.add('hidden');
  tab('list');
}
function exportableRecord(r) {
  return JSON.parse(JSON.stringify(r));
}
async function buildPatientTransferText(payload) {
  const r=payload.record||{},p=r.patient||{};
  const orders=(r.treatmentOrders||[]).map((o,i)=>`${i+1}. ${o.item||'Order'} — ${orderText(o)}`).join('\n')||'No approved treatment orders attached.';
  const lines=[
    'HEARTLINE HEALTHCARE LLP — AF MANAGEMENT',
    'PATIENT TRANSFER FILE (PLAIN TEXT)',
    'Keep the complete file intact when sharing through WhatsApp.',
    '',
    `Transfer type: ${payload.transferType||'patient-handover'}`,
    `Patient: ${p.pName||'Not entered'}`,
    `Record ID: ${formatRecordId(r.id)}`,
    `UHID: ${p.uhid||'Not entered'}`,
    `Age / Sex: ${p.age??'—'} / ${p.sex||'—'}`,
    `Heart rate: ${p.hr||'—'} bpm`,
    `Blood pressure: ${p.sbp||'—'} / ${p.dbp||'—'} mmHg`,
    `SpO2: ${p.spo2||'—'}%`,
    `AF duration: ${durationLabel(p.duration)}`,
    `Entered by: ${recordOwner(r)||'Not recorded'}`,
    `Record status: ${r.status||'Not recorded'}`,
    `Approved by: ${r.approvedBy||'Not approved'}`,
    '',
    'DOCTOR-APPROVED TREATMENT ORDERS',
    orders,
    '',
    'Plan summary:',
    r.plan||'No separate plan summary recorded.',
    '',
    'IMPORT INSTRUCTIONS:',
    'Open AF Management → Patient transfer → Import received file → choose this TXT file → Import patient / treatment file.',
    'The application reads the structured transfer section below. Do not delete or edit that section.',
    '',
    '--- BEGIN HEARTLINE STRUCTURED TRANSFER DATA V2 ---',
    await encodeTransferPayload(payload),
    '--- END HEARTLINE STRUCTURED TRANSFER DATA V2 ---',
    ''
  ];
  return lines.join('\n');
}
async function parsePatientTransferFile(file) {
  const content=await file.text();
  if(file.name.toLowerCase().endsWith('.json') || content.trimStart().startsWith('{')) return JSON.parse(content);
  const v2=content.indexOf('--- BEGIN HEARTLINE STRUCTURED TRANSFER DATA V2 ---');const v1=content.indexOf('--- BEGIN HEARTLINE STRUCTURED TRANSFER DATA V1 ---');const start=v2>=0?v2:v1;const marker=v2>=0?'--- BEGIN HEARTLINE STRUCTURED TRANSFER DATA V2 ---':'--- BEGIN HEARTLINE STRUCTURED TRANSFER DATA V1 ---';const endMarker=v2>=0?'--- END HEARTLINE STRUCTURED TRANSFER DATA V2 ---':'--- END HEARTLINE STRUCTURED TRANSFER DATA V1 ---';if(start<0)throw new Error('This TXT file does not contain a valid Heartline patient transfer section.');const end=content.indexOf(endMarker,start+marker.length);if(end<0)throw new Error('Transfer section is incomplete or truncated.');return await decodeTransferPayload(content.slice(start+marker.length,end),v2>=0);
}
async function exportR(r) {
  try{const payload={format:'HeartlineAFTransfer',version:2,transferType:'patient-handover',record:exportableRecord(r)};const content=await buildPatientTransferText(payload);downloadBlob(`${formatRecordId(r.id)}_Patient_Transfer_${uniqueFileStamp()}.txt`,content,'text/plain;charset=utf-8');}catch(error){alert(`Patient transfer file could not be generated: ${error.message||error}`);}
}

function setShareStatus(targetId,message,whatsappUrl='') {
  const host=$(targetId);
  if(!host)return;
  host.classList.remove('hidden');
  host.innerHTML=`${esc(message)}${whatsappUrl?` <a href="${esc(whatsappUrl)}" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>`:''}`;
}
async function sharePatientViaWhatsApp(r,transferType,statusId) {
  if(!r||!r.patient)return alert('Patient record is not available.');
  if(transferType==='doctor-approved-plan'&&(user.role!=='doctor'||r.status!=='Approved'))return alert('Only an approved doctor plan can be shared from Doctor Mode.');
  if(transferType==='patient-handover'&&!canAccessRecord(r))return alert('You do not have access to this patient record.');
  const payload={format:'HeartlineAFTransfer',version:2,transferType,record:JSON.parse(JSON.stringify(r))};
  const filename=transferType==='doctor-approved-plan'
    ? `${formatRecordId(r.id)}_Doctor_Approved_Plan.txt`
    : `${formatRecordId(r.id)}_Patient_Handover.txt`;
  let textFile;try{textFile=await buildPatientTransferText(payload);}catch(error){return alert(`Patient transfer file could not be generated: ${error.message||error}`);}
  const p=r.patient;
  let msg='';
  if(transferType==='doctor-approved-plan') {
    msg=`Doctor-approved AF treatment update
Record ID: ${formatRecordId(r.id)}
Plan revision: ${r.planRevision||1}
Approved: ${r.approvedAt||'See attached file'}

Please import the attached TXT file in AF Management → Patient transfer. The attachment contains the complete structured update.`;
  } else {
    msg=`AF patient handover for doctor review
Record ID: ${formatRecordId(r.id)}
Record revision: ${r.revision||1}

Please import the attached TXT file in AF Management → Patient transfer. The attachment contains the patient assessment.`;
  }
  const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const waUrl=(isMobile?'https://wa.me/?text=':'https://web.whatsapp.com/send?text=')+encodeURIComponent(msg);
  try {
    const file=new File([textFile],filename,{type:'text/plain'});
    const fileShareSupported=typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]});
    if(fileShareSupported) {
      navigator.share({title:transferType==='doctor-approved-plan'?'Doctor-approved AF treatment plan':'AF patient handover',text:msg,files:[file]})
        .then(()=>setShareStatus(statusId,'Share menu opened. Choose WhatsApp and the intended doctor/staff chat. The TXT transfer file is attached to the share action.'))
        .catch(err=>{
          if(err?.name==='AbortError') { setShareStatus(statusId,'Sharing was cancelled. No file was sent. You can try again.'); return; }
          downloadBlob(filename,textFile,'text/plain;charset=utf-8');
          setShareStatus(statusId,`TXT transfer file downloaded (${filename}). Open WhatsApp and attach it as a Document.`,waUrl);
        });
      setShareStatus(statusId,'Choose WhatsApp in the share menu, then select the intended recipient.');
      return;
    }
  } catch(e) { /* Fall back to download + WhatsApp Web. */ }
  downloadBlob(filename,textFile,'text/plain;charset=utf-8');
  const waWindow=window.open(waUrl,'_blank');
  const instruction=`TXT transfer file downloaded (${filename}). ${waWindow?'WhatsApp opened in a new tab.':'Open WhatsApp using the link below.'} Select the intended chat, click the paperclip / +, choose Document, attach the TXT file from Downloads, and press Send.`;
  setShareStatus(statusId,instruction,waWindow?'':waUrl);
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
  if(!r || !canAccessRecord(r)) { if($('recordDetail')) $('recordDetail').innerHTML=''; return alert('You can only open patient records entered by your staff account.'); }
  activeRecordId=id;
  const detailHost=$('recordDetail'); if(!detailHost)return;
  const d=advice(r.patient);
  const act=user.role==='doctor'
    ? `<div class="actions doctor-record-actions"><button type="button" id="approve">${r.status==='Approved'?'Update & approve treatment plan':'Approve treatment plan'}</button><button type="button" class="light" id="sendStaffPlan" ${r.status==='Approved'?'':'disabled'}>Share approved plan via WhatsApp</button><button type="button" class="light" id="editPatient">Edit patient record</button><button type="button" class="danger-button" id="deletePatient">Delete patient record</button></div>`
    : r.status==='Pending review'?'<button class="light" id="editPatient">Edit my pending entry</button>':r.status==='Approved'?'<button class="light" id="correction">Request correction</button>':'';
  const staffBlock=user.role==='staff'?staffAssessmentHtml(r.patient):
    `<h4>Initial clinical data</h4><p>CHA₂DS₂-VA: ${d.s.va} · CHA₂DS₂-VASc: ${d.s.vasc}</p><p>Automatic screen: ${esc(hemodynamicScreen(r.patient).label)}</p>`;
  const doctorBlock=user.role==='doctor'?doctorPanelHtml(r):'';
  const planBlock=user.role==='doctor'&&r.plan?`<section class="staff-order-summary"><h4>${r.status==='Approved'?'Currently approved treatment plan':'Previous treatment plan — needs re-approval'}</h4><p>${esc(r.plan).replace(/\n/g,'<br>')}</p><small>Plan revision ${r.planRevision||1} · Approved by ${esc(r.approvedBy||'')} · ${r.approvedAt?new Date(r.approvedAt).toLocaleString():''}</small></section>`:
    user.role==='staff'&&r.status==='Approved'?`<p><b>Plan revision ${r.planRevision||1}</b> · Approved ${r.approvedAt?new Date(r.approvedAt).toLocaleString():'time not recorded'}</p>${staffApprovedOrdersHtml(r)}${staffApprovedWorkflowHtml(r)}`:
    user.role==='staff'&&r.status==='Needs re-approval'?'<section class="alert-warning"><b>Doctor review required:</b> Patient details changed after the previous approval. Do not follow the previous treatment plan. Contact the doctor for an updated plan.</section>':'';
  detailHost.innerHTML=`<div class="card" data-record-detail>
    <h3>${esc(r.patient.pName)} — ${esc(r.status)}</h3>
    <p><b>Internal record ID:</b> ${esc(formatRecordId(r.id))} · <b>UHID:</b> ${esc(r.patient.uhid||'Not entered')}</p>
    <p>Age ${esc(r.patient.age)} · ${esc(r.patient.sex)} · HR ${esc(r.patient.hr||'—')} · BP ${esc(r.patient.sbp||'—')}/${esc(r.patient.dbp||'—')} · SpO₂ ${esc(r.patient.spo2||'—')} · AF duration ${esc(durationLabel(r.patient.duration))}</p>
    ${staffBlock}${doctorBlock}${planBlock}
    ${r.correction&&user.role==='doctor'?`<p>Correction request (${esc(r.correction.status)}): ${esc(r.correction.reason)}</p>`:''}
    ${act}<button class="light" id="oneExport" type="button">Download patient transfer · TXT</button>
    <p class="share-status hidden" id="recordShareStatus" aria-live="polite"></p>
  </div>`;
  if(user.role==='doctor') bindDoctorPanel(r);
  $('saveStaffChecklist')?.addEventListener('click',()=>{
    if(user.role!=='staff'||r.status!=='Approved')return;
    r.staffChecklistDone=[...document.querySelectorAll('[data-checklist-record] input[data-task]:checked')].map(x=>Number(x.dataset.task));
    r.history=r.history||[];const revisionAt=new Date().toISOString();bumpRecordRevision(r,revisionAt);
    r.history.push({event:'Staff preparation checklist updated',by:user.name,at:r.updatedAt,completed:r.staffChecklistDone.length});
    save();openRecord(r.id);
  });
  $('approve')?.addEventListener('click',()=>{
    if(user.role!=='doctor')return;
    const orders=getOrderDraft(r);
    if(!orders.length)return alert('Add at least one treatment order before approval.');
    const review=captureDoctorReview();
    const approvedAt=new Date().toISOString();
    r.approvedPathway=$('tbPathway').value;
    r.treatmentOrders=JSON.parse(JSON.stringify(orders));
    r.plan=generatePlanText(orders);
    r.doctorReview=review;r.status='Approved';r.planNeedsReapproval=false;r.approvedBy=DEFAULT_DOCTOR_NAME;
    bumpRecordRevision(r,approvedAt);r.planRevision=Math.max(0,Number(r.planRevision)||0)+1;r.approvedRevision=r.revision;r.approvedAt=approvedAt;
    r.history=r.history||[];r.history.push({event:'Doctor approved / updated treatment plan',by:DEFAULT_DOCTOR_NAME,at:approvedAt,orders:orders.length});
    auditTrail.push({event:'Treatment plan approved / updated',recordId:r.id,by:DEFAULT_DOCTOR_NAME,at:approvedAt,orders:orders.length});
    save();openRecord(r.id);
    alert('Treatment plan approved and saved. Use “Share approved plan via WhatsApp” to send the TXT transfer file to the responsible staff member.');
  });
  $('sendStaffPlan')?.addEventListener('click',()=>{
    if(user.role!=='doctor'||r.status!=='Approved')return;
    sharePatientViaWhatsApp(r,'doctor-approved-plan','recordShareStatus');
  });
  $('editPatient')?.addEventListener('click',()=>startEditRecord(r.id));
  $('deletePatient')?.addEventListener('click',()=>{
    if(user.role!=='doctor')return;
    if(!confirm(`Permanently delete the record for ${r.patient.pName||'this patient'}? This cannot be undone unless you have a backup.`))return;
    const at=new Date().toISOString();
    auditTrail.push({event:'Patient record deleted',recordId:r.id,by:DEFAULT_DOCTOR_NAME,at});
    records=records.filter(x=>x.id!==r.id); delete treatmentDrafts[r.id]; persistTreatmentDrafts(); activeRecordId=null;
    save();detailHost.innerHTML='';tab('list');alert('Patient record deleted. Keep regular full backups.');
  });
  $('correction')?.addEventListener('click',()=>{
    const reason=prompt('Describe correction requested; do not overwrite approved data.'); if(!reason)return;
    r.correction={reason,status:'Requested',by:user.name,at:new Date().toISOString()};
    bumpRecordRevision(r,r.correction.at);r.history=r.history||[];r.history.push({event:'Correction requested',by:user.name,at:r.correction.at});if(!save())return;openRecord(r.id);
  });
  $('oneExport').onclick=()=>exportR(r);
}


function makeStaffId(){const d=new Date(),date=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');return `STF-${date}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;}
async function staffProfileText(profile){
  const payload={format:'HeartlineStaffProfile',version:2,profile};
  return ['HEARTLINE HEALTHCARE LLP — AF MANAGEMENT','STAFF PROFILE INVITATION','Import this file once on the staff member’s device.','',`Staff name: ${profile.name}`,`Staff ID: ${profile.id}`,`Profile revision: ${profile.revision||1}`,`Updated: ${profile.updatedAt||profile.createdAt||''}`,`Assigned by: ${profile.assignedBy||DEFAULT_DOCTOR_NAME}`,`Profile status: ${profile.active===false?'INACTIVE':'ACTIVE'}`,'','--- BEGIN HEARTLINE STAFF PROFILE DATA V2 ---',await encodeTransferPayload(payload),'--- END HEARTLINE STAFF PROFILE DATA V2 ---',''].join('\n');
}
async function parseStructuredSection(content,begin,end){const start=content.indexOf(begin);if(start<0)throw new Error('Structured data section is missing or damaged.');const bodyStart=start+begin.length;const stop=content.indexOf(end,bodyStart);if(stop<0)throw new Error('Structured data section is incomplete or truncated.');return await decodeTransferPayload(content.slice(bodyStart,stop),begin.includes('V2'));}
async function downloadStaffProfile(profile){const filename=`Heartline_Staff_Profile_${profile.name.replace(/[^a-z0-9]+/gi,'_')}_${profile.id}_${uniqueFileStamp()}.txt`;downloadBlob(filename,await staffProfileText(profile),'text/plain;charset=utf-8');return filename;}
function openWhatsAppMessage(message){const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);const url=(isMobile?'https://wa.me/?text=':'https://web.whatsapp.com/send?text=')+encodeURIComponent(message);return window.open(url,'_blank');}
async function shareStaffProfile(profile){
  if(user.role!=='doctor')return alert('Only Doctor Mode can create and share staff profiles.');
  const filename=`Heartline_Staff_Profile_${profile.name.replace(/[^a-z0-9]+/gi,'_')}_${profile.id}.txt`;
  let content;try{content=await staffProfileText(profile);}catch(error){return alert(`Staff profile file could not be generated: ${error.message||error}`);}const message=`AF Management staff profile\nName: ${profile.name}\nStaff ID: ${profile.id}\n\nPlease download the attached TXT file. Open AF Management, choose Staff, import this profile file, then select your profile to continue.`;
  try{const file=new File([content],filename,{type:'text/plain'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:'AF Management staff profile',text:message,files:[file]});return;}}catch(e){if(e?.name==='AbortError')return;}
  downloadBlob(filename,content,'text/plain;charset=utf-8');const opened=openWhatsAppMessage(message);setShareStatus('staffProfileShareStatus',`Profile file downloaded (${filename}). ${opened?'WhatsApp opened.':'Open WhatsApp using the browser.'} Select the staff chat and attach this TXT file as a Document.`,opened?'':'https://web.whatsapp.com/');
}
function renderStaffProfiles(){
  const host=$('staffProfilesList');if(!host)return;
  if(!staffProfiles.length){host.innerHTML='<p class="hint">No staff profiles created yet.</p>';return;}
  host.innerHTML=staffProfiles.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<div class="staff-profile-row"><div><b>${esc(p.name)}</b><small>${esc(p.id)} · ${p.active===false?'Inactive':'Active'}</small></div><div class="staff-profile-actions"><button class="light" type="button" data-share-staff="${esc(p.id)}">Share profile</button><button class="${p.active===false?'light':'danger-button'}" type="button" data-toggle-staff="${esc(p.id)}">${p.active===false?'Reactivate':'Deactivate'}</button></div></div>`).join('');
  host.querySelectorAll('[data-share-staff]').forEach(b=>b.addEventListener('click',()=>{const p=staffProfiles.find(x=>x.id===b.dataset.shareStaff);if(p)shareStaffProfile(p);}));
  host.querySelectorAll('[data-toggle-staff]').forEach(b=>b.addEventListener('click',()=>{const p=staffProfiles.find(x=>x.id===b.dataset.toggleStaff);if(!p)return;const next=p.active===false;if(!next&&!confirm(`Deactivate ${p.name}? They will need an updated inactive profile file on their device for this change to take effect there.`))return;p.active=next;p.revision=Math.max(0,Number(p.revision)||0)+1;p.updatedAt=new Date().toISOString();saveStaffProfiles();renderStaffProfiles();shareStaffProfile(p);}));
}
function refreshStaffLoginOptions(){
  const select=$('staffProfileSelect');if(!select)return;
  const active=staffProfiles.filter(p=>p.active!==false);
  select.innerHTML=active.length?'<option value="">Select your profile</option>'+active.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.id)}</option>`).join(''):'<option value="">No active staff profile imported</option>';
  $('staffLoginHint').textContent=active.length?'Select your profile. If this is a new device, import your staff profile or full staff backup first.':'Your doctor will share your staff profile file through WhatsApp. Download it and import it here before continuing.';
}
async function importStaffSetupFile(file,fromLogin=false,expectedStaffId=""){
  if(!file)throw new Error('Choose a staff profile invitation or staff backup TXT file.');
  const text=await file.text();
  let obj;
  if(file.name.toLowerCase().endsWith('.json')||text.trimStart().startsWith('{')) obj=JSON.parse(text);
  else if(text.includes('BEGIN HEARTLINE STAFF PROFILE DATA V2')) obj=await parseStructuredSection(text,'--- BEGIN HEARTLINE STAFF PROFILE DATA V2 ---','--- END HEARTLINE STAFF PROFILE DATA V2 ---');
  else if(text.includes('BEGIN HEARTLINE STAFF PROFILE DATA V1')) obj=await parseStructuredSection(text,'--- BEGIN HEARTLINE STAFF PROFILE DATA V1 ---','--- END HEARTLINE STAFF PROFILE DATA V1 ---');
  else if(text.includes('BEGIN HEARTLINE STAFF BACKUP DATA V2')) obj=await parseStructuredSection(text,'--- BEGIN HEARTLINE STAFF BACKUP DATA V2 ---','--- END HEARTLINE STAFF BACKUP DATA V2 ---');
  else if(text.includes('BEGIN HEARTLINE STAFF BACKUP DATA V1')) obj=await parseStructuredSection(text,'--- BEGIN HEARTLINE STAFF BACKUP DATA V1 ---','--- END HEARTLINE STAFF BACKUP DATA V1 ---');
  else throw new Error('This file is not a supported staff profile or staff backup.');
  if(obj.format==='HeartlineStaffProfile'&&[1,2].includes(Number(obj.version))&&obj.profile?.id&&obj.profile?.name){
    const profile={...obj.profile};const profileCheck=AFManagementCore.validateProfile(profile);if(!profileCheck.valid)throw new Error(`Invalid staff profile: ${profileCheck.reason}`);const ix=staffProfiles.findIndex(x=>x.id===profile.id);const local=ix>=0?staffProfiles[ix]:null;
    if(local){const decision=AFManagementCore.compareProfileVersions(local,profile);if(decision.decision==='stale')throw new Error('This staff profile file is older than the profile already on this device. It cannot replace the newer local profile.');if(decision.decision==='same'){if(local.active===false)throw new Error('This staff profile is locally marked inactive. Contact the doctor for an updated profile.');profile.active=local.active;staffProfiles[ix]=local;}else{if(decision.decision==='legacy-confirm'||decision.decision==='conflict'){if(!confirm(`This profile file has no reliable revision history (${decision.reason}). Replace the local profile ${local.name}?`))throw new Error('Profile update cancelled.');}staffProfiles[ix]=profile;}}else staffProfiles.push(profile);
    if(!saveStaffProfiles())throw new Error('Could not save this staff profile on the device. Check available storage.');refreshStaffLoginOptions();$('staffProfileSelect').value=profile.active===false?'':profile.id;
    if(profile.active===false)throw new Error('This staff profile is marked inactive. Please contact the doctor.');
    if(fromLogin)alert(`Profile imported: ${profile.name}. Select the profile and Continue.`);
    return {type:'profile',profile};
  }
  if(obj.format==='HeartlineStaffBackup'&&[1,2].includes(Number(obj.version))&&obj.staffProfile?.id&&Array.isArray(obj.records)){
    if(expectedStaffId&&obj.staffProfile.id!==expectedStaffId)throw new Error('This backup belongs to a different staff profile. Restore only your own backup.');
    const profileCheck=AFManagementCore.validateProfile(obj.staffProfile);if(!profileCheck.valid)throw new Error(`Staff backup profile is invalid: ${profileCheck.reason}`);
    const seenIds=new Set();for(const r of obj.records){const check=AFManagementCore.validateRecord(r);if(!check.valid)throw new Error(`Staff backup contains an invalid record: ${check.reason}`);if(seenIds.has(r.id))throw new Error('Staff backup contains duplicate record IDs.');seenIds.add(r.id);if(r.enteredById&&r.enteredById!==obj.staffProfile.id)throw new Error('Staff backup contains a record owned by a different staff profile. Nothing was restored.');}
    if(obj.treatmentDrafts!==undefined&&!AFManagementCore.validateDraftMap(obj.treatmentDrafts))throw new Error('Staff backup contains invalid treatment drafts.');
    if(obj.entryDraft!==undefined&&!AFManagementCore.validateWizardDraft(obj.entryDraft))throw new Error('Staff backup contains an invalid patient-entry draft.');
    if(obj.auditTrail!==undefined&&!AFManagementCore.validateAuditTrail(obj.auditTrail))throw new Error('Staff backup contains invalid audit history.');
    if(obj.weeklyBackupState!==undefined&&!AFManagementCore.validateWeeklyState(obj.weeklyBackupState))throw new Error('Staff backup contains invalid backup metadata.');
    const profile={...obj.staffProfile};const ix=staffProfiles.findIndex(x=>x.id===profile.id);const local=ix>=0?staffProfiles[ix]:null;
    if(local){const decision=AFManagementCore.compareProfileVersions(local,profile);if(decision.decision==='stale')throw new Error('This staff backup contains an older profile and cannot overwrite the newer local profile.');if(decision.decision==='same'){profile.active=local.active;staffProfiles[ix]=local;}else{if(decision.decision==='legacy-confirm'||decision.decision==='conflict'){if(!confirm(`This staff backup profile has incomplete revision data. Replace the local profile ${local.name}?`))throw new Error('Staff profile restore cancelled.');}staffProfiles[ix]=profile;}}else staffProfiles.push(profile);
    if(profile.active===false)throw new Error('This backup belongs to a staff profile marked inactive. Contact the doctor before restoring.');
    const merge=mergeIncomingRecords(records,obj.records,'staff-backup');records=merge.records;
    if(obj.treatmentDrafts&&typeof obj.treatmentDrafts==='object')treatmentDrafts={...treatmentDrafts,...obj.treatmentDrafts};
    if(obj.entryDraft){wizardDrafts[`staff:${profile.id}`]=obj.entryDraft;persistWizardDrafts();}
    if(Array.isArray(obj.auditTrail))auditTrail=[...auditTrail,...obj.auditTrail];
    if(!saveStaffProfiles()||!save())throw new Error('Could not save restored staff data. Check device storage.');
    weeklyBackupState[`staff:${profile.id}`]={lastBackupAt:obj.backedUpAt||null,restoredAt:new Date().toISOString()};saveWeeklyBackupState();
    refreshStaffLoginOptions();$('staffProfileSelect').value=profile.id;
    if(fromLogin)alert(`Staff backup restored for ${profile.name}: ${obj.records.length} patient records imported. Select the profile and Continue.`);
    return {type:'backup',profile,records:obj.records.length};
  }
  throw new Error('Unsupported staff setup file.');
}
function makeStaffBackup(){
  if(user.role!=='staff'||!user.staffProfile)throw new Error('Staff profile is not available.');
  const own=records.filter(canAccessRecord);const ownIds=new Set(own.map(r=>r.id));
  const ownDrafts={};ownIds.forEach(id=>{if(treatmentDrafts[id])ownDrafts[id]=treatmentDrafts[id];});
  const ownAudit=auditTrail.filter(a=>(a.recordId&&ownIds.has(a.recordId))||normalizedStaffName(a.by)===normalizedStaffName(user.name));
  return {format:'HeartlineStaffBackup',version:2,appVersion:'1.9',backedUpAt:new Date().toISOString(),staffProfile:JSON.parse(JSON.stringify(user.staffProfile)),records:JSON.parse(JSON.stringify(own)),treatmentDrafts:JSON.parse(JSON.stringify(ownDrafts)),entryDraft:JSON.parse(JSON.stringify(wizardDrafts[`staff:${user.staffId}`]||null)),auditTrail:JSON.parse(JSON.stringify(ownAudit)),weeklyBackupState:JSON.parse(JSON.stringify({[`staff:${user.staffId}`]:weeklyBackupState[`staff:${user.staffId}`]||{}}))};
}
async function buildStaffBackupText(obj){
  const lines=['HEARTLINE HEALTHCARE LLP — AF MANAGEMENT','STAFF COMPLETE BACKUP FILE (RESTORABLE TXT)','Keep this file intact. It contains this staff profile and the staff member’s patient data.','',`Staff: ${obj.staffProfile.name}`,`Staff ID: ${obj.staffProfile.id}`,`Backup date: ${new Date(obj.backedUpAt).toLocaleString()}`,`Patient records included: ${obj.records.length}`,'','--- BEGIN HEARTLINE STAFF BACKUP DATA V2 ---',await encodeTransferPayload(obj),'--- END HEARTLINE STAFF BACKUP DATA V2 ---',''];
  return lines.join('\n');
}
async function exportStaffBackup(isWeekly=false){
  if(user.role!=='staff')return false;
  try{const obj=makeStaffBackup();const filename=`Heartline_Staff_Backup_${user.staffId||'Profile'}_${uniqueFileStamp()}.txt`;const result=downloadBlob(filename,await buildStaffBackupText(obj),'text/plain;charset=utf-8');const confirmed=confirmBackupSaved(filename,result.size);if(confirmed&&!isWeekly)alert(`Your staff backup file is ready: ${filename}. Keep it outside the PWA.`);return confirmed;}catch(error){alert(`Staff backup could not be generated: ${error.message||error}`);return false;}
}
function restoreStaffBackup(file){
  importStaffSetupFile(file,false,user.staffId).then(result=>{if(result.type!=='backup')throw new Error('Selected file is a staff profile invitation, not a complete staff backup.');$('staffRestoreFile').value='';render();alert(`Restored ${result.records} patient records and profile ${result.profile.name}.`);}).catch(e=>alert('Staff restore failed: '+e.message));
}
function createStaffProfile(){
  if(user.role!=='doctor')return;
  const name=$('newStaffName').value.trim().replace(/\s+/g,' ');if(!name)return alert('Enter the staff member’s name.');
  if(staffProfiles.some(p=>normalizedStaffName(p.name)===normalizedStaffName(name)&&p.active!==false))return alert('An active profile with this name already exists.');
  const now=new Date().toISOString();const profile={id:makeStaffId(),name,role:'staff',active:true,revision:1,updatedAt:now,assignedBy:DEFAULT_DOCTOR_NAME,createdAt:now,importedAt:now};
  staffProfiles.push(profile);if(!saveStaffProfiles()){staffProfiles.pop();return;}$('newStaffName').value='';renderStaffProfiles();shareStaffProfile(profile);
}
function weeklyBackupHtmlIncludes(){return user.role==='doctor'?'<ul><li>All patient records on this device</li><li>All staff profiles</li><li>Treatment orders, favourites and audit history</li></ul>':'<ul><li>Your staff profile</li><li>Your patient records and approved treatment updates</li><li>Your checklists and saved data</li></ul>';}
function showWeeklyBackupGate(){
  if(!user.role||!isWeeklyBackupDue())return;
  backupLockActive=true;document.body.classList.add('backup-locked');
  $('weeklyBackupGate').classList.remove('hidden');
  $('weeklyBackupMessage').textContent=user.role==='doctor'?'Your complete Doctor Mode backup is overdue. Generate the full database backup to unlock the app.':'Your complete staff backup is overdue. Generate your profile and patient backup to unlock the app.';
  $('weeklyBackupIncludes').innerHTML=weeklyBackupHtmlIncludes();
  $('weeklyBackupLast').textContent=`Last backup: ${weeklyBackupDueText()}. Weekly backup is required every 7 days.`;
  $('weeklyEmergencyContacts').classList.toggle('hidden',user.role!=='staff');
  $('takeWeeklyBackup').textContent=user.role==='doctor'?'Click here to take the full Doctor backup':'Click here to take your Staff backup';
}
async function createMandatoryWeeklyBackup(){
  if(!backupLockActive)return;
  if(user.role==='doctor')exportAllJson({weekly:true});
  else await exportStaffBackup(true);
}
function renderBackupMeta(){const text=`Last successful backup generation: ${weeklyBackupDueText()}`;const el=$('backupMeta');if(el)el.textContent=text;const staffEl=$('staffBackupMeta');if(staffEl)staffEl.textContent=text;}

function updateLoginRoleUI(){
  const isDoctor=$('role').value==='doctor';
  $('doctorLoginNote').classList.toggle('hidden',!isDoctor);
  $('staffLoginPanel').classList.toggle('hidden',isDoctor);
  $('staffAdminTab').classList.toggle('hidden',!isDoctor);
  refreshStaffLoginOptions();
}
$('role').addEventListener('change',updateLoginRoleUI);
updateLoginRoleUI();
$('importStaffSetup').onclick=async()=>{
  try{const result=await importStaffSetupFile($('staffSetupFile').files[0],true);$('staffSetupFile').value='';if(result.type==='backup')$('staffProfileSelect').value=result.profile.id;}
  catch(e){alert('Import failed: '+e.message);}
};
$('enter').onclick=()=>{
  const role=$('role').value;
  if(role==='doctor') user={role:'doctor',name:DEFAULT_DOCTOR_NAME,language:'english',staffId:'',staffProfile:null};
  else {
    const profile=staffProfiles.find(p=>p.id===$('staffProfileSelect').value&&p.active!==false);
    if(!profile)return alert('Import your staff profile file or your previous staff backup, then select your profile.');
    user={role:'staff',name:profile.name,language:'hinglish',staffId:profile.id,staffProfile:profile};
  }
  $('login').classList.add('hidden');$('app').classList.remove('hidden');
  $('hello').textContent=role==='doctor'?`${DEFAULT_DOCTOR_NAME} · Doctor Mode · English`:`${user.name} · Staff Mode · Hinglish`;
  $('calc').textContent=role==='staff'?'Show simple staff assessment':'Calculate initial assessment';
  editingRecordId=null;
  $('new').classList.toggle('hidden',role!=='staff');
  document.querySelector('[data-tab="form"]').classList.toggle('hidden',role!=='staff');
  $('doctorBackup').classList.toggle('hidden',role!=='doctor');
  $('staffBackupPanel').classList.toggle('hidden',role!=='staff');
  $('staffEmergencyContacts').classList.toggle('hidden',role!=='staff');
  $('staffAdminTab').classList.toggle('hidden',role!=='doctor');
  setWizardStep(1);
  $('recordDetail').innerHTML='';activeRecordId=null;
  renderStaffLiveGuidance();render();
  if(role==='staff'&&resumeWizardDraft())alert('Your unfinished patient entry has been restored. Continue from the saved step.');
  if(navigator.storage?.persist){navigator.storage.persist().catch(()=>{});}
  getBackupState();renderBackupMeta();showWeeklyBackupGate();
};
$('switch').onclick=()=>{user={role:'',name:'',language:'english',staffId:'',staffProfile:null};backupLockActive=false;document.body.classList.remove('backup-locked');$('weeklyBackupGate').classList.add('hidden');editingRecordId=null;$('app').classList.add('hidden');$('login').classList.remove('hidden');$('role').value='doctor';updateLoginRoleUI()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('wizardNext').onclick=()=>{if(!wizardPageIsValid(wizardCurrentStep)){updateWizardControls();const first=[...$(`wizardPage${wizardCurrentStep}`).querySelectorAll('input[required],select[required],textarea[required]')].find(el=>!el.checkValidity());first?.reportValidity();return;}setWizardStep(wizardCurrentStep+1);};
$('wizardBack').onclick=()=>setWizardStep(wizardCurrentStep-1);
$('patientForm').addEventListener('input',()=>{updateWizardControls();if(user.role==='staff')saveWizardDraft();if(wizardCurrentStep===3)renderRiskScoreSummary();if(wizardCurrentStep===4)renderWizardFinalPage();});
$('patientForm').addEventListener('change',()=>{updateWizardControls();if(user.role==='staff')saveWizardDraft();if(wizardCurrentStep===3)renderRiskScoreSummary();if(wizardCurrentStep===4)renderWizardFinalPage();});
window.addEventListener('beforeunload',()=>{if(user.role==='staff'&&wizardCurrentStep>=1)saveWizardDraft();});
$('records').addEventListener('click',event=>{const button=event.target.closest('button[data-id]');if(button){openRecord(button.dataset.id);return;}if(event.target.closest('#openImport'))tab('transfer');});
$('new').onclick=()=>{
  if(user.role!=='staff')return alert('Only staff can create a patient submission.');
  if(user.role==='staff'){const key=currentWizardDraftKey();if(key&&wizardDrafts[key]){if(!confirm('An unfinished entry is saved. Starting a new patient will discard that unfinished draft. Continue?'))return;clearWizardDraft();}}
  editingRecordId=null; $('patientForm').reset();setWizardStep(1);updateAutoScore();updateHemoScreen();
  $('formTitle').textContent='Patient assessment';$('submitPatient').textContent='Submit for doctor review';$('cancelEdit').classList.add('hidden');
  $('assessed').value=new Date().toISOString().slice(0,16);
  $('result').classList.add('hidden');setWizardStep(1);if(user.role==='staff')saveWizardDraft();tab('form');
};
$('cancelEdit').onclick=cancelPatientEdit;
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
  const p=collect();
  if(!validateAllWizardPages())return;
  if(!p.duration)return alert('AF duration is required.');
  const now=new Date().toISOString();
  if(editingRecordId) {
    const r=records.find(x=>x.id===editingRecordId);if(!r)return alert('Patient record not found.');
    if(user.role==='staff'&&(!canAccessRecord(r)||r.status!=='Pending review'))return alert('Staff can edit only their own pending records.');
    if(user.role==='doctor')invalidateApprovedPlanAfterClinicalEdit(r,now);
    r.patient=p;bumpRecordRevision(r,now);r.history=r.history||[];r.history.push({event:user.role==='doctor'?'Patient details edited by doctor':'Pending patient details corrected by staff',by:user.name,at:now});
    auditTrail.push({event:'Patient record edited',recordId:r.id,by:user.name,at:now});const id=r.id;editingRecordId=null;clearWizardDraft();
    if(!save())return;$('cancelEdit').classList.add('hidden');$('formTitle').textContent='Patient assessment';$('submitPatient').textContent='Submit for doctor review';tab('list');openRecord(id);
    alert(user.role==='doctor'?'Patient details updated. Any previously approved plan has been marked as needing re-approval.':'Your pending patient entry has been updated and remains pending doctor review.');return;
  }
  if(user.role!=='staff')return alert('Only staff can submit records.');
  const r={id:makeRecordId(),patient:p,status:'Pending review',by:user.name,enteredBy:user.name,enteredById:user.staffId||'',createdAt:now,updatedAt:now,revision:1,planRevision:0,history:[{event:'Submitted',by:user.name,at:now}]};
  records.push(r);auditTrail.push({event:'Patient record created',recordId:r.id,by:user.name,at:now});clearWizardDraft();if(!save())return;alert('Patient assessment saved. Open Patient transfer and choose Share via WhatsApp to send the TXT transfer file to the doctor.');tab('list');
};
$('download').onclick=()=>{const r=visibleRecords().find(x=>x.id===$('choose').value);if(r)exportR(r);else alert('Select one of your available patient records.')};
$('whatsapp').onclick=()=>{
  const r=visibleRecords().find(x=>x.id===$('choose').value);
  if(!r)return alert('Select one of your available patient records.');
  sharePatientViaWhatsApp(r,'patient-handover','transferShareStatus');
};
$('print').onclick=()=>{
  const r=visibleRecords().find(x=>x.id===$('choose').value);if(!r)return alert('Select one of your available patient records.');
  const w=window.open('','_blank');if(!w){alert('The print window was blocked. Allow pop-ups for this PWA, then try again.');return;}const d=advice(r.patient);
  if(user.role==='staff') {
    const sh=staffAssessment(r.patient);
    w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Staff Assessment</h2><p>Patient: ${esc(r.patient.pName)} · UHID: ${esc(r.patient.uhid)} · Age: ${esc(r.patient.age)}</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)}</p><p><b>${esc(sh.priority)}</b></p><p><b>Automatic screen:</b> ${esc(sh.h.label)}</p>${sh.focusedGuidance?`<div>${sh.focusedGuidance}</div>`:''}<h3>Staff preparation checklist</h3><ul>${sh.tasks.map(t=>`<li><b>${esc(t[0])}:</b> ${esc(t[1])}</li>`).join('')}</ul><small>Staff view: medication and treatment decisions remain doctor-only.</small><script>window.print()<\/script>`);
  } else {
    const rv=doctorReviewValues(r),dd=doctorDecisionData(r,rv);
    w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Doctor Review</h2><p>Patient: ${esc(r.patient.pName)} · Record: ${esc(formatRecordId(r.id))} · UHID: ${esc(r.patient.uhid)}</p><p>Age: ${esc(r.patient.age)} · Sex: ${esc(r.patient.sex)} · Weight: ${esc(r.patient.weight)} kg · Creatinine: ${esc(r.patient.creatinine)} mg/dL</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)} · AF duration: ${esc(durationLabel(r.patient.duration))}</p><h3>CHA₂DS₂-VA ${dd.scores.va} · CHA₂DS₂-VASc ${dd.scores.vasc}</h3><h3>Cardioversion</h3><p><b>${esc(dd.cardioversion.title)}</b></p><p>${esc(dd.cardioversion.detail)}</p><p>${esc(dd.cardioversion.energy)}</p><h3>Anticoagulation</h3><p>${esc(dd.oac.text)} ${esc(dd.oac.route)}</p><h3>Renal / dose reference</h3><p>${esc(dd.renal.value===null?dd.renal.reason:`Cockcroft–Gault CrCl ${dd.renal.value.toFixed(1)} mL/min`)}</p><p>${esc(dd.dose)}</p><small>Clinical decision support only. US label references must be checked against the locally approved Indian product information before prescribing.</small><script>window.print()<\/script>`);
  }
  w.document.close();
};
$('createStaffProfile').onclick=createStaffProfile;
$('staffBackupNow').onclick=()=>exportStaffBackup(false);
$('restoreStaffBackup').onclick=()=>{if(user.role!=='staff')return;restoreStaffBackup($('staffRestoreFile').files[0]);};
$('takeWeeklyBackup').onclick=createMandatoryWeeklyBackup;
$('backupJson').onclick=()=>{if(user.role==='doctor')exportAllJson();};
$('backupText').onclick=()=>{if(user.role==='doctor')exportAllText();};
$('backupPdf').onclick=()=>{if(user.role==='doctor')exportAllPdf();};
$('restoreBackup').onclick=async()=>{
  if(user.role!=='doctor')return alert('Only Doctor Mode can restore a complete backup.');
  const f=$('backupFile').files[0]; if(!f)return alert('Choose a full JSON backup file first.');
  try { const obj=JSON.parse(await f.text()); restoreFullBackup(obj); }
  catch(e){alert('Restore failed: '+e.message);}
};
$('import').onclick=async()=>{
  const f=$('file').files[0];if(!f)return alert('Choose the TXT transfer file downloaded from WhatsApp. Older JSON patient handover files are also supported.');
  try{
    const o=await parsePatientTransferFile(f),r=o.record;
    if(o.format!=='HeartlineAFTransfer'||![1,2].includes(Number(o.version))||!['patient-handover','doctor-approved-plan'].includes(o.transferType)||!AFManagementCore.validateRecord(r).valid)throw Error('Invalid patient transfer file or unsupported format version. Nothing was imported.');
    const doctorApprovedUpdate=o.transferType==='doctor-approved-plan'&&r.status==='Approved'&&r.approvedBy===DEFAULT_DOCTOR_NAME;
    if(user.role==='staff' && (r.enteredById ? r.enteredById!==user.staffId : normalizedStaffName(recordOwner(r))!==normalizedStaffName(user.name))) throw Error('This file belongs to another staff member. Staff can import only their own patient records.');
    if(user.role==='staff' && r.status==='Approved' && !doctorApprovedUpdate) throw Error('Only a doctor-approved plan transfer can update an approved staff record.');
    const i=records.findIndex(x=>x.id===r.id);
    if(i>=0){
      const local=records[i];
      if(user.role==='staff'&&doctorApprovedUpdate){const verdict=planVersionDecision(local,r);if(verdict.decision==='stale'||verdict.decision==='same')throw Error('This treatment-plan file is older than or identical to the plan already on this phone. The newer plan has been kept.');if(verdict.decision!=='newer'&&!confirm(`This is a legacy plan file without reliable plan revision information (${verdict.reason}). Import it anyway?`))throw Error('Import cancelled to protect the current plan.');}
      else {const verdict=recordVersionDecision(local,r);if(verdict.decision==='stale'||verdict.decision==='same')throw Error(`This file is older than or identical to the local record (${verdict.reason}). No overwrite was made.`);if(user.role==='staff'&&local.status==='Approved')throw Error('Staff cannot replace an approved record with a patient handover.');if(verdict.decision!=='newer'&&!confirm(`Record version cannot be safely compared (${verdict.reason}). Replace the local record with this incoming file?`))throw Error('Import cancelled.');if(user.role==='doctor'&&local.status==='Approved'&&!confirm('This will replace an existing doctor-approved record. Continue?'))throw Error('Doctor import cancelled.');}
    }
    if(i>=0&&doctorApprovedUpdate){const local=records[i];const carryChecklist=Number(local.planRevision||0)===Number(r.planRevision||0)?local.staffChecklistDone:[];records[i]=JSON.parse(JSON.stringify(r));records[i].staffChecklistDone=carryChecklist||[];}
    else if(i>=0){const local=records[i],incoming=JSON.parse(JSON.stringify(r));if(JSON.stringify(local.patient)!==JSON.stringify(incoming.patient)&&(local.status==='Approved'||incoming.status==='Approved')){incoming.status='Needs re-approval';incoming.planNeedsReapproval=true;incoming.planOutdatedAt=new Date().toISOString();}records[i]=incoming;}else records.push(JSON.parse(JSON.stringify(r)));
    if(!records[i>=0?i:records.length-1].revision)records[i>=0?i:records.length-1].revision=1;
    if(!records[i>=0?i:records.length-1].updatedAt)records[i>=0?i:records.length-1].updatedAt=records[i>=0?i:records.length-1].createdAt||new Date().toISOString();
    if(!save())throw Error('The file was read, but local storage could not save the imported record. Check device storage and retry.');
    tab('list');if(user.role==='doctor'||doctorApprovedUpdate)openRecord(r.id);
    alert(doctorApprovedUpdate?`Doctor-approved treatment plan revision ${r.planRevision||'legacy'} imported. Confirm the approval time and review the checklist.`:'Patient transfer file imported. Confirm patient identity and review the record.');
  }catch(e){alert('Import failed: '+e.message);}
};
['sbp','dbp','spo2'].forEach(id=>$(id).addEventListener('input',updateHemoScreen));
document.querySelectorAll('[name=inst]').forEach(el=>el.addEventListener('change',updateHemoScreen));
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

setInterval(()=>{if(user.role&&!backupLockActive&&isWeeklyBackupDue())showWeeklyBackupGate();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user.role&&!backupLockActive&&isWeeklyBackupDue())showWeeklyBackupGate();});


// Cross-tab safety: reload newer local records rather than silently keeping a stale array.
window.addEventListener('storage',event=>{
  if(event.key==='hl_af_v1'&&event.newValue!==null&&event.newValue!==lastSeenRecordsRaw){
    try{const parsed=JSON.parse(event.newValue);if(!Array.isArray(parsed))throw new Error('');records=parsed.filter(r=>r&&r.id&&r.patient);lastSeenRecordsRaw=event.newValue;render();if(activeRecordId&&records.some(r=>r.id===activeRecordId))openRecord(activeRecordId);alert('Patient data changed in another AF Management tab. The latest list has been loaded. Recheck the open record before saving.');}catch(error){alert('Another tab changed patient data, but the update could not be read. Reload this page before continuing.');}
  }
  if(event.key==='hl_af_staff_profiles_v1'&&event.newValue){try{const parsed=JSON.parse(event.newValue);if(Array.isArray(parsed)){staffProfiles=parsed;refreshStaffLoginOptions();renderStaffProfiles();}}catch(e){}}
  if(event.key==='hl_af_weekly_backup_v1'&&event.newValue){try{weeklyBackupState=JSON.parse(event.newValue)||{};renderBackupMeta();}catch(e){}}
});

// PWA update notice: new service worker takes control without silently discarding the current screen.
if('serviceWorker' in navigator){
  let hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController){$('appUpdateBanner')?.classList.remove('hidden');}else hadController=true;});
  window.addEventListener('load',()=>navigator.serviceWorker.getRegistration().then(reg=>reg?.update()).catch(()=>{}));
}
$('reloadApp')?.addEventListener('click',()=>location.reload());
