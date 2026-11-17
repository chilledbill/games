import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeSettings,loadSettings,saveSettings,resetSettings,DEFAULT_SETTINGS} from '../src/settings.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),m};};

test('sanitize clamps ranges, rejects wrong types and drops unknown keys',()=>{
  assert.deepEqual(sanitizeSettings(null),{...DEFAULT_SETTINGS});
  assert.deepEqual(sanitizeSettings([1,2]),{...DEFAULT_SETTINGS});
  const s=sanitizeSettings({controlScale:9,controlOpacity:-3,reducedEffects:'yes',hp:1,focus:100});
  assert.deepEqual(s,{controlScale:1.15,controlOpacity:.4,reducedEffects:false});
  assert.equal(sanitizeSettings({controlScale:NaN}).controlScale,1);
  assert.equal(sanitizeSettings({controlScale:.1}).controlScale,.8);
});
test('save and load round trip; only presentation keys are persisted',()=>{
  const st=memory();
  assert.equal(saveSettings({controlScale:1.1,controlOpacity:.7,reducedEffects:true,focus:100,hp:5},st),true);
  assert.deepEqual(loadSettings(st),{controlScale:1.1,controlOpacity:.7,reducedEffects:true});
  assert.deepEqual(Object.keys(JSON.parse(st.m.get('skyline.settings.v1')).values).sort(),['controlOpacity','controlScale','reducedEffects']);
});
test('malformed JSON, wrong version and blocked storage fall back to defaults',()=>{
  const bad=memory();bad.setItem('skyline.settings.v1','{not json');
  assert.deepEqual(loadSettings(bad),{...DEFAULT_SETTINGS});
  const old=memory();old.setItem('skyline.settings.v1',JSON.stringify({version:99,values:{controlScale:1.1}}));
  assert.deepEqual(loadSettings(old),{...DEFAULT_SETTINGS});
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');}};
  assert.deepEqual(loadSettings(denied),{...DEFAULT_SETTINGS});
  assert.equal(saveSettings({controlScale:1},denied),false);
  assert.deepEqual(resetSettings(denied),{...DEFAULT_SETTINGS});
  assert.deepEqual(loadSettings(null),{...DEFAULT_SETTINGS});
});
test('reset removes saved values',()=>{
  const st=memory();saveSettings({controlScale:.9},st);resetSettings(st);
  assert.deepEqual(loadSettings(st),{...DEFAULT_SETTINGS});assert.equal(st.m.size,0);
});
