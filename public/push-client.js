(() => {
  'use strict';
  const VAPID_URL='/api/push/public-key', SUB_URL='/api/push/subscribe', STATUS_URL='/api/push/status', TEST_URL='/api/push/test';
  const $=s=>document.querySelector(s);
  function b64ToBytes(base64){const padding='='.repeat((4-base64.length%4)%4);const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
  async function jsonFetch(url,opts={}){const r=await fetch(url,{credentials:'include',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);return j;}
  async function getUser(){try{return (await jsonFetch('/api/auth/me')).user||null}catch{return null}}
  function makeButton(){let b=$('#techaviPushButton');if(b)return b;b=document.createElement('button');b.id='techaviPushButton';b.className='push-manage';b.type='button';b.textContent='🔔 Bildirimleri Aç';document.body.appendChild(b);return b;}
  async function getReadyRegistration(){await navigator.serviceWorker.register('/sw.js?v=8',{scope:'/'});return navigator.serviceWorker.ready;}
  async function currentStatus(){const user=await getUser();if(!user)return{user:null};let server={};try{server=await jsonFetch(STATUS_URL)}catch{}let sub=null;if('serviceWorker'in navigator){try{const reg=await getReadyRegistration();sub=await reg.pushManager.getSubscription()}catch{}}return{user,server,sub,permission:Notification.permission};}
  async function syncSubscription(force=false){
    if(!window.isSecureContext)throw new Error('Bildirimler HTTPS bağlantısında çalışır.');
    const user=await getUser();if(!user)throw new Error('Önce TechAvı hesabına giriş yapmalısın.');
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Bu tarayıcı push bildirimlerini desteklemiyor.');
    const keyData=await jsonFetch(VAPID_URL);if(!keyData.publicKey)throw new Error('Sunucuda VAPID anahtarları eksik.');
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Bildirim izni verilmedi. Tarayıcı/site ayarlarından izin ver.');
    const reg=await getReadyRegistration();let sub=await reg.pushManager.getSubscription();
    if(force&&sub){try{await jsonFetch(SUB_URL,{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})})}catch{}try{await sub.unsubscribe()}catch{}sub=null;}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(keyData.publicKey)});
    await jsonFetch(SUB_URL,{method:'POST',body:JSON.stringify({subscription:sub.toJSON()})});
    return sub;
  }
  async function openManager(){
    const user=await getUser();if(!user){alert('Önce TechAvı hesabına giriş yapmalısın.');return;}
    let st;try{st=await currentStatus()}catch(e){alert(e.message);return;}
    const text=`Bildirim izni: ${st.permission==='granted'?'Açık':st.permission==='denied'?'Engelli':'Sorulmadı'}\nBu cihaz aboneliği: ${st.sub?'Var':'Yok'}\nSunucudaki abonelik: ${st.server?.subscriptions||0}`;
    const choice=confirm(text+'\n\nTamam = bildirimi yeniden bağla ve test et\nİptal = yalnızca durumu göster');
    if(!choice)return;
    const b=makeButton();b.disabled=true;b.textContent='⏳ Bağlanıyor…';
    try{await syncSubscription(true);const t=await jsonFetch(TEST_URL,{method:'POST',body:'{}'});b.textContent='✅ Bildirimler Açık';setTimeout(()=>b.textContent='🔔 Bildirimleri Yönet',1800);if(!t?.stats?.sent)alert('Abonelik kaydedildi ancak test bildirimi gönderilemedi.');}
    catch(e){b.textContent='⚠️ Bildirimi Düzelt';alert('Bildirim kurulamadı: '+e.message);}finally{b.disabled=false;}
  }
  async function boot(){
    if(!window.isSecureContext||!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))return;
    const user=await getUser();if(!user)return;const b=makeButton();b.onclick=openManager;
    try{const st=await currentStatus();if(st.permission==='granted'&&st.sub){b.textContent='🔔 Bildirimleri Yönet';await jsonFetch(SUB_URL,{method:'POST',body:JSON.stringify({subscription:st.sub.toJSON()})}).catch(()=>{});}else if(st.permission==='denied')b.textContent='⚠️ Bildirim Engelli';}
    catch{b.textContent='🔔 Bildirimleri Aç';}
  }
  window.TechaviPush={enable:()=>syncSubscription(false),repair:()=>syncSubscription(true),status:currentStatus,test:()=>jsonFetch(TEST_URL,{method:'POST',body:'{}'})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();setInterval(boot,15000);
})();
