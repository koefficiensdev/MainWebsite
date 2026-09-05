const form=document.querySelector('[data-demo-form]');
const status=document.querySelector('[data-demo-status]');
const queue=document.querySelector('[data-demo-queue]');
form?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  const kind=document.body.dataset.demoKind||'igény',number=`D-${Math.floor(100+Math.random()*899)}`;
  if(queue){const item=document.createElement('div');item.className='queue-item';item.innerHTML=`<div><strong>Új bemutató ${kind}</strong><small>${number} · épp most</small></div><span class="status">Átnézésre vár</span>`;queue.prepend(item);}
  form.innerHTML=`<div class="success" tabindex="-1"><div class="success-icon" aria-hidden="true">✓</div><h3>A bemutató igény beérkezett</h3><p>Azonosító: <strong>${number}</strong></p><p>Valós rendszerben a vállalkozó most átnézné az adatokat. Időpont, ajánlat vagy munka csak az ő döntése után válna véglegessé.</p><a class="primary" href="https://ovexi.hu/#javaslat">Ilyen rendszert szeretnék</a></div>`;
  form.querySelector('.success').focus();
});
document.querySelectorAll('[data-scroll-form]').forEach(button=>button.addEventListener('click',()=>document.querySelector('#proba')?.scrollIntoView({behavior:'smooth'})));
