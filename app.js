const $=id=>document.getElementById(id);let records=JSON.parse(localStorage.getItem('hl_af_v1')||'[]'),user={};const ids='pName uhid age sex weight mobile hr sbp dbp spo2 symptoms duration reliability onset assessed ecg qrs wpw lvef creatinine htn diabetes hf stroke vascular bleeding valve notes'.split(' ');function save(){localStorage.setItem('hl_af_v1',JSON.stringify(records));render()}function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}function durationLabel(v){return ({'lt24':'Less than 24 hours','24to48':'24–48 hours','gt48':'More than 48 hours','unknown':'Unknown / uncertain'})[v]||'Not entered'}function score(p){let y=k=>p[k]==='yes';let age=Number(p.age);let agePoints=Number.isFinite(age)&&p.age!==''?(age>=75?2:age>=65?1:0):0;let ageBand=p.age===''?'Age not entered':age>=75?'75 years or older':age>=65?'65–74 years':'Under 65 years';let base=(y('hf')?1:0)+(y('htn')?1:0)+(y('diabetes')?1:0)+(y('stroke')?2:0)+(y('vascular')?1:0)+agePoints;let female=p.sex==='Female';return{va:base,vasc:base+(female?1:0),agePoints,ageBand,female}}function hemodynamicScreen(p){
  const number=k=>p[k]!==undefined&&p[k]!==''&&Number.isFinite(Number(p[k]))?Number(p[k]):null;
  const sbp=number('sbp'),dbp=number('dbp'),spo2=number('spo2');
  const clinicalFlags=Array.isArray(p.instability)?p.instability:[];
  const red=[],amber=[];
  if(sbp!==null&&sbp<=90)red.push(`Systolic BP ${sbp} mmHg (≤90)`);
  if(spo2!==null&&spo2<=91)red.push(`SpO₂ ${spo2}% (≤91%)`);
  if(clinicalFlags.length)red.push(...clinicalFlags);
  if(sbp!==null&&sbp>90&&sbp<=100)amber.push(`Systolic BP ${sbp} mmHg (91–100)`);
  if(dbp!==null&&dbp<60)amber.push(`Diastolic BP ${dbp} mmHg (<60)`);
  if(spo2!==null&&spo2>91&&spo2<=93)amber.push(`SpO₂ ${spo2}% (92–93%)`);
  const complete=sbp!==null&&dbp!==null&&spo2!==null;
  if(red.length)return {level:'red',label:'Potential haemodynamic / respiratory compromise',badge:'Urgent assessment',reasons:red,detail:'A red-flag observation or clinical sign is present. Arrange immediate bedside clinician assessment. If haemodynamic instability is attributable to AF, follow the emergency synchronized cardioversion pathway.'};
  if(!complete)return {level:'incomplete',label:'Screen incomplete — enter all three observations',badge:'Awaiting observations',reasons:[],detail:'Enter systolic BP, diastolic BP and SpO₂ to complete this automatic screen. Missing values must not be treated as normal.'};
  if(amber.length)return {level:'amber',label:'Borderline observations — clinical review required',badge:'Caution',reasons:amber,detail:'Repeat/verify observations and assess perfusion, mental status, ischemia and pulmonary oedema. Do not classify the patient as stable from these numbers alone.'};
  return {level:'green',label:'No predefined vital-sign red flags detected',badge:'No alert from entered vitals',reasons:[],detail:'This does NOT confirm haemodynamic stability. Confirm adequate perfusion, normal mentation, absence of ongoing ischemia and acute pulmonary oedema at the bedside.'};
}
function updateHemoScreen(){
  const p={sbp:$('sbp').value,dbp:$('dbp').value,spo2:$('spo2').value,instability:[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value)};
  const s=hemodynamicScreen(p);
  const panel=$('hemoPanel');
  panel.className=`hemo-panel level-${s.level}`;
  $('hemoBadge').textContent=s.badge;
  $('hemoTitle').textContent=s.label;
  $('hemoDetail').textContent=s.detail;
  $('hemoReason').textContent=s.reasons.length?'Flags: '+s.reasons.join('; '):'Screening thresholds: SBP ≤90 or SpO₂ ≤91 are urgent flags; SBP 91–100, DBP <60 or SpO₂ 92–93 are caution flags. These are prompts for review, not stand-alone AF instability criteria.';
}

function staffAssessment(p){
  const h=hemodynamicScreen(p);
  const urgent=h.level==='red'||p.wpw!=='no'||p.qrs==='Wide';
  const caution=!urgent&&h.level==='amber';
  let priority=urgent?'URGENT — inform doctor / emergency team now':caution?'PROMPT DOCTOR REVIEW':'No vital-sign red flags detected';
  let shockTitle=urgent?'Prepare for possible emergency cardioversion review':'No automatic shock instruction from entered observations';
  let shockText=urgent
    ?'The app cannot decide to deliver a shock. Call the doctor/resuscitation team immediately and prepare the monitor/defibrillator as directed. If the clinician confirms haemodynamic instability caused by AF, the emergency treatment pathway is synchronized DC cardioversion. Staff must not independently deliver a shock.'
    :'The entered observations do not by themselves indicate an automatic shock pathway. Do not shock on the basis of AF or heart rate alone. The doctor decides after bedside assessment.';
  const tasks=[
    ['Call / update doctor', urgent?'Immediately':'Promptly; share the completed assessment'],
    ['ECG and monitoring','Obtain a 12-lead ECG if not already done; attach cardiac monitor if available / per hospital protocol'],
    ['Repeat observations','Repeat and document HR, BP, SpO₂, respiratory rate and level of consciousness; escalate any deterioration'],
    ['IV cannula','Prepare IV access; insert/maintain as directed by the doctor or emergency protocol'],
    ['Oxygen','Assess breathing and saturation. Give/titrate oxygen only for hypoxaemia or respiratory distress according to the prescribed target and hospital protocol; do not give routinely when saturation is within target'],
    ['Urinary catheter','Not routine for AF. Insert only if clinically indicated for accurate urine-output monitoring and ordered / permitted by protocol'],
    ['Medicines','Do not administer an anticoagulant, antiarrhythmic, rate-control drug or antibiotic solely from this score. Await the doctor’s order']
  ];
  let risk='Stroke-risk scoring is calculated in the background. Anticoagulation decision is reserved for the doctor after reviewing stroke risk, bleeding risk, renal function and valve history.';
  let rate='Rate-control versus rhythm-control treatment will be decided by the doctor. No drug or dose is shown in staff mode.';
  let infection='CHA₂DS₂ scores do not determine antibiotic use. Antibiotics are considered only when a separate infection indication is assessed by the clinician.';
  return {h,urgent,caution,priority,shockTitle,shockText,tasks,risk,rate,infection};
}
function staffAssessmentHtml(p, compact=false){
  const a=staffAssessment(p);
  const cls=a.urgent?'urgent':a.caution?'caution':'normal';
  const taskHtml=a.tasks.map((t,i)=>`<li><label class="staff-task"><input type="checkbox" data-staff-task="${i}"><span><b>${esc(t[0])}</b><small>${esc(t[1])}</small></span></label></li>`).join('');
  return `<div class="staff-result ${cls}">
    <div class="staff-result-head"><small>STAFF ASSESSMENT</small><strong>${esc(a.priority)}</strong></div>
    <p><b>Automatic vital-sign screen:</b> ${esc(a.h.label)}</p>
    ${a.h.reasons.length?`<p><b>Reason:</b> ${esc(a.h.reasons.join('; '))}</p>`:''}
    <h4>Shock / cardioversion</h4><p><b>${esc(a.shockTitle)}</b></p><p>${esc(a.shockText)}</p>
    <h4>Staff preparation checklist</h4><ul class="staff-task-list">${taskHtml}</ul>
    <h4>What remains for the doctor?</h4>
    <p>${esc(a.risk)}</p><p>${esc(a.rate)}</p><p>${esc(a.infection)}</p>
    <p class="staff-no-treatment"><b>Treatment details are hidden in Staff Mode.</b> Follow the doctor’s documented instructions after review.</p>
  </div>`;
}
function renderStaffLiveGuidance(){
  const host=$('staffLiveGuidance');
  if(!host)return;
  if(user.role!=='staff'){host.classList.add('hidden');host.innerHTML='';return;}
  const p={sbp:$('sbp').value,dbp:$('dbp').value,spo2:$('spo2').value,hr:$('hr').value,qrs:$('qrs').value,wpw:$('wpw').value,instability:[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value)};
  const h=hemodynamicScreen(p);
  const ecgUrgent=p.wpw!=='no'||p.qrs==='Wide';
  let action=(h.level==='red'||ecgUrgent)
    ?'Call the doctor / emergency team now. Prepare cardiac monitoring and emergency equipment as directed; the app does not authorise a shock.'
    :h.level==='amber'
    ?'Repeat observations and notify the doctor for prompt review.'
    :h.level==='green'
    ?'Continue observations and complete bedside assessment. This screen does not certify stability.'
    :'Enter SBP, DBP and SpO₂ to show the staff guidance.';
  host.className='staff-guidance'+((h.level==='red'||ecgUrgent)?' urgent':h.level==='amber'?' caution':'');
  host.innerHTML=`<b>Staff next step</b><p>${esc(action)}</p><small>Doctor-only: diagnosis, cardioversion decision, anticoagulation and rate/rhythm drug plan.</small>`;
}
function advice(p){let s=score(p),h=hemodynamicScreen(p),a=[],urgent=h.level==='red'||p.wpw!=='no'||p.qrs==='Wide';if(h.level==='red')a.push('URGENT SCREEN ALERT: Potential haemodynamic/respiratory compromise. Assess immediately. If haemodynamic instability is attributable to AF, immediate synchronized electrical cardioversion; do not delay for anticoagulation or TEE.');else if(h.level==='amber')a.push('CAUTION: Borderline vital signs. Repeat observations and assess perfusion, consciousness, ischemia and pulmonary oedema before classifying stability.');else if(h.level==='green')a.push('No predefined vital-sign red flags detected. This does not prove haemodynamic stability; bedside clinical assessment remains essential.');else a.push('Haemodynamic screen incomplete: enter SBP, DBP and SpO₂. Do not infer stability from missing observations.');if(p.instability.length&&!h.reasons.length)a.push('Clinical red flag reported: immediate clinician assessment required.');if(p.wpw!=='no')a.push('Possible/uncertain pre-excitation: urgent expert ECG review. Avoid AV-nodal blockers and IV amiodarone in pre-excited AF.');if(p.qrs==='Wide')a.push('Wide QRS: urgent ECG/clinical review before choosing rate-control medication.');if(['24to48','gt48','unknown'].includes(p.duration))a.push('Elective cardioversion: apply selected guideline. ESC 2024 generally uses >24 h or unknown duration for 3 weeks therapeutic anticoagulation or TEE-guided strategy; ACC/AHA 2023 uses a 48 h framework with risk-based considerations.');else a.push('AF reported as less than 24 hours does not mean zero embolic risk; assess stroke risk and anticoagulation individually.');a.push(`CHA₂DS₂-VA ${s.va}; CHA₂DS₂-VASc ${s.vasc}. Automatically applied: age ${p.age||'not entered'} years → ${s.ageBand} (${s.agePoints} age point(s)); sex ${p.sex||'not specified'} → ${s.female?'+1 female-sex point for CHA₂DS₂-VASc only':'no additional female-sex point'}. Confirm the remaining components and apply the appropriate guideline-specific threshold.`);if(!p.sex||p.sex==='Other'||p.sex==='Not specified')a.push('Sex category is not recorded as male or female. Verify the appropriate CHA₂DS₂-VASc interpretation before relying on this score.');if(p.lvef&&+p.lvef<=40)a.push('Reduced LVEF entered: avoid IV diltiazem/verapamil in moderate-to-severe LV systolic dysfunction or decompensated HFrEF.');if(p.bleeding==='yes')a.push('Bleeding history/active bleeding: clinician review required; bleeding score alone should not determine withholding anticoagulation.');if(p.valve==='yes')a.push('Mechanical valve or moderate/severe rheumatic MS: DOAC pathway is not appropriate; specialist-directed VKA pathway.');if(p.creatinine)a.push('Assess Cockcroft–Gault CrCl before selecting/dosing anticoagulants requiring renal adjustment.');a.push('No medication is automatically prescribed. Check BP, LVEF, renal function, QTc, electrolytes, interactions, product labelling and local protocol.');return{s,a,urgent}}function collect(){let p={};ids.forEach(k=>p[k]=$(k).value);p.instability=[...document.querySelectorAll('[name=inst]:checked')].map(x=>x.value);p.hemodynamicScreen=hemodynamicScreen(p);return p}function updateAutoScore(){
  let ageRaw=$('age').value;
  let sex=$('sex').value;
  let age=Number(ageRaw);
  let validAge=ageRaw!==''&&Number.isFinite(age)&&age>=0;
  let age6574=validAge&&age>=65&&age<=74;
  let age75=validAge&&age>=75;
  $('age6574Auto').textContent=validAge?(age6574?'Yes':'No'):'Enter age above';
  $('age6574PointsAuto').textContent=validAge?(age6574?'+1 point applied':'0 points'):'+1 point when Yes';
  $('age75Auto').textContent=validAge?(age75?'Yes':'No'):'Enter age above';
  $('age75PointsAuto').textContent=validAge?(age75?'+2 points applied':'0 points'):'+2 points when Yes';
  $('femaleAuto').textContent=!sex?'Select sex above':sex==='Female'?'Yes':sex==='Male'?'No':'Other / not specified';
  $('femalePointsAuto').textContent=!sex?'+1 point when Yes':sex==='Female'?'+1 CHA₂DS₂-VASc point applied':sex==='Male'?'0 points':'Confirm sex category with clinician';
}
function preview(){let p=collect();$('result').classList.remove('hidden');if(user.role==='staff'){$('result').className='result';$('result').innerHTML=staffAssessmentHtml(p);return}let d=advice(p);$('result').className='result'+(d.urgent?' danger':'');$('result').innerHTML=`<b>CHA₂DS₂-VA: ${d.s.va} · CHA₂DS₂-VASc: ${d.s.vasc}</b><ul>${d.a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><small>Doctor review required; this is not an autonomous prescription.</small>`}function tab(t){['list','form','transfer'].forEach(x=>$(x).classList.toggle('hidden',x!==t))}function render(){$('stats').textContent=`${records.filter(r=>r.status==='Pending review').length} pending review · ${records.filter(r=>r.status==='Approved').length} approved`;$('records').innerHTML=records.slice().reverse().map(r=>`<div class="patient"><div><b>${esc(r.patient.pName)}</b><br><small>${esc(r.id)} · ${esc(r.status)} · ${esc(r.by)}</small></div><button class="light" data-id="${r.id}">Open</button></div>`).join('')||'<p class="hint">No records on this device.</p>';$('choose').innerHTML=records.map(r=>`<option value="${r.id}">${esc(r.patient.pName)} · ${r.id}</option>`).join('');document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openRecord(b.dataset.id))}function exportableRecord(r){let copy=JSON.parse(JSON.stringify(r));if(user.role==='staff'){delete copy.plan;delete copy.approvedBy;delete copy.approvedAt;}return copy}function exportR(r){let blob=new Blob([JSON.stringify({format:'HeartlineAFTransfer',version:1,record:exportableRecord(r)},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${r.id}.json`;a.click();URL.revokeObjectURL(a.href)}function openRecord(id){
  let r=records.find(x=>x.id===id),d=advice(r.patient),hs=hemodynamicScreen(r.patient);
  let act=user.role==='doctor'&&r.status!=='Approved'?'<button id="approve">Approve treatment</button>':user.role==='staff'&&r.status==='Approved'?'<button class="light" id="correction">Request correction</button>':'';
  const staffBlock=user.role==='staff'?staffAssessmentHtml(r.patient):`<h4>Doctor clinical assessment</h4><p><b>CHA₂DS₂-VA:</b> ${d.s.va} · <b>CHA₂DS₂-VASc:</b> ${d.s.vasc}</p><ul>${d.a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  const planBlock=user.role==='doctor'&&r.plan?`<h4>Doctor-approved treatment plan</h4><p>${esc(r.plan)}</p><small>Approved by ${esc(r.approvedBy)} · ${new Date(r.approvedAt).toLocaleString()}</small>`:user.role==='staff'&&r.status==='Approved'?'<p class="staff-no-treatment"><b>Doctor review completed.</b> Treatment details are restricted in Staff Mode. Follow the doctor’s approved chart / instructions.</p>':'';
  $('records').insertAdjacentHTML('afterbegin',`<div class="card"><h3>${esc(r.patient.pName)} — ${esc(r.status)}</h3><p>Record ${esc(r.id)} · HR ${esc(r.patient.hr||'—')} · BP ${esc(r.patient.sbp||'—')}/${esc(r.patient.dbp||'—')} · SpO₂ ${esc(r.patient.spo2||'—')} · AF duration ${esc(durationLabel(r.patient.duration))}</p>${staffBlock}${planBlock}${r.correction&&user.role==='doctor'?`<p>Correction request (${esc(r.correction.status)}): ${esc(r.correction.reason)}</p>`:''}${act}<button class="light" id="oneExport">Export file</button></div>`);
  $('approve')?.addEventListener('click',()=>{let p=prompt('Enter the doctor-approved treatment plan and instructions. Verify doses and contraindications.');if(!p)return;r.plan=p;r.status='Approved';r.approvedBy=user.name;r.approvedAt=new Date().toISOString();save()});
  $('correction')?.addEventListener('click',()=>{let x=prompt('Describe correction requested');if(!x)return;r.correction={reason:x,status:'Requested',by:user.name,at:new Date().toISOString()};save()});
  $('oneExport').onclick=()=>exportR(r);
}
$('enter').onclick=()=>{if(!$('name').value.trim())return alert('Enter your name');user={role:$('role').value,name:$('name').value.trim()};$('login').classList.add('hidden');$('app').classList.remove('hidden');$('hello').textContent=`${user.name} · ${user.role} mode`;$('calc').textContent=user.role==='staff'?'Show simple staff assessment':'Calculate doctor assessment';renderStaffLiveGuidance();render()};$('switch').onclick=()=>{user={};$('app').classList.add('hidden');$('login').classList.remove('hidden')};document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('new').onclick=()=>{if(user.role!=='staff')return alert('Use staff mode to create a submission.');$('patientForm').reset();updateAutoScore();updateHemoScreen();$('assessed').value=new Date().toISOString().slice(0,16);$('result').classList.add('hidden');tab('form')};$('age').addEventListener('input',updateAutoScore);$('sex').addEventListener('change',updateAutoScore);$('calc').onclick=preview;$('patientForm').onsubmit=e=>{e.preventDefault();if(user.role!=='staff')return alert('Only staff can submit records');let p=collect();if(!p.duration)return alert('AF duration is required');records.push({id:'HLAF-'+Date.now(),patient:p,status:'Pending review',by:user.name,createdAt:new Date().toISOString(),history:[{event:'Submitted',by:user.name,at:new Date().toISOString()}]});save();alert('Saved. Export and share the patient JSON file via WhatsApp.');tab('list')};$('download').onclick=()=>{let r=records.find(x=>x.id===$('choose').value);if(r)exportR(r);else alert('Select a record')};$('whatsapp').onclick=async()=>{let r=records.find(x=>x.id===$('choose').value);if(!r)return alert('Select a record');let f=new File([JSON.stringify({format:'HeartlineAFTransfer',version:1,record:exportableRecord(r)},null,2)],`${r.id}.json`,{type:'application/json'}),msg=`AF assessment for review. Patient: ${r.patient.pName}. Record: ${r.id}. AF duration: ${durationLabel(r.patient.duration)}. Vital-sign screen: ${hemodynamicScreen(r.patient).label}. Import the attached file in AF Management.`;if(navigator.canShare?.({files:[f]})){try{await navigator.share({title:'AF patient handover',text:msg,files:[f]})}catch(e){if(e.name!=='AbortError')alert('Share unavailable. Export JSON and attach manually in WhatsApp.')}}else{exportR(r);window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');alert('Attach the downloaded JSON file in WhatsApp.')}};$('print').onclick=()=>{let r=records.find(x=>x.id===$('choose').value);if(!r)return alert('Select a record');let d=advice(r.patient),w=window.open('','_blank');if(user.role==='staff'){let sh=staffAssessment(r.patient);w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Staff Assessment</h2><p>Patient: ${esc(r.patient.pName)} · UHID: ${esc(r.patient.uhid)} · Age: ${esc(r.patient.age)}</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)}</p><p><b>${esc(sh.priority)}</b></p><p><b>Automatic screen:</b> ${esc(sh.h.label)}</p><p><b>Shock / cardioversion:</b> ${esc(sh.shockText)}</p><h3>Staff preparation checklist</h3><ul>${sh.tasks.map(t=>`<li><b>${esc(t[0])}:</b> ${esc(t[1])}</li>`).join('')}</ul><p>${esc(sh.risk)}</p><p>${esc(sh.rate)}</p><p>${esc(sh.infection)}</p><small>Staff view: medication and treatment decisions remain doctor-only.</small><script>window.print()<\\/script>`);w.document.close();return}w.document.write(`<h1>Heartline Healthcare LLP</h1><h2>AF Clinical Handover</h2><p>Patient: ${esc(r.patient.pName)} · UHID: ${esc(r.patient.uhid)} · Age: ${esc(r.patient.age)}</p><p>HR: ${esc(r.patient.hr)} · BP: ${esc(r.patient.sbp)}/${esc(r.patient.dbp)} · SpO₂: ${esc(r.patient.spo2)}</p><p>AF duration: ${esc(durationLabel(r.patient.duration))}</p><h3>CHA₂DS₂-VA ${d.s.va} · CHA₂DS₂-VASc ${d.s.vasc}</h3><ul>${d.a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>${esc(r.patient.notes)}</p><p><b>Automatic haemodynamic screen:</b> ${esc(hemodynamicScreen(r.patient).label)}</p><p>Status: ${esc(r.status)}</p>${r.plan?`<h3>Approved plan</h3><p>${esc(r.plan)}</p>`:''}<small>Confidential. Clinical decision support only.</small><script>window.print()<\/script>`);w.document.close()};$('import').onclick=async()=>{let f=$('file').files[0];if(!f)return alert('Choose JSON file');try{let o=JSON.parse(await f.text()),r=o.record;if(o.format!=='HeartlineAFTransfer'||!r?.id||!r.patient)throw Error('Invalid transfer file');let i=records.findIndex(x=>x.id===r.id);if(i>=0&&records[i].status==='Approved'&&user.role!=='doctor')return alert('Staff cannot overwrite an approved record');if(i>=0)records[i]=r;else records.push(r);save();alert('Imported. Verify patient identity and record status.');tab('list')}catch(e){alert('Import failed: '+e.message)}};['sbp','dbp','spo2'].forEach(id=>$(id).addEventListener('input',()=>{updateHemoScreen();renderStaffLiveGuidance()}));['qrs','wpw'].forEach(id=>$(id).addEventListener('change',renderStaffLiveGuidance));
document.querySelectorAll('[name=inst]').forEach(el=>el.addEventListener('change',()=>{updateHemoScreen();renderStaffLiveGuidance()}));
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
