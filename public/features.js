(() => {
  'use strict';

  const STORE_LABELS = {trendyol:'Trendyol',hepsiburada:'Hepsiburada',n11:'n11',amazon:'Amazon Türkiye',mediamarkt:'MediaMarkt',teknosa:'Teknosa',vatan:'Vatan Bilgisayar',pazarama:'Pazarama',ciceksepeti:'Çiçeksepeti',boyner:'Boyner',a101:'A-101',bim:'BİM',carrefoursa:'CarrefourSA',flo:'FLO',getir:'Getir',hm:'H&M',ikea:'IKEA',migros:'Migros',watsons:'Watsons'};
  const featureState = {
    filters:{min:'',max:'',store:'all',brand:'all',category:'all',discount:0,stock:false,sort:'relevance'},
    recent: JSON.parse(localStorage.getItem('techavi_recent_searches') || '[]'),
    popular: [], discover: [], notifications: []
  };

  const pKey = p => String(p.productKey || `${storeKey(p.store)}:${p.id || p.product_id || encodeURIComponent(normalizeClient(p.title))}`);
  const normalizeClient = s => String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9çğıöşü\s-]/gi,' ').replace(/\s+/g,' ').trim();
  const categoryOf = p => p.category || (()=>{const t=normalizeClient(p.title);if(/rtx|radeon|geforce|ekran kart/.test(t))return'Ekran Kartı';if(/laptop|notebook|macbook/.test(t))return'Laptop';if(/iphone|galaxy|telefon|smartphone|xiaomi|redmi|poco/.test(t))return'Telefon';if(/\bssd\b|nvme/.test(t))return'SSD';if(/\bram\b|ddr4|ddr5/.test(t))return'RAM';if(/monitor|monitör/.test(t))return'Monitör';if(/ryzen|core i[3579]|işlemci|cpu/.test(t))return'İşlemci';if(/anakart|motherboard/.test(t))return'Anakart';if(/playstation|ps5|xbox|switch/.test(t))return'Konsol';if(/buzdolabı|çamaşır|bulaşık|kurutma|fırın/.test(t))return'Beyaz Eşya';return'Diğer';})();
  const brandOf = p => String(p.brand || '').trim() || (String(p.title||'').split(/\s+/)[0] || 'Diğer');
  const pctDrop = p => { const old=Number(p.originalPrice||p.original_price||0), now=Number(p.price||p.current_price||0); return old>now&&now>0 ? Math.round((1-now/old)*100) : Number(p.drop_pct||p.day_drop_pct||0); };

  function addShell() {
    const head = document.querySelector('.head-actions');
    if (head && !document.getElementById('notifyBtn')) {
      head.insertAdjacentHTML('afterbegin', `<button id="notifyBtn" class="ghost" title="Bildirim merkezi">🔔 <i id="notifyCount">0</i></button><button id="themeBtn" class="ghost" title="Tema">☀️</button>`);
    }
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && !document.getElementById('smartTools')) {
      toolbar.insertAdjacentHTML('afterend', `
      <section id="smartTools" class="smart-tools">
        <div class="quick-row"><div id="recentSearches" class="quick-searches"></div><div id="popularSearches" class="quick-searches"></div></div>
        <div class="category-strip" id="categoryStrip"></div>
        <div class="filterbar">
          <input id="fMin" inputmode="decimal" placeholder="Min TL"><input id="fMax" inputmode="decimal" placeholder="Max TL">
          <select id="fStore"><option value="all">Tüm mağazalar</option></select>
          <select id="fBrand"><option value="all">Tüm markalar</option></select>
          <select id="fDiscount"><option value="0">Tüm indirimler</option><option value="10">%10+</option><option value="20">%20+</option><option value="30">%30+</option><option value="50">%50+</option></select>
          <select id="fSort"><option value="relevance">Önerilen</option><option value="cheap">En ucuz</option><option value="expensive">En pahalı</option><option value="drop">En çok düşen</option><option value="discount">En yüksek indirim</option><option value="new">En yeni</option></select>
          <label class="stock-check"><input id="fStock" type="checkbox"> Stokta</label><button id="clearFilters" class="ghost">Temizle</button>
        </div>
      </section>`);
    }
    const dash = document.querySelector('.dashboard');
    if (dash && !document.getElementById('todayDrops')) {
      dash.insertAdjacentHTML('beforebegin', `<section id="todayDrops" class="today-drops"><div class="section-head"><div><span class="eyebrow">BUGÜN NE DÜŞTÜ?</span><h2>Günün dikkat çeken fiyat hareketleri</h2></div><button class="ghost" data-feature-page="today">Tümünü gör</button></div><div id="todayDropGrid" class="mini-grid"><div class="analysis">Fiyat geçmişi biriktikçe burada gerçek düşüşler görünecek.</div></div></section>`);
    }
  }

  function initTheme(){
    const saved=localStorage.getItem('techavi_theme')||'dark'; document.documentElement.dataset.theme=saved;
    const b=document.getElementById('themeBtn'); if(!b)return; b.textContent=saved==='light'?'🌙':'☀️';
    b.onclick=()=>{const n=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=n;localStorage.setItem('techavi_theme',n);b.textContent=n==='light'?'🌙':'☀️';};
  }

  async function loadSearchMeta(){
    try{const j=await api('/api/searches');featureState.popular=j.popular||[];if(j.recent?.length) featureState.recent=j.recent.map(x=>x.query);renderQuickSearches();}catch{renderQuickSearches();}
  }
  function rememberSearch(q){q=String(q||'').trim();if(q.length<2)return;featureState.recent=[q,...featureState.recent.filter(x=>normalizeClient(x)!==normalizeClient(q))].slice(0,10);localStorage.setItem('techavi_recent_searches',JSON.stringify(featureState.recent));renderQuickSearches();}
  function renderQuickSearches(){
    const r=document.getElementById('recentSearches'),p=document.getElementById('popularSearches');
    if(r)r.innerHTML=featureState.recent.length?`<b>Son aramalar:</b>${featureState.recent.slice(0,5).map(q=>`<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}`:'';
    if(p)p.innerHTML=featureState.popular.length?`<b>Popüler:</b>${featureState.popular.slice(0,5).map(x=>`<button data-q="${esc(x.query)}">${esc(x.query)}</button>`).join('')}`:`<b>Popüler:</b>${['RTX 5070','iPhone 17','PS5'].map(q=>`<button data-q="${q}">${q}</button>`).join('')}`;
    document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{document.getElementById('search').value=b.dataset.q;searchProducts(b.dataset.q);});
  }

  const originalSearchProducts = searchProducts;
  searchProducts = async function(q){ rememberSearch(q); return originalSearchProducts(q); };

  const originalRender = render;
  render = function(){
    const raw=state.allProducts;
    let items=raw.slice(); const f=featureState.filters;
    items=items.filter(p=>{
      const price=Number(p.price||0), d=pctDrop(p), cat=categoryOf(p), brand=brandOf(p);
      if(f.min!==''&&price<Number(f.min))return false;if(f.max!==''&&price>Number(f.max))return false;
      if(f.store!=='all'&&storeKey(p.store)!==f.store)return false;if(f.brand!=='all'&&brand!==f.brand)return false;if(f.category!=='all'&&cat!==f.category)return false;
      if(d<Number(f.discount||0))return false;if(f.stock&&!p.stock)return false;return true;
    });
    if(f.sort==='cheap')items.sort((a,b)=>Number(a.price||Infinity)-Number(b.price||Infinity));
    if(f.sort==='expensive')items.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
    if(f.sort==='drop'||f.sort==='discount')items.sort((a,b)=>pctDrop(b)-pctDrop(a));
    if(f.sort==='new')items.reverse();
    state.allProducts=items; try{originalRender();}finally{state.allProducts=raw;}
    decorateCards(); refreshFilterOptions(raw); renderCategories(raw);
  };

  function decorateCards(){
    document.querySelectorAll('.card').forEach(card=>{
      const id=decodeURIComponent(card.dataset.id||''); const p=state.allProducts.find(x=>String(x.id)===String(id)); if(!p)return;
      const info=card.querySelector('.info'); if(!info||info.querySelector('.price-meta'))return;
      const d=pctDrop(p); const label=d>0?`📉 %${d} düştü`:'Takipte';
      info.insertAdjacentHTML('afterbegin',`<div class="price-meta"><span>${esc(categoryOf(p))}</span><b>${label}</b></div>`);
    });
  }
  function refreshFilterOptions(items){
    const store=document.getElementById('fStore'),brand=document.getElementById('fBrand'); if(!store||!brand)return;
    const stores=[...new Set(items.map(p=>storeKey(p.store)).filter(Boolean))]; const brands=[...new Set(items.map(brandOf).filter(Boolean))].slice(0,80);
    const sv=store.value,bv=brand.value;store.innerHTML='<option value="all">Tüm mağazalar</option>'+stores.map(x=>`<option value="${esc(x)}">${esc(STORE_LABELS[x]||x)}</option>`).join('');brand.innerHTML='<option value="all">Tüm markalar</option>'+brands.map(x=>`<option>${esc(x)}</option>`).join('');store.value=stores.includes(sv)?sv:'all';brand.value=brands.includes(bv)?bv:'all';
  }
  function renderCategories(items){const el=document.getElementById('categoryStrip');if(!el)return;const cats=[...new Set(items.map(categoryOf))].filter(Boolean);el.innerHTML=`<button data-cat="all" class="${featureState.filters.category==='all'?'active':''}">Tümü</button>`+cats.map(c=>`<button data-cat="${esc(c)}" class="${featureState.filters.category===c?'active':''}">${esc(c)}</button>`).join('');el.querySelectorAll('button').forEach(b=>b.onclick=()=>{featureState.filters.category=b.dataset.cat;render();});}
  function bindFilters(){
    const map=[['fMin','min','input'],['fMax','max','input'],['fStore','store','change'],['fBrand','brand','change'],['fDiscount','discount','change'],['fSort','sort','change']];
    map.forEach(([id,key,ev])=>{const e=document.getElementById(id);if(e)e.addEventListener(ev,()=>{featureState.filters[key]=e.value;render();});});
    document.getElementById('fStock')?.addEventListener('change',e=>{featureState.filters.stock=e.target.checked;render();});
    document.getElementById('clearFilters')?.addEventListener('click',()=>{featureState.filters={min:'',max:'',store:'all',brand:'all',category:'all',discount:0,stock:false,sort:'relevance'};['fMin','fMax'].forEach(id=>document.getElementById(id).value='');document.getElementById('fStock').checked=false;render();});
  }

  function chartSvg(history){
    if(!history?.length)return '<div class="analysis">Bu ürün için henüz yeterli fiyat geçmişi yok. TechAvı ürünü gördükçe geçmiş otomatik birikir.</div>';
    const vals=history.map(x=>Number(x.price)).filter(Number.isFinite);if(!vals.length)return '';
    const min=Math.min(...vals),max=Math.max(...vals),w=700,h=220,pad=22,range=max-min||1;
    const points=vals.map((v,i)=>`${pad+(i/(Math.max(1,vals.length-1)))*(w-pad*2)},${h-pad-((v-min)/range)*(h-pad*2)}`).join(' ');
    return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Fiyat geçmişi grafiği"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="chart-axis"/><polyline points="${points}" class="chart-line" fill="none"/><circle cx="${points.split(' ').at(-1).split(',')[0]}" cy="${points.split(' ').at(-1).split(',')[1]}" r="5" class="chart-dot"/></svg><div class="chart-legend"><span>En düşük: <b>${money(min)}</b></span><span>En yüksek: <b>${money(max)}</b></span></div></div>`;
  }
  function qualityLabel(current,stats){const avg=Number(stats?.avg_price||0);if(!avg)return{label:'Yeni takip',cls:'neutral'};const diff=(current-avg)/avg*100;if(diff<=-8)return{label:'İyi fiyat',cls:'good'};if(diff>=8)return{label:'Yüksek fiyat',cls:'high'};return{label:'Normal fiyat',cls:'normal'};}
  function similarProducts(p){const toks=normalizeClient(p.title).split(' ').filter(x=>x.length>2).slice(0,6);return state.allProducts.filter(x=>x!==p).map(x=>({p:x,score:toks.filter(t=>normalizeClient(x.title).includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(a.p.price)-Number(b.p.price)).slice(0,6).map(x=>x.p);}
  function comparisonProducts(p){const toks=normalizeClient(p.title).split(' ').filter(x=>x.length>2).slice(0,5);return state.allProducts.map(x=>({p:x,score:toks.filter(t=>normalizeClient(x.title).includes(t)).length})).filter(x=>x.score>=Math.max(2,Math.ceil(toks.length*.45))).sort((a,b)=>Number(a.p.price)-Number(b.p.price)).slice(0,10).map(x=>x.p);}

  openProduct = async function(id){
    const p=state.allProducts.find(x=>String(x.id)===String(id));if(!p)return;
    const key=pKey(p); state.selected=p;
    document.getElementById('modalBody').innerHTML=`<div class="detail feature-detail"><div class="detail-head"><div class="detail-emoji"><div class="image-frame">${productImage(p,'detail-image')}</div></div><div class="detail-main"><div class="cat">${esc(categoryOf(p))} · ${esc(storeName(p.store))}</div><h2>${esc(p.title)}</h2><div class="detail-price">${money(p.price)}</div><div id="qualityBadge" class="quality neutral">Fiyat analiz ediliyor…</div><div class="actions"><button class="primary" id="alarmOpen">🔔 Akıllı Alarm</button><button id="favOpen">${state.favorites.has(String(p.id))?'♥ Favoride':'♡ Favorile'}</button>${p.url?`<a class="store-link compact" href="${esc(p.url)}" target="_blank" rel="noopener">Mağazaya Git ↗</a>`:''}</div></div></div><div class="history-controls"><b>📈 Fiyat Geçmişi</b><div><button data-days="7">7 gün</button><button data-days="30" class="active">30 gün</button><button data-days="180">6 ay</button></div></div><div id="historyArea"><div class="analysis">Yükleniyor…</div></div><div id="comparisonArea"></div><div id="similarArea"></div></div>`;
    document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');
    document.getElementById('alarmOpen').onclick=()=>openAlarm(p);
    document.getElementById('favOpen').onclick=()=>toggleFavorite(p,document.getElementById('favOpen'));
    const loadHist=async days=>{try{const j=await api(`/api/history?key=${encodeURIComponent(key)}&days=${days}`);document.getElementById('historyArea').innerHTML=chartSvg(j.history);const q=qualityLabel(Number(p.price),j.stats);const qb=document.getElementById('qualityBadge');qb.className=`quality ${q.cls}`;qb.textContent=q.label;const allMin=Number(j.stats?.min_price||0);if(allMin&&Number(p.price)<=allMin)qb.textContent+=' · 🏆 Tüm zamanların dip fiyatı';}catch(e){document.getElementById('historyArea').innerHTML=`<div class="analysis">${esc(e.message)}</div>`;}};
    document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-days]').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadHist(b.dataset.days);});loadHist(30);
    const comp=comparisonProducts(p);document.getElementById('comparisonArea').innerHTML=`<div class="offer-head"><h3>🛒 Mağaza karşılaştırması</h3><span>${comp.length} benzer sonuç</span></div><div class="compare-table">${comp.length?comp.map((o,i)=>`<div class="compare-row ${i===0?'cheapest':''}"><span><b>${i===0?'🥇 ':''}${esc(storeName(o.store))}</b><small>${esc(o.title)}</small></span><strong>${money(o.price)}</strong>${o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener">Git ↗</a>`:''}</div>`).join(''):'<div class="analysis">Aynı ürüne ait başka mağaza sonucu bulunamadı.</div>'}</div>`;
    const sim=similarProducts(p);document.getElementById('similarArea').innerHTML=`<div class="offer-head"><h3>✨ Benzer ürünler</h3></div><div class="similar-grid">${sim.map(x=>`<button data-sim="${esc(String(x.id))}"><span>${productImage(x,'similar-image')}</span><b>${esc(x.title)}</b><strong>${money(x.price)}</strong></button>`).join('')}</div>`;document.querySelectorAll('[data-sim]').forEach(b=>b.onclick=()=>openProduct(b.dataset.sim));
  };

  async function toggleFavorite(p,button){const id=String(p.id);const adding=!state.favorites.has(id);if(adding)state.favorites.add(id);else state.favorites.delete(id);saveFavs();if(state.user){try{if(adding)await api('/api/favorites',{method:'POST',body:JSON.stringify({productKey:pKey(p),product:p})});else await api(`/api/favorites/${encodeURIComponent(pKey(p))}`,{method:'DELETE'});}catch(e){toast('Favori sunucuya kaydedilemedi: '+e.message);}}if(button)button.textContent=adding?'♥ Favoride':'♡ Favorile';render();}

  showFavorites = async function(){
    let items=[];if(state.user){try{const j=await api('/api/favorites');items=(j.favorites||[]).map(x=>x.snapshot);}catch{}}if(!items.length)items=state.allProducts.filter(p=>state.favorites.has(String(p.id)));
    document.getElementById('modalBody').innerHTML=`<div class="auth-box wide-modal"><h2>♡ Favoriler / Takip Listesi</h2><p class="muted">Favoriler hesabına bağlıysa cihazlar arasında senkronize olur. Takip edilen ürünlerin mevcut ve eski fiyatlarını burada görebilirsin.</p><div class="favorite-list">${items.length?items.map(p=>`<div class="favorite-row"><div class="favorite-pic">${productImage(p,'similar-image')}</div><span><b>${esc(p.title)}</b><small>${esc(storeName(p.store))} · Eski: ${money(p.originalPrice||p.original_price)} · Güncel: ${money(p.price||p.current_price)}</small></span><button class="primary" data-falarm="${esc(String(p.id||''))}">Alarm</button></div>`).join(''):'<div class="analysis">Henüz favori ürün yok.</div>'}</div></div>`;document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');
    document.querySelectorAll('[data-falarm]').forEach(b=>b.onclick=()=>{const p=items.find(x=>String(x.id||'')===b.dataset.falarm);if(p)openAlarm(p);});
  };

  openAlarm = function(p){
    if(!state.user){openAuth('login');toast('Alarm için önce giriş yapmalısın.');return;}state.selected=p;
    document.getElementById('modalBody').innerHTML=`<div class="auth-box alarm-box"><h2>🔔 Akıllı Alarm</h2><p><b>${esc(p.title)}</b><br>${esc(storeName(p.store))} · mevcut: <b>${money(p.price)}</b></p><label>Alarm türü</label><select id="alarmType"><option value="price">Hedef fiyata düşünce</option><option value="percent">Belirli yüzde düşünce</option><option value="low30">Son 30 günün en düşük fiyatına gelince</option><option value="stock">Stok gelince</option></select><div id="alarmDynamic"></div><button id="saveSmartAlarm" class="primary">Alarmı Kur</button><div id="alarmMsg" class="msg"></div><p class="muted">Bu alarm seçtiğin mağaza için çalışır: ${esc(storeName(p.store))}</p></div>`;
    document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');
    const dyn=()=>{const t=document.getElementById('alarmType').value;document.getElementById('alarmDynamic').innerHTML=t==='price'?'<label>Hedef fiyat (TL)</label><input id="alarmValue" inputmode="decimal" placeholder="Örn. 25.000">':t==='percent'?'<label>Düşüş yüzdesi</label><input id="alarmValue" inputmode="decimal" placeholder="Örn. 10">':t==='low30'?'<div class="analysis">TechAvı son 30 günlük kayıtlardaki en düşük fiyatı referans alır.</div>':'<div class="analysis">Ürün yeniden stokta göründüğünde bildirim gönderilir.</div>';};document.getElementById('alarmType').onchange=dyn;dyn();
    document.getElementById('saveSmartAlarm').onclick=async()=>{const t=document.getElementById('alarmType').value,v=Number(String(document.getElementById('alarmValue')?.value||'').replace(/\./g,'').replace(',','.'));const body={store:storeKey(p.store),title:p.title,url:p.url,productId:p.id,alarmType:t,baselinePrice:Number(p.price||0)};if(t==='price')body.targetPrice=v;if(t==='percent')body.percentDrop=v;try{await api('/api/alarms',{method:'POST',body:JSON.stringify(body)});document.getElementById('alarmMsg').textContent='✅ Akıllı alarm kuruldu.';await loadAlarms(true);}catch(e){document.getElementById('alarmMsg').textContent=e.message;}};
  };

  const originalLoadAlarms=loadAlarms;
  loadAlarms=async function(silent=false){if(silent)return originalLoadAlarms(true);if(!state.user){openAuth('login');return;}try{const j=await api('/api/alarms');const active=j.alarms.filter(a=>a.active);document.getElementById('alarmCount').textContent=active.length;document.getElementById('dashAlarm').textContent=active.length;const name=a=>a.alarm_type==='percent'?`%${a.percent_drop} düşüş`:a.alarm_type==='low30'?'30 gün dip fiyat':a.alarm_type==='stock'?'Stok alarmı':`Hedef ${money(a.target_price)}`;document.getElementById('modalBody').innerHTML=`<div class="auth-box wide-modal"><h2>🔔 Alarmlar ve Geçmiş</h2>${j.alarms.length?j.alarms.map(a=>`<div class="store-row"><span><b>${esc(a.title)}</b><small>${esc(STORE_LABELS[a.store]||a.store)} · ${name(a)} · Güncel: ${money(a.current_price)}${a.triggered_at?' · ✅ Tetiklendi':''}</small></span>${a.active?`<button class="danger" data-alarm-del="${a.id}">Kapat</button>`:'<span class="status-pill">Geçmiş</span>'}</div>`).join(''):'<div class="analysis">Henüz alarm yok.</div>'}</div>`;document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');document.querySelectorAll('[data-alarm-del]').forEach(b=>b.onclick=async()=>{await api(`/api/alarms/${b.dataset.alarmDel}`,{method:'DELETE'});loadAlarms(false);});}catch(e){toast(e.message);}};

  async function notifications(){if(!state.user){openAuth('login');return;}try{const j=await api('/api/notifications');featureState.notifications=j.notifications||[];document.getElementById('notifyCount').textContent=j.unread||0;document.getElementById('modalBody').innerHTML=`<div class="auth-box wide-modal"><h2>🔔 Bildirim Merkezi</h2>${featureState.notifications.length?featureState.notifications.map(n=>`<a class="notice-row ${n.read_at?'':'unread'}" href="${esc(n.url||'#')}" ${n.url?'target="_blank" rel="noopener"':''}><span>${n.type==='alarm'?'📉':'🔔'}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><small>${new Date(n.created_at).toLocaleString('tr-TR')}</small></div></a>`).join(''):'<div class="analysis">Henüz bildirim yok.</div>'}</div>`;document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');await api('/api/notifications/read',{method:'POST',body:'{}'});document.getElementById('notifyCount').textContent='0';}catch(e){toast(e.message);}}

  async function renderDiscover(mode='deals'){
    try{const j=await api(`/api/discover?mode=${encodeURIComponent(mode)}&limit=50`);const items=j.products||[];const title={deals:'🔥 Gerçek Fırsatlar',drops:'📉 En Çok Fiyatı Düşenler',lowest:'🏆 Dip Fiyatlar',today:'⚡ Bugün Ne Düştü?'}[mode]||'Fırsatlar';document.getElementById('modalBody').innerHTML=`<div class="auth-box wide-modal"><h2>${title}</h2><p class="muted">Bu liste TechAvı’nın gerçekten gözlemlediği fiyat geçmişinden hesaplanır; sahte indirim verisi üretilmez.</p><div class="discover-list">${items.length?items.map(p=>`<div class="discover-row"><div class="favorite-pic">${p.image?`<img src="${esc(p.image)}" alt="">`:'🛍️'}</div><span><b>${esc(p.title)}</b><small>${esc(STORE_LABELS[p.store]||p.store)} · ${esc(p.category||'Diğer')} · Ort.: ${money(p.avg30)} · 30g dip: ${money(p.min30)}</small></span><strong>${money(p.current_price)}</strong><em>${Number(p.drop_pct||p.day_drop_pct||0)>0?'📉 %'+Number(p.drop_pct||p.day_drop_pct).toFixed(1):''}</em>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener">Git ↗</a>`:''}</div>`).join(''):'<div class="analysis">Henüz yeterli geçmiş veri yok. Aramalar ve takipler arttıkça bu bölüm otomatik dolar.</div>'}</div></div>`;document.getElementById('modal').classList.remove('hidden');document.body.classList.add('modal-open');}catch(e){toast(e.message);}}

  async function todayDrops(){try{const j=await api('/api/discover?mode=today&limit=4');const el=document.getElementById('todayDropGrid');const items=(j.products||[]).filter(x=>Number(x.day_drop_pct||0)>0);if(el&&items.length)el.innerHTML=items.map(p=>`<article class="mini-drop"><b>${esc(p.title)}</b><span>${esc(STORE_LABELS[p.store]||p.store)}</span><strong>${money(p.current_price)}</strong><em>📉 %${Number(p.day_drop_pct).toFixed(1)}</em></article>`).join('');}catch{}}

  function setupPages(){document.querySelectorAll('[data-page]').forEach(b=>{b.onclick=()=>{const m=b.dataset.page;if(m==='home'){closeModal();window.scrollTo({top:0,behavior:'smooth'});}else renderDiscover(m);};});document.querySelectorAll('[data-feature-page]').forEach(b=>b.onclick=()=>renderDiscover(b.dataset.featurePage));}

  async function enhanceAuth(){
    const originalOpenAuth=openAuth;
    openAuth=function(mode='login'){originalOpenAuth(mode);setTimeout(addGoogleButton,0);};
    const originalRenderAuthForm=renderAuthForm;
    renderAuthForm=function(mode){originalRenderAuthForm(mode);setTimeout(addGoogleButton,0);};
    async function addGoogleButton(){const host=document.getElementById('authForm');if(!host||host.querySelector('.google-login-wrap'))return;let cfg;try{cfg=await api('/api/config');}catch{return;}if(!cfg.googleClientId)return;const wrap=document.createElement('div');wrap.className='google-login-wrap';wrap.innerHTML='<div class="or"><span>veya</span></div><div id="googleButton"></div>';host.appendChild(wrap);if(!window.google?.accounts?.id){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}window.google.accounts.id.initialize({client_id:cfg.googleClientId,callback:async r=>{try{const j=await api('/api/auth/google',{method:'POST',body:JSON.stringify({credential:r.credential})});state.user=j.user;closeModal();renderAccount();toast('Google ile giriş yapıldı.');await loadAlarms(true);}catch(e){toast(e.message);}}});window.google.accounts.id.renderButton(document.getElementById('googleButton'),{theme:document.documentElement.dataset.theme==='light'?'outline':'filled_black',size:'large',width:300,text:'continue_with'});}
  }

  function bindHead(){document.getElementById('notifyBtn')?.addEventListener('click',notifications);document.getElementById('favBtn').onclick=showFavorites;}

  function syncFavoriteClicks(){document.addEventListener('click',e=>{const b=e.target.closest('[data-heart]');if(!b)return;setTimeout(()=>{const p=state.allProducts.find(x=>String(x.id)===String(b.dataset.heart));if(p&&state.user){const adding=state.favorites.has(String(p.id));(adding?api('/api/favorites',{method:'POST',body:JSON.stringify({productKey:pKey(p),product:p})}):api(`/api/favorites/${encodeURIComponent(pKey(p))}`,{method:'DELETE'})).catch(()=>{});}},20);},true);}

  async function boot(){addShell();initTheme();bindFilters();bindHead();setupPages();syncFavoriteClicks();enhanceAuth();loadSearchMeta();todayDrops();render();if(state.user)notificationsCountOnly();setInterval(notificationsCountOnly,60000);}
  async function notificationsCountOnly(){if(!state.user)return;try{const j=await api('/api/notifications');const n=document.getElementById('notifyCount');if(n)n.textContent=j.unread||0;}catch{}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
