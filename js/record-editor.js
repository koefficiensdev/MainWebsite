// Form fields retain record IDs and unedited server fields; no JSON is exposed.
export function recordEditor(host,{fields,label,empty=()=>({}),max=80}){
  const list=document.createElement('div'),add=document.createElement('button');add.type='button';add.className='secondary';add.textContent='+ '+label;host.append(list,add);let originals=[];
  function row(value){const box=document.createElement('fieldset');box.className='record-editor-row';box.dataset.row='';
    for(const field of fields){const wrap=document.createElement('label');wrap.textContent=field.label;const input=document.createElement(field.type==='textarea'?'textarea':field.options?'select':'input');input.dataset.field=field.key;
      if(field.options)for(const option of field.options){const el=document.createElement('option');el.value=option;el.textContent=option;input.append(el);}else if(field.type!=='textarea')input.type=field.type||'text';
      if(field.type==='checkbox')input.checked=value[field.key]===true;else input.value=value[field.key]??field.default??'';
      for(const key of ['min','max','step','maxLength'])if(field[key]!==undefined)input[key]=field[key];if(field.type==='textarea')input.rows=3;input.required=field.required===true;wrap.append(input);box.append(wrap);
    }
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Eltávolítás';remove.addEventListener('click',()=>{const index=[...list.children].indexOf(box);originals.splice(index,1);box.remove();add.disabled=originals.length>=max;});box.append(remove);list.append(box);
  }
  add.addEventListener('click',()=>{if(originals.length>=max)return;const value=empty();originals.push(value);row(value);add.disabled=originals.length>=max;});
  return {set(values=[]){originals=values.map(v=>({...v}));list.replaceChildren();originals.forEach(row);add.disabled=originals.length>=max;},get(){return [...list.children].map((box,index)=>{const value={...originals[index]};for(const field of fields){const input=box.querySelector(`[data-field="${field.key}"]`);value[field.key]=field.type==='checkbox'?input.checked:field.type==='number'?Number(input.value):input.value.trim();}return value;});}};
}
