// Presentation preferences only. Combat state (HP, Focus, cooldowns, holds, checklist) is never saved.
const KEY='skyline.settings.v1';
export const DEFAULT_SETTINGS=Object.freeze({controlScale:1,controlOpacity:1,reducedEffects:false});
const RANGES={controlScale:[.8,1.15],controlOpacity:[.4,1]};
const storageOrNull=()=>{try{return globalThis.localStorage??null;}catch{return null;}};
// Accepts anything; returns a complete, clamped settings object. Unknown keys are dropped.
export function sanitizeSettings(raw){
  const out={...DEFAULT_SETTINGS};
  if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    for(const [key,[lo,hi]] of Object.entries(RANGES)){
      const v=raw[key];if(typeof v==='number'&&Number.isFinite(v))out[key]=Math.min(hi,Math.max(lo,v));
    }
    if(typeof raw.reducedEffects==='boolean')out.reducedEffects=raw.reducedEffects;
  }
  return out;
}
export function loadSettings(storage=storageOrNull()){
  try{
    const text=storage?.getItem(KEY);if(!text)return {...DEFAULT_SETTINGS};
    const parsed=JSON.parse(text);
    return parsed?.version===1?sanitizeSettings(parsed.values):{...DEFAULT_SETTINGS};
  }catch{return {...DEFAULT_SETTINGS};}
}
export function saveSettings(values,storage=storageOrNull()){
  try{storage?.setItem(KEY,JSON.stringify({version:1,values:sanitizeSettings(values)}));return !!storage;}catch{return false;}
}
export function resetSettings(storage=storageOrNull()){
  try{storage?.removeItem(KEY);}catch{/* storage denied: defaults still work */}
  return {...DEFAULT_SETTINGS};
}
