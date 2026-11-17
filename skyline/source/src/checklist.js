import {MOVES} from './moves.js';
export const ACTION_LIST = [
  ['Guard','Guard stance','Hold Block on ground'],['BlockHit','Block an attack','Face the enemy and hold Block'],
  ['Jump','Jump','Jump on ground'],['DoubleJump','Double jump','Jump again in air'],
  ...Object.values(MOVES).map(m=>[m.id,m.name,
    m.id==='G_Launcher'?'↑ + Attack':m.id==='A_Relaunch'?'Air ↑ + Attack':m.id==='G_Sweep'?'↓ + Attack':m.id==='A_Plunge'?'Air ↓ + Attack':
    m.id==='G_Counter'?'Perfect dodge → Attack':m.id==='G_Charge'?'Hold, release Attack':m.kind==='Dodge'?(m.id==='G_Dodge'?'Dodge on ground':'Dodge in air'):
    m.id.includes('DashAttack')?'Dodge → Attack':'Tap Attack in sequence']),
  ['PerfectDodge','Perfect dodge','Dodge just as a strike overlaps'],
  ['A_Chase','Air Chase','Launch → Jump'],['A_EnemyStep','Enemy Step','Air hit → nearby Jump'],
];
export function bindChecklist(game){
  const list=document.querySelector('#action-list'),summary=document.querySelector('#checklist-count'),toast=document.querySelector('#action-toast');
  const rows=new Map();
  for(const [id,name,hint] of ACTION_LIST){
    const row=document.createElement('li');row.dataset.move=id;row.title=hint;
    const status=document.createElement('span');status.className='check-mark';status.textContent='○';status.setAttribute('aria-hidden','true');
    const text=document.createElement('span');text.textContent=name;
    row.append(status,text);list.append(row);rows.set(id,row);
  }
  let previous='',lastToast=null;
  return ()=>{
    const signature=[...game.performed].join(',');
    if(signature!==previous || !summary.textContent){
      previous=signature;
      for(const [id,row] of rows){const done=game.performed.has(id);row.classList.toggle('done',done);row.querySelector('.check-mark').textContent=done?'✓':'○';row.setAttribute('aria-label',`${row.title}: ${done?'performed':'not yet performed'}`);}
      summary.textContent=`${ACTION_LIST.filter(([id])=>game.performed.has(id)).length}/${ACTION_LIST.length}`;
    }
    if(game.lastPerformed!==lastToast){
      lastToast=game.lastPerformed;
      const entry=ACTION_LIST.find(([id])=>id===lastToast?.id);
      toast.textContent=entry?`${lastToast.first?'✓ First time: ':''}${entry[1]}`:'';
    }
    toast.hidden=!game.lastPerformed || game.time-game.lastPerformed.time>1.2;
  };
}
