(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.AFManagementCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
  function scalarObject(value){return isObject(value)&&Object.values(value).every(v=>v===null||['string','number','boolean'].includes(typeof v));}
  function validateOrderList(list){return Array.isArray(list)&&list.every(order=>isObject(order)&&typeof order.item==='string'&&scalarObject(order));}
  function validateDraftMap(value){return isObject(value)&&Object.entries(value).every(([key,list])=>typeof key==='string'&&validateOrderList(list));}
  function validateWizardDraft(draft){
    if(draft===null)return true;
    if(!isObject(draft))return false;
    if(draft.staffId!==undefined&&typeof draft.staffId!=='string')return false;
    if(draft.staffName!==undefined&&typeof draft.staffName!=='string')return false;
    if(draft.step!==undefined&&(!Number.isInteger(Number(draft.step))||Number(draft.step)<1||Number(draft.step)>4))return false;
    if(draft.editingRecordId!==undefined&&draft.editingRecordId!==null&&typeof draft.editingRecordId!=='string')return false;
    if(draft.values!==undefined&&!scalarObject(draft.values))return false;
    if(draft.instability!==undefined&&(!Array.isArray(draft.instability)||draft.instability.some(x=>typeof x!=='string')))return false;
    if(draft.savedAt!==undefined&&draft.savedAt!==''&&!Number.isFinite(Date.parse(draft.savedAt)))return false;
    return true;
  }
  function validateWizardDrafts(value){return isObject(value)&&Object.values(value).every(validateWizardDraft);}
  function validateAuditTrail(value){return Array.isArray(value)&&value.every(entry=>scalarObject(entry));}
  function validateWeeklyState(value){return isObject(value)&&Object.values(value).every(state=>isObject(state)&&Object.values(state).every(v=>v===null||['string','number','boolean'].includes(typeof v)));}
  function validateFavourites(value){return Array.isArray(value)&&value.every(f=>isObject(f)&&typeof f.name==='string'&&validateOrderList(f.orders)&&(f.pathway===undefined||typeof f.pathway==='string')&&(f.savedAt===undefined||typeof f.savedAt==='string'));}
  function validateRecord(record){
    if(!isObject(record))return {valid:false,reason:'record must be an object'};
    if(typeof record.id!=='string'||!record.id.trim())return {valid:false,reason:'record ID is missing'};
    if(!isObject(record.patient))return {valid:false,reason:'patient data is missing'};
    if(record.revision!==undefined&&(!Number.isSafeInteger(Number(record.revision))||Number(record.revision)<1))return {valid:false,reason:'record revision must be a positive integer'};
    if(record.planRevision!==undefined&&(!Number.isSafeInteger(Number(record.planRevision))||Number(record.planRevision)<0))return {valid:false,reason:'plan revision must be a non-negative integer'};
    if(record.history!==undefined&&!Array.isArray(record.history))return {valid:false,reason:'history must be an array'};
    if(record.treatmentOrders!==undefined&&!validateOrderList(record.treatmentOrders))return {valid:false,reason:'treatmentOrders must be a list of valid order objects'};
    if(record.staffChecklistDone!==undefined&&(!Array.isArray(record.staffChecklistDone)||record.staffChecklistDone.some(x=>!Number.isSafeInteger(x)||x<0)))return {valid:false,reason:'staff checklist must contain non-negative task indexes'};
    if(record.history&&!validateAuditTrail(record.history))return {valid:false,reason:'history contains an invalid entry'};
    for(const [key,value] of Object.entries(record.patient)){
      if(key==='instability'){
        if(!Array.isArray(value)||value.some(v=>typeof v!=='string'))return {valid:false,reason:'clinical instability flags must be an array of text values'};
        continue;
      }
      if(value!==null&&!['string','number','boolean'].includes(typeof value))return {valid:false,reason:`invalid patient field: ${key}`};
      if(typeof value==='number'&&!Number.isFinite(value))return {valid:false,reason:`patient field ${key} must be a finite number`};
    }
    if(record.doctorReview!==undefined&&record.doctorReview!==null&&(!isObject(record.doctorReview)||Object.values(record.doctorReview).some(v=>v!==null&&!['string','number','boolean'].includes(typeof v))))return {valid:false,reason:'doctor review fields are invalid'};
    return {valid:true,reason:''};
  }
  function validateProfile(profile){
    if(!isObject(profile))return {valid:false,reason:'staff profile must be an object'};
    if(typeof profile.id!=='string'||!profile.id.trim())return {valid:false,reason:'staff profile ID is missing'};
    if(typeof profile.name!=='string'||!profile.name.trim())return {valid:false,reason:'staff profile name is missing'};
    if(profile.role!==undefined&&profile.role!=='staff')return {valid:false,reason:'profile role must be staff'};
    if(profile.active!==undefined&&typeof profile.active!=='boolean')return {valid:false,reason:'profile active flag must be true or false'};
    if(profile.revision!==undefined&&(!Number.isSafeInteger(Number(profile.revision))||Number(profile.revision)<1))return {valid:false,reason:'profile revision must be a positive integer'};
    for(const key of ['createdAt','updatedAt','importedAt'])if(profile[key]!==undefined&&profile[key]!==''&&!Number.isFinite(Date.parse(profile[key])))return {valid:false,reason:`profile ${key} timestamp is invalid`};
    return {valid:true,reason:''};
  }
  function timeOf(value){for(const key of ['updatedAt','approvedAt','createdAt','backedUpAt']){const t=Date.parse(value?.[key]||'');if(Number.isFinite(t))return t;}return 0;}
  function compareRecordVersions(current,incoming){
    const a=Number.isSafeInteger(Number(current?.revision))&&Number(current.revision)>0?Number(current.revision):0;
    const b=Number.isSafeInteger(Number(incoming?.revision))&&Number(incoming.revision)>0?Number(incoming.revision):0;
    if(a&&b){if(b<a)return {decision:'stale',reason:`incoming revision ${b} is older than local revision ${a}`};if(b>a)return {decision:'newer',reason:`incoming revision ${b} is newer than local revision ${a}`};const at=timeOf(incoming),bt=timeOf(current);if(at>bt)return {decision:'conflict',reason:'same revision has a later incoming timestamp'};return {decision:'same',reason:'same or older revision'};}
    const at=timeOf(incoming),bt=timeOf(current);if(at&&bt&&at<bt)return {decision:'stale',reason:'incoming file timestamp is older'};if(at&&bt&&at>bt)return {decision:'legacy-confirm',reason:'legacy file has no revision number'};return {decision:'legacy-confirm',reason:'revision metadata is missing'};
  }
  function compareProfileVersions(current,incoming){return compareRecordVersions({...current,id:current?.id,updatedAt:current?.updatedAt||current?.createdAt},{...incoming,id:incoming?.id,updatedAt:incoming?.updatedAt||incoming?.createdAt});}
  function isBackupDue(state,now,interval){const raw=state?.lastBackupAt||state?.dueFrom||state?.initializedAt;const time=Date.parse(raw||'');if(!Number.isFinite(time)||time>now+300000)return true;return now-time>=interval;}
  async function sha256Hex(text){if(!root.crypto?.subtle)throw new Error('SHA-256 integrity checking needs a secure browser context (HTTPS or localhost).');const bytes=new TextEncoder().encode(String(text));const hash=await root.crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  return {validateRecord,validateProfile,compareRecordVersions,compareProfileVersions,isBackupDue,sha256Hex,validateOrderList,validateDraftMap,validateWizardDraft,validateWizardDrafts,validateAuditTrail,validateWeeklyState,validateFavourites};
});
