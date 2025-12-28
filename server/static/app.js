let BASE_URL = localStorage.getItem('API_URL') || '';
// If running in Capacitor/Cordova (file:), default to localhost or specific URL if not set
if (location.protocol === 'file:' && !BASE_URL) {
   BASE_URL = 'http://10.0.2.2:4000'; // Android emulator localhost
}

let TOKEN = localStorage.getItem('TOKEN') || '';
let ROLE = localStorage.getItem('ROLE') || '';
function setToken(t, r){ 
  TOKEN = t; 
  localStorage.setItem('TOKEN', t); 
  if(r) { ROLE = r; localStorage.setItem('ROLE', r); }
}
async function api(path, opts={}){
  const headers = Object.assign({ 'Content-Type':'application/json' }, opts.headers||{});
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, Object.assign({}, opts, { headers }));
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Connection failed. Please check Server URL.');
    }
    throw err;
  }
  const ct = res.headers.get('content-type')||''; const text = await res.text(); let data=null; if (ct.includes('application/json')){ try{ data=JSON.parse(text);}catch{} }
  if(res.status===401 || res.status===403) { setToken('', ''); location.href='/ui/index.html'; }
  if(!res.ok) throw new Error((data&&data.error)||`HTTP ${res.status}`);
  return data;
}
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function show(el){ el.classList.remove('d-none'); }
function hide(el){ el.classList.add('d-none'); }
async function logout(){ try{ if(TOKEN){ await api('/api/auth/logout',{ method:'POST' }); } }catch{} setToken('', ''); location.href='/ui/index.html'; }
function bindLogout(){ const btn=qs('#logoutBtn'); if(btn){ btn.addEventListener('click', (e)=>{ e.preventDefault(); logout(); }); } }

function checkAuth(){
  const path = location.pathname;
  if(path.endsWith('index.html') || path==='/'){
    if(TOKEN) {
      if(ROLE==='admin') location.href='/ui/admin.html';
      else if(ROLE==='distributor' || ROLE==='staff') location.href='/ui/distributor.html';
      else if(ROLE==='retailer') location.href='/ui/retailer.html';
      else { setToken('', ''); location.href='/ui/index.html'; } // Unknown or missing role
    }
  } else {
    if(!TOKEN) location.href = '/ui/index.html';
  }
}

async function login(){
  const email=qs('#email').value;
  const password=qs('#password').value;
  if(!email || !password){ alert('Please fill all fields'); return; }
  try{
    const res = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
    setToken(res.token, res.user.role);
    if(res.user.role==='admin') location.href='/ui/admin.html';
    else if(res.user.role==='distributor' || res.user.role==='staff') location.href='/ui/distributor.html';
    else if(res.user.role==='retailer') location.href='/ui/retailer.html';
    else alert('Unknown role');
  }catch(e){ alert(e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
  const p = location.pathname;
  if (p.endsWith('index.html') || p === '/') {
    try { checkAuth(); } catch {}
    const form = document.getElementById('loginForm');
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); login(); });
    }
    
    // Init server URL settings
    const urlInp = document.getElementById('serverUrl');
    const curUrl = document.getElementById('currentUrl');
    if (urlInp && curUrl) {
      urlInp.value = BASE_URL;
      curUrl.textContent = BASE_URL || '(Relative/Default)';
    }
  }
});

function saveServerUrl() {
  const inp = document.getElementById('serverUrl');
  if (inp) {
    let val = inp.value.trim();
    if (val && !val.startsWith('http')) val = 'http://' + val;
    localStorage.setItem('API_URL', val);
    alert('Server URL saved. Reloading...');
    location.reload();
  }
}

async function checkRoleAndRedirect(expected){ try{ const me=await api('/api/me'); const role=me&&me.role; if(expected==='admin' && role!=='admin'){ location.href='/ui/index.html'; return; } if(expected==='distributor' && role!=='distributor'){ location.href='/ui/index.html'; return; } if(expected==='retailer' && role!=='retailer'){ location.href='/ui/index.html'; return; } return me; }catch{ location.href='/ui/index.html'; } }

async function loadAdmin(){
  await checkRoleAndRedirect('admin');
  bindLogout();
  renderUnitsGrid('#unitsGrid');
  bindUnitForm();
  renderProductsGrid('#productsGrid');
  bindProductForm();
  renderUsersList('#usersList');
  renderRatesList('#ratesList');
  bindGlobalRateForm();
  
  // Dashboard stats
  try{
    const stats=await api('/api/admin/stats');
    qs('#statDistributors').textContent=stats.distributors;
    qs('#statRetailers').textContent=stats.retailers;
    qs('#statProducts').textContent=stats.products;
    qs('#statActive').textContent=stats.active;
  }catch(e){ console.error(e); }

  // Tabs
  qsa('button[data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener('shown.bs.tab', (e) => {
      if(e.target.id === 'tab-reports') { bindReportActions(); }
    });
  });
}

async function renderUnitsGrid(selector){ const el=qs(selector); if(!el) return; const units=await api('/api/units'); const byId={}; units.forEach(x=>{ byId[x._id]=x; }); el.innerHTML=''; units.forEach(u=>{ const isCompound=String(u.type)==='Compound'; let extra=''; if(isCompound){ const a=byId[u.firstUnit]||{}; const b=byId[u.secondUnit]||{}; extra=`<div class="small text-muted">1 ${a.symbol||'?'} = ${u.conversionFactor} ${b.symbol||'?'}</div>`; } const card=document.createElement('div'); card.className='card p-3 mb-2'; card.innerHTML=`<div class="d-flex justify-content-between"><div><div class="fw-bold">${u.symbol} <span class="badge bg-light text-dark border">${u.type}</span></div><div class="small">${u.formalName||''}</div>${extra}</div><button class="btn btn-sm btn-outline-danger" onclick="deleteUnit('${u._id}')"><i class="bi bi-trash"></i></button></div>`; el.appendChild(card); }); }
async function deleteUnit(id){ if(!confirm('Delete unit?')) return; try{ await api(`/api/units/${id}`,{ method:'DELETE' }); renderUnitsGrid('#unitsGrid'); }catch(e){ alert(e.message); } }
function bindUnitForm(){ const btn=qs('#unitSave'); if(btn){ btn.onclick=async ()=>{ const type=qs('#unitType').value; const symbol=qs('#unitSymbol').value; const formalName=qs('#unitFormal').value; const decimalPlaces=qs('#unitDecimal').value; const firstUnit=qs('#unitFirst').value; const secondUnit=qs('#unitSecond').value; const conversionFactor=qs('#unitConv').value; try{ await api('/api/units',{ method:'POST', body: JSON.stringify({ type, symbol, formalName, decimalPlaces, firstUnit, secondUnit, conversionFactor }) }); qs('#unitSymbol').value=''; renderUnitsGrid('#unitsGrid'); }catch(e){ alert(e.message); } }; } const sel=qs('#unitType'); if(sel){ sel.onchange=()=>{ const isC=sel.value==='Compound'; const els=qsa('.compound-only'); els.forEach(el=>isC?show(el):hide(el)); if(isC) loadUnitSelects(); }; } }
async function loadUnitSelects(){ const units=await api('/api/units'); const simple=units.filter(u=>u.type==='Simple'); const opts='<option value="">Select Unit</option>'+simple.map(u=>`<option value="${u._id}">${u.symbol}</option>`).join(''); qs('#unitFirst').innerHTML=opts; qs('#unitSecond').innerHTML=opts; }

async function renderProductsGrid(selector){ const el = qs(selector); if(!el) return; const units = await api('/api/units'); const byId = {}; units.forEach(x=>{ byId[x._id]=x; }); const products = await api('/api/products'); el.innerHTML=''; products.forEach(p=>{ const card = document.createElement('div'); card.className = 'card p-3 mb-2'; const u = p.unit ? byId[p.unit] : null; const uStr = u ? (u.symbol) : '-'; card.innerHTML = `<div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold">${p.nameEnglish}</div><div class="small text-muted">${p.nameHindi || ''}</div><div class="small">Unit: ${uStr}</div></div><div><button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p._id}')"><i class="bi bi-trash"></i></button></div></div>`; el.appendChild(card); }); }
function bindProductForm(){ const btn=qs('#prodSave'); if(btn){ btn.onclick=async ()=>{ const nameEnglish=qs('#prodName').value; try{ await api('/api/products',{ method:'POST', body: JSON.stringify({ nameEnglish }) }); qs('#prodName').value=''; renderProductsGrid('#productsGrid'); }catch(e){ alert(e.message); } }; } }
async function deleteProduct(id){ if(!confirm('Delete product?')) return; try{ await api(`/api/products/${id}`,{ method:'DELETE' }); renderProductsGrid('#productsGrid'); }catch(e){ alert(e.message); } }

async function renderUsersList(selector){ const el=qs(selector); if(!el) return; const users=await api('/api/users'); el.innerHTML=''; users.forEach(u=>{ const card=document.createElement('div'); card.className='card p-3'; card.innerHTML=`<div class="fw-bold">${u.name}</div><div class="text-muted">${u.email}</div><div class="badge bg-secondary">${u.role}</div>`; el.appendChild(card); }); }
async function renderRatesList(selector){ const el=qs(selector); if(!el) return; const rates=await api('/api/admin/rates'); const products=await api('/api/products'); const pMap={}; products.forEach(p=>pMap[p._id]=p.nameEnglish); el.innerHTML=''; rates.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${pMap[r.productId]||r.productId}</td><td>₹${r.price}</td>`; el.appendChild(tr); }); }
function bindGlobalRateForm(){ const btn=qs('#rateSave'); if(btn){ btn.onclick=async ()=>{ const productId=qs('#rateProduct').value; const price=qs('#ratePrice').value; try{ await api('/api/admin/rates',{ method:'POST', body: JSON.stringify({ productId, price }) }); renderRatesList('#ratesList'); }catch(e){ alert(e.message); } }; } loadRateProductSelect(); }
async function loadRateProductSelect(){ const products=await api('/api/products'); const opts='<option value="">Select Product</option>'+products.map(p=>`<option value="${p._id}">${p.nameEnglish}</option>`).join(''); qs('#rateProduct').innerHTML=opts; }

async function loadDistributor(){
  const me = await checkRoleAndRedirect('distributor');
  bindLogout();
  
  // Tabs
  const tabs = ['dashboard','products','inventory','stock-in','stock-out','rates','retailers','reports','staff'];
  const switchTab = (id) => {
    qsa('.tab-pane').forEach(el => {
       el.classList.remove('show','active');
       if(el.id === id) el.classList.add('show','active');
    });
    qsa('.nav-link').forEach(el => el.classList.remove('active'));
    const navBtn = qs(`button[data-bs-target="#${id}"]`);
    if(navBtn) navBtn.classList.add('active');
    
    // Load content
    if(id==='tab-dashboard') loadDistDashboard();
    if(id==='tab-products') { renderDistProductsGrid('#distProdGrid'); renderHiddenProducts('#hiddenProdList'); bindDistProductAdd(); }
    if(id==='tab-inventory') renderInventoryStatus();
    if(id==='tab-stock-in') renderStockIn();
    if(id==='tab-stock-out') renderStockOut();
    if(id==='tab-retailers') { loadRetailers(); bindRetailerAdd(); }
    if(id==='tab-staff') { loadStaff(); bindStaffForm(); }
    if(id==='tab-rates') { loadDistRates(); }
    if(id==='tab-reports') { renderReport(); bindReportActions(); }
  };
  
  tabs.forEach(t => {
     const btn = qs(`#nav-${t}`);
     if(btn) btn.onclick = () => switchTab(`tab-${t}`);
     // Mobile quick actions
     const qa = qs(`#qa-${t}`);
     if(qa) qa.onclick = () => switchTab(`tab-${t}`);
  });
  
  loadDistDashboard();
}

async function loadDistDashboard(){
  try{
    const stats = await api('/api/my/stats');
    qs('#dStatInventory').textContent = stats.inventoryCount;
    qs('#dStatLowStock').textContent = stats.lowStockCount;
    qs('#dStatRetailers').textContent = stats.retailerCount;
    qs('#dStatOrders').textContent = stats.todayOrders;
  }catch(e){ console.error(e); }
}

async function bindDistProductAdd(){
  try{
    const units=await api('/api/units');
    const unitMap={}; units.forEach(u=>{ unitMap[u._id]=u; });
    
    const sel=qs('#distUnit');
    if(sel){
      sel.innerHTML='<option value="">-</option>' + units.map(u=>{
        let label = u.symbol;
        if(u.type==='Compound'){
           const f = unitMap[u.firstUnit] ? unitMap[u.firstUnit].symbol : '?';
           const s = unitMap[u.secondUnit] ? unitMap[u.secondUnit].symbol : '?';
           label += ` (${f} → ${s} × ${u.conversionFactor})`;
        } else if(u.formalName){
           label += ` (${u.formalName})`;
        }
        return `<option value="${u._id}">${label}</option>`;
      }).join('');
    }
    
    const infoBtn = qs('#distUnitInfo');
    if(infoBtn && sel){
      infoBtn.onclick = () => {
         const uid = sel.value;
         if(!uid) { alert('No unit selected'); return; }
         const u = unitMap[uid];
         if(u) renderUnitDetailModal(u, unitMap);
      };
    }
    
    const btn=qs('#distProdAdd');
    if(btn){
      btn.onclick = async ()=>{
        const nameEl=qs('#distProdName');
        const unitEl=qs('#distUnit');
        const name=(nameEl&&nameEl.value||'').trim();
        const unit=(unitEl&&unitEl.value||'').trim();
        if(!name){ notify('Name required', 'warning'); return; }
        try{
          await api('/api/my/products',{ method:'POST', body: JSON.stringify({ nameEnglish:name, unit }) });
          if(nameEl) nameEl.value='';
          if(unitEl) unitEl.value='';
          renderDistProductsGrid('#distProdGrid');
        }catch(e){ notify(e.message, 'danger'); }
      };
    }
  }catch(e){ console.error(e); }
}

async function renderDistProductsGrid(selector){
  const el=qs(selector);
  if(!el) return;
  const units=await api('/api/units');
  const unitMap={};
  units.forEach(u=>{ unitMap[u._id]=u; });
  
  let items=[];
  try{ items=await api('/api/my/products'); }catch(e){ console.error(e); }
  
  el.innerHTML='';
  if(items.length===0){ el.innerHTML='<div class="text-muted p-2">No products found. Add one or check hidden.</div>'; return; }
  
  items.forEach(p=>{
    const div=document.createElement('div');
    div.className='d-flex justify-content-between align-items-center border-bottom p-2';
    
    const unitOptions = '<option value="">-</option>' + units.map(u=>{
      let label = u.symbol;
      if(u.type==='Compound'){
         const f = unitMap[u.firstUnit] ? unitMap[u.firstUnit].symbol : '?';
         const s = unitMap[u.secondUnit] ? unitMap[u.secondUnit].symbol : '?';
         label += ` (${f} → ${s} × ${u.conversionFactor})`;
      } else if(u.formalName){
         label += ` (${u.formalName})`;
      }
      return `<option value="${u._id}" ${p.unit===u._id?'selected':''}>${label}</option>`;
    }).join('');
    
    div.innerHTML=`
      <div>
        <div class="fw-bold">${p.nameEnglish} <span class="badge bg-secondary rounded-pill small">${p.source}</span></div>
        <div class="text-muted small">${p.nameHindi||''}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <div class="input-group input-group-sm" style="width:260px">
          <select class="form-select" data-id="${p._id}">${unitOptions}</select>
          <button class="btn btn-outline-secondary" type="button" data-act="unitInfo" data-id="${p._id}" title="View Unit Details"><i class="bi bi-info-circle"></i></button>
        </div>
        <button class="btn btn-sm btn-outline-primary" data-act="saveUnit" data-id="${p._id}" data-source="${p.source}" title="Save Unit"><i class="bi bi-check"></i></button>
        ${p.source==='custom' ? `<button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${p._id}"><i class="bi bi-trash"></i></button>` : `<button class="btn btn-sm btn-outline-secondary" data-act="hide" data-id="${p._id}"><i class="bi bi-eye-slash"></i></button>`}
      </div>
    `;
    el.appendChild(div);
  });
  
  el.onclick = async (ev)=>{
    const t = ev.target;
    const btn = t.closest('button');
    if(!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    if(!act||!id) return;
    
    try{
      if(act==='unitInfo'){
        const sel = el.querySelector(`select[data-id="${id}"]`);
        const unitId = sel ? sel.value : '';
        if(!unitId) { alert('No unit selected'); return; }
        const unit = unitMap[unitId];
        if(unit) renderUnitDetailModal(unit, unitMap);
      }
      if(act==='saveUnit'){
        const sel = el.querySelector(`select[data-id="${id}"]`);
        const unit = sel ? sel.value : '';
        const source = btn.getAttribute('data-source');
        const endpoint = source==='custom' ? `/api/my/products/${id}` : `/api/products/${id}`;
        await api(endpoint, { method:'PATCH', body: JSON.stringify({ unit }) });
        alert('Unit updated');
      }
      if(act==='del'){
        if(!confirm('Delete custom product?')) return;
        await api(`/api/my/products/${id}`, { method:'DELETE' });
        renderDistProductsGrid(selector);
      }
      if(act==='hide'){
        if(!confirm('Hide this global product?')) return;
        await api(`/api/my/products/${id}/hide`, { method:'POST' });
        renderDistProductsGrid(selector);
        renderHiddenProducts('#hiddenProdList');
      }
    }catch(e){ notify(e.message, 'danger'); }
  };
}

async function renderHiddenProducts(selector){
  const el=qs(selector);
  if(!el) return;
  let items=[];
  try{ items=await api('/api/my/products/hidden'); }catch(e){ console.error(e); }
  
  el.innerHTML='';
  if(items.length===0){ el.innerHTML='<div class="text-muted small p-2">No hidden products</div>'; return; }
  
  items.forEach(p=>{
    const div=document.createElement('div');
    div.className='d-flex justify-content-between align-items-center border-bottom p-2 bg-light';
    div.innerHTML=`
      <div class="small text-muted">${p.nameEnglish}</div>
      <button class="btn btn-sm btn-outline-success" data-act="unhide" data-id="${p._id}">Unhide</button>
    `;
    el.appendChild(div);
  });
  
  el.onclick = async (ev)=>{
    const btn = ev.target.closest('button');
    if(!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    if(act==='unhide'){
      try{
        await api(`/api/my/products/${id}/unhide`, { method:'POST' });
        renderHiddenProducts(selector);
        renderDistProductsGrid('#distProdGrid');
      }catch(e){ alert(e.message); }
    }
  };
}

async function renderInventoryStatus(){
  try {
    const products = await api('/api/products');
    const inv = await api('/api/my/inventory');
    const invMap = {};
    inv.forEach(i => { invMap[i.productId] = Number(i.quantity) || 0; });

    const tbody = qs('#invStatusRows');
    if (tbody) {
      tbody.innerHTML = '';
      products.forEach(p => {
        const qty = invMap[p._id] || 0;
        let badgeClass = 'bg-secondary';
        if(qty > 10) badgeClass = 'bg-success';
        else if(qty > 0) badgeClass = 'bg-warning text-dark';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="fw-bold">${p.nameEnglish}</div>
            <div class="text-muted small">${p.nameHindi}</div>
          </td>
          <td class="text-end">
            <span class="badge ${badgeClass} fs-6">${qty}</span>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) { console.error(e); }
}

async function renderStockIn(){
  try {
    const suppliers = await api('/api/my/suppliers');
    const products = await api('/api/my/products');
    const units = await api('/api/units');
    const inv = await api('/api/my/inventory');
    const invMap = {}; inv.forEach(i => invMap[i.productId] = Number(i.quantity) || 0);
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);

    const sel = qs('#stockInSupplierSel');
    const supBalanceEl = qs('#stockInSupBalance');
    const billInp = qs('#stockInBillAmt');
    const tbody = qs('#stockInRows');
    const saveBtn = qs('#stockInSaveBtn');
    const cashInp = qs('#stockInCash');
    const onlineInp = qs('#stockInOnline');

    const updateBalance = () => {
      const sid = sel ? sel.value : '';
      const s = suppliers.find(x => x._id === sid);
      if(supBalanceEl){ const bal = s ? (Number(s.currentBalance)||0) : 0; supBalanceEl.textContent = '₹'+bal; supBalanceEl.className = 'fw-bold ' + (bal>0? 'text-danger':'text-success'); }
    };

    if(sel){
      const cur = sel.value;
      sel.innerHTML = '<option value="">Select Supplier</option>' + suppliers.map(s=>`<option value="${s._id}">${s.name}</option>`).join('');
      if(cur) sel.value = cur;
      updateBalance();
      sel.onchange = updateBalance;
    }

    if(tbody){
      tbody.innerHTML = '';
      products.forEach(p => {
        if(p.source === 'global' && !p.active) return;
        const u = p.unit ? unitMap[p.unit] : null;
        const isCompound = u && String(u.type) === 'Compound';
        const first = isCompound ? unitMap[u.firstUnit] : null;
        const second = isCompound ? unitMap[u.secondUnit] : null;
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const curQty = invMap[p._id] || 0;
        const qtyCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm in-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm in-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>
             <div class="small text-muted">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
          : `<input type="number" class="form-control form-control-sm in-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="fw-bold small">${p.nameEnglish}</div>
            <div class="text-muted small">${p.nameHindi||''}</div>
          </td>
          <td class="text-center"><span class="badge ${curQty>0?'bg-success':'bg-secondary'}">${curQty}</span></td>
          <td>${qtyCell}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    if(saveBtn){
      const handler = async () => {
        try {
          const supplierId = sel ? sel.value : '';
          if(!supplierId) throw new Error('Select supplier');
          const moves = [];
          products.forEach(p => {
            const u = p.unit ? unitMap[p.unit] : null;
            const isCompound = u && String(u.type) === 'Compound';
            const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
            let qty = 0;
            if(isCompound){
              const a = qs(`.in-first[data-id="${p._id}"]`);
              const b = qs(`.in-second[data-id="${p._id}"]`);
              qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
            } else {
              const s = qs(`.in-simple[data-id="${p._id}"]`);
              qty = Number(s && s.value || 0);
            }
            if(qty > 0){ moves.push({ productId: p._id, quantity: qty }); }
          });
          if(moves.length === 0) throw new Error('No items entered');
          let ok = 0; let errs = [];
          for(const m of moves){
            try{
              await api('/api/my/stock-in',{ method:'POST', body: JSON.stringify({ productId: m.productId, quantity: m.quantity, supplierId }) });
              ok++;
            }catch(e){ errs.push(e.message||'stock-in error'); }
          }
          const billAmount = Number(billInp && billInp.value || 0);
          if(billAmount > 0){
            try{ await api(`/api/my/suppliers/${supplierId}/bills`,{ method:'POST', body: JSON.stringify({ amount: billAmount }) }); }catch(e){ errs.push(e.message||'bill error'); }
          }
          const cash = Number(cashInp && cashInp.value || 0);
          const online = Number(onlineInp && onlineInp.value || 0);
          if(cash>0 || online>0){
            try{ await api(`/api/my/suppliers/${supplierId}/payments`,{ method:'POST', body: JSON.stringify({ cashAmount: cash, onlineAmount: online }) }); }catch(e){ errs.push(e.message||'payment error'); }
          }
          if(errs.length){ alert(`Processed ${ok} items. Errors: \n${errs.join('\n')}`); } else { alert('Stock In saved'); }
          billInp && (billInp.value = 0);
          cashInp && (cashInp.value = 0);
          onlineInp && (onlineInp.value = 0);
          qsa('.in-first').forEach(i => i.value = '');
          qsa('.in-second').forEach(i => i.value = '');
          qsa('.in-simple').forEach(i => i.value = '');
          renderStockIn();
        } catch(e){ alert(e.message); }
      };
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', handler);
    }

  } catch (e) { console.error(e); }
}

async function renderStockOut(){
  try {
    const retailers = await api('/api/my/retailers');
    const products = await api('/api/my/products');
    const units = await api('/api/units');
    const inv = await api('/api/my/inventory');
    const distRates = await api('/api/my/rates');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    const invMap = {}; inv.forEach(i => invMap[i.productId] = Number(i.quantity) || 0);
    const distRateMap = {}; distRates.forEach(r => distRateMap[r.productId] = Number(r.price)||0);

    const rSel = qs('#stockOutRetailerSel');
    const balEl = qs('#stockOutCurBalance');
    const tbody = qs('#stockOutRows');
    const subtotalEl = qs('#stockOutSubtotal');
    const cashInp = qs('#stockOutCash');
    const onlineInp = qs('#stockOutOnline');
    const recvEl = qs('#stockOutReceivable');
    const saveBtn = qs('#stockOutSaveBtn');

    let rrMap = {};

    const fillRetailers = () => {
      const cur = rSel ? rSel.value : '';
      if(rSel){
        rSel.innerHTML = '<option value="">Select retailer</option>' + retailers.map(r=>`<option value="${r._id}">${r.name}</option>`).join('');
        if(cur) rSel.value = cur;
        const r = retailers.find(x=>x._id === rSel.value);
        if(balEl){ const bal = r ? (Number(r.currentBalance)||0) : 0; balEl.textContent = '₹'+bal.toFixed(2); balEl.className = 'fw-bold ' + (bal>0? 'text-danger':'text-success'); }
      }
    };
    fillRetailers();

    const loadRetailerRates = async () => {
      const id = rSel ? rSel.value : '';
      rrMap = {};
      if(id){
        try {
          const items = await api(`/api/my/retailers/${id}/rates`);
          items.forEach(x => rrMap[x.productId] = Number(x.price)||0);
        } catch {}
      }
    };
    await loadRetailerRates();

    const getPrice = (pid) => {
      const a = rrMap[pid];
      if(a !== undefined) return a;
      const b = distRateMap[pid];
      if(b !== undefined) return b;
      return 0;
    };

    const renderRows = () => {
      if(!tbody) return;
      tbody.innerHTML = '';
      products.forEach(p => {
        if(p.source === 'global' && !p.active) return;
        const stock = invMap[p._id] || 0;
        const u = p.unit ? unitMap[p.unit] : null;
        const isCompound = u && String(u.type) === 'Compound';
        const first = isCompound ? unitMap[u.firstUnit] : null;
        const second = isCompound ? unitMap[u.secondUnit] : null;
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const price = getPrice(p._id);

        const tr = document.createElement('tr');
        const qtyCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm out-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm out-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>
             <div class="small text-muted">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
          : `<input type="number" class="form-control form-control-sm out-simple" data-id="${p._id}" min="0" placeholder="Qty">`;

        tr.innerHTML = `
          <td>
            <div class="fw-bold">${p.nameEnglish}</div>
            <div class="text-muted small">${p.nameHindi||''}</div>
            <div class="small text-muted">₹${price.toFixed(2)} / ${second?second.symbol:(u?u.symbol:'unit')}</div>
          </td>
          <td class="text-center">
            <span class="badge ${stock>0?'bg-success':'bg-secondary'}">${stock}</span>
          </td>
          <td>${qtyCell}</td>
          <td class="text-end">
            <div id="amt-${p._id}" class="fw-bold">₹0</div>
            <div id="brk-${p._id}" class="small text-muted"></div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };
    renderRows();

    const computeTotalAndAmounts = () => {
      let subtotal = 0;
      products.forEach(p => {
        const u = p.unit ? unitMap[p.unit] : null;
        const isCompound = u && String(u.type) === 'Compound';
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const price = getPrice(p._id);
        let qty = 0;
        let brk = '';
        if(isCompound){
          const a = qs(`.out-first[data-id="${p._id}"]`);
          const b = qs(`.out-second[data-id="${p._id}"]`);
          const av = Number(a && a.value || 0);
          const bv = Number(b && b.value || 0);
          qty = (av*conv) + bv;
          if(av>0 || bv>0){ brk = `${av||0} ${unitMap[u.firstUnit]?unitMap[u.firstUnit].symbol:''} + ${bv||0} ${unitMap[u.secondUnit]?unitMap[u.secondUnit].symbol:''} = ${qty}`; }
        } else {
          const s = qs(`.out-simple[data-id="${p._id}"]`);
          qty = Number(s && s.value || 0);
        }
        const amt = price * qty;
        const amtEl = qs(`#amt-${p._id}`);
        const brkEl = qs(`#brk-${p._id}`);
        if(amtEl) amtEl.textContent = '₹' + amt.toFixed(2);
        if(brkEl) brkEl.textContent = brk;
        subtotal += amt;
      });
      if(subtotalEl) subtotalEl.textContent = '₹' + subtotal.toFixed(2);
      const cash = Number(cashInp && cashInp.value || 0);
      const online = Number(onlineInp && onlineInp.value || 0);
      const receivable = Math.max(0, subtotal - cash - online);
      if(recvEl) recvEl.textContent = '₹' + receivable.toFixed(2);
    };

    const onInput = () => computeTotalAndAmounts();
    qsa('.out-first').forEach(i => i.addEventListener('input', onInput));
    qsa('.out-second').forEach(i => i.addEventListener('input', onInput));
    qsa('.out-simple').forEach(i => i.addEventListener('input', onInput));
    if(cashInp) cashInp.addEventListener('input', onInput);
    if(onlineInp) onlineInp.addEventListener('input', onInput);
    computeTotalAndAmounts();

    if(rSel){
      rSel.onchange = async () => {
        fillRetailers();
        await loadRetailerRates();
        renderRows();
        qsa('.out-first').forEach(i => i.addEventListener('input', onInput));
        qsa('.out-second').forEach(i => i.addEventListener('input', onInput));
        qsa('.out-simple').forEach(i => i.addEventListener('input', onInput));
        computeTotalAndAmounts();
      };
    }

    if(saveBtn){
      const handler = async () => {
        try {
          const rid = rSel ? rSel.value : '';
          if(!rid){ alert('Select retailer'); return; }
          const moves = [];
          for(const p of products){
            const u = p.unit ? unitMap[p.unit] : null;
            const isCompound = u && String(u.type) === 'Compound';
            const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
            let qty = 0;
            if(isCompound){
              const a = qs(`.out-first[data-id="${p._id}"]`);
              const b = qs(`.out-second[data-id="${p._id}"]`);
              const av = Number(a && a.value || 0);
              const bv = Number(b && b.value || 0);
              qty = (av*conv) + bv;
            } else {
              const s = qs(`.out-simple[data-id="${p._id}"]`);
              qty = Number(s && s.value || 0);
            }
            if(qty > 0){
              const available = invMap[p._id] || 0;
              if(qty > available){ alert(`Insufficient stock for ${p.nameEnglish}`); return; }
              moves.push({ productId: p._id, quantity: qty });
            }
          }
          if(moves.length === 0){ alert('No quantities entered'); return; }
          let ok = 0; let errs = [];
          for(const m of moves){
            try{
              await api('/api/my/stock-out',{ method:'POST', body: JSON.stringify({ retailerId: rid, productId: m.productId, quantity: m.quantity }) });
              ok++;
            }catch(e){ errs.push(e.message||'error'); }
          }
          let subtotal = 0;
          products.forEach(p => {
            const u = p.unit ? unitMap[p.unit] : null;
            const isCompound = u && String(u.type) === 'Compound';
            const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
            const price = getPrice(p._id);
            let qty = 0;
            if(isCompound){
              const a = qs(`.out-first[data-id="${p._id}"]`);
              const b = qs(`.out-second[data-id="${p._id}"]`);
              qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
            } else {
              const s = qs(`.out-simple[data-id="${p._id}"]`);
              qty = Number(s && s.value || 0);
            }
            subtotal += price * qty;
          });
          if(subtotal > 0){
            try{ await api('/api/my/transactions',{ method:'POST', body: JSON.stringify({ retailerId: rid, type: 'order', amount: subtotal }) }); }catch(e){ errs.push(e.message||'order error'); }
          }
          const cash = Number(cashInp && cashInp.value || 0);
          const online = Number(onlineInp && onlineInp.value || 0);
          if(cash>0){ try{ await api('/api/my/transactions',{ method:'POST', body: JSON.stringify({ retailerId: rid, amount: cash, type: 'payment_cash' }) }); }catch(e){ errs.push(e.message||'cash error'); } }
          if(online>0){ try{ await api('/api/my/transactions',{ method:'POST', body: JSON.stringify({ retailerId: rid, amount: online, type: 'payment_online' }) }); }catch(e){ errs.push(e.message||'online error'); } }
          if(errs.length){ alert(`Processed ${ok} items. Errors: \n${errs.join('\n')}`); } else { alert('Stock out saved'); }
          cashInp && (cashInp.value = 0);
          onlineInp && (onlineInp.value = 0);
          qsa('.out-first').forEach(i => i.value = '');
          qsa('.out-second').forEach(i => i.value = '');
          qsa('.out-simple').forEach(i => i.value = '');
          renderStockOut();
        } catch(e){ alert(e.message); }
      };
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', handler);
    }

  } catch(e){ console.error(e); }
}

async function loadRetailer(){
  await checkRoleAndRedirect('retailer');
  bindLogout();
  renderRetailerProducts();
  renderRetailerOrders();
  
  const placeBtn = qs('#placeOrderBtn');
  if(placeBtn) placeBtn.onclick = placeOrder;
}

async function renderRetailerProducts(){
  const tbody = qs('#retailerProdList');
  if(!tbody) return;
  try {
    const products = await api('/api/retailer/products');
    const units = await api('/api/units');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    
    tbody.innerHTML = '';
    products.forEach(p => {
      const u = p.unit ? unitMap[p.unit] : null;
      const isCompound = u && String(u.type) === 'Compound';
      const first = isCompound ? unitMap[u.firstUnit] : null;
      const second = isCompound ? unitMap[u.secondUnit] : null;
      const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
      
      const qtyCell = isCompound
        ? `<div class="input-group input-group-sm">
             <input type="number" class="form-control form-control-sm r-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
             <span class="input-group-text">+</span>
             <input type="number" class="form-control form-control-sm r-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
           </div>
           <div class="small text-muted">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
        : `<input type="number" class="form-control form-control-sm r-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="fw-bold">${p.nameEnglish}</div>
          <div class="small text-muted">${p.nameHindi||''}</div>
        </td>
        <td class="text-center">
          <span class="badge ${p.stock>0?'bg-success':'bg-secondary'}">${p.stock}</span>
        </td>
        <td class="text-end">₹${p.price}</td>
        <td>${qtyCell}</td>
      `;
      tbody.appendChild(tr);
    });
    
    const updateEst = () => {
      let total = 0;
      products.forEach(p => {
        const u = p.unit ? unitMap[p.unit] : null;
        const isCompound = u && String(u.type) === 'Compound';
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        let qty = 0;
        if(isCompound){
          const a = qs(`.r-first[data-id="${p._id}"]`);
          const b = qs(`.r-second[data-id="${p._id}"]`);
          qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
        } else {
          const s = qs(`.r-simple[data-id="${p._id}"]`);
          qty = Number(s && s.value || 0);
        }
        total += qty * p.price;
      });
      qs('#orderTotal').textContent = '₹' + total.toFixed(2);
    };
    
    qsa('.r-first').forEach(i => i.addEventListener('input', updateEst));
    qsa('.r-second').forEach(i => i.addEventListener('input', updateEst));
    qsa('.r-simple').forEach(i => i.addEventListener('input', updateEst));
    
  } catch(e){ console.error(e); }
}

async function placeOrder(){
  try {
    const products = await api('/api/retailer/products');
    const units = await api('/api/units');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    
    const items = [];
    products.forEach(p => {
      const u = p.unit ? unitMap[p.unit] : null;
      const isCompound = u && String(u.type) === 'Compound';
      const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
      let qty = 0;
      if(isCompound){
        const a = qs(`.r-first[data-id="${p._id}"]`);
        const b = qs(`.r-second[data-id="${p._id}"]`);
        qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
      } else {
        const s = qs(`.r-simple[data-id="${p._id}"]`);
        qty = Number(s && s.value || 0);
      }
      if(qty > 0) items.push({ productId: p._id, quantity: qty });
    });
    
    if(items.length === 0){ alert('No items selected'); return; }
    
    await api('/api/retailer/orders', { method:'POST', body: JSON.stringify({ items }) });
    alert('Order placed successfully!');
    renderRetailerProducts();
    renderRetailerOrders();
    qs('#orderTotal').textContent = '₹0';
  } catch(e){ alert(e.message); }
}

async function renderRetailerOrders(){
  const list = qs('#orderHistoryList');
  if(!list) return;
  try {
    const orders = await api('/api/retailer/orders');
    console.log('Orders received:', orders);
    list.innerHTML = '';
    if(orders.length === 0){ list.innerHTML = '<div class="text-muted p-3">No orders found</div>'; return; }
    
    orders.forEach(o => {
      const date = new Date(o.createdAt).toLocaleString();
      const div = document.createElement('div');
      div.className = 'card p-3 mb-2';
      let itemsHtml = '<ul class="mb-0 ps-3 small">';
      o.items.forEach(i => {
         const p = i.productId;
         let name = p ? p.nameEnglish : '?';
         let qtyStr = i.quantity;
         
         // Logic for compound unit display
         // Debug: check what we have
         // console.log('Item:', name, 'Unit:', p?.unit);

         if(p && p.unit && String(p.unit.type).trim().toLowerCase() === 'compound' && p.unit.conversionFactor){
           const conv = Number(p.unit.conversionFactor);
           if(conv > 0) {
             const first = Math.floor(i.quantity / conv);
             const second = i.quantity % conv;
             const s1 = (p.unit.firstUnit && p.unit.firstUnit.symbol) ? p.unit.firstUnit.symbol : 'Box';
             const s2 = (p.unit.secondUnit && p.unit.secondUnit.symbol) ? p.unit.secondUnit.symbol : 'Pouch';
             
             if(first > 0 && second > 0) qtyStr = `${first} ${s1} + ${second} ${s2}`;
             else if(first > 0) qtyStr = `${first} ${s1}`;
             else qtyStr = `${second} ${s2}`;
           }
         } else if (p && p.unit && p.unit.symbol) {
            qtyStr += ` ${p.unit.symbol}`;
         }
         
         const totalItem = (i.price * i.quantity).toFixed(2);
         itemsHtml += `<li>${name} <br> <span class="text-muted">${qtyStr} @ ₹${i.price.toFixed(2)} = ₹${totalItem}</span></li>`;
      });
      itemsHtml += '</ul>';
      
      div.innerHTML = `
        <div class="d-flex justify-content-between">
           <div class="fw-bold">#${o._id.substr(-6)}</div>
           <div class="badge bg-${o.status==='pending'?'warning':'success'} text-uppercase">${o.status}</div>
        </div>
        <div class="small text-muted">${date}</div>
        <div class="mt-2">${itemsHtml}</div>
        <div class="mt-2 fw-bold text-end">Total: ₹${o.totalAmount.toFixed(2)}</div>
      `;
      list.appendChild(div);
    });
  } catch(e){ console.error(e); }
}

function loadRetailers(){
  const list = qs('#retailerList');
  if(!list) return;
  api('/api/my/retailers').then(retailers => {
    list.innerHTML = '';
    retailers.forEach(r => {
      const div = document.createElement('div');
      div.className = 'list-group-item d-flex justify-content-between align-items-center';
      div.innerHTML = `
        <div>
          <div class="fw-bold">${r.name}</div>
          <div class="small text-muted">${r.phone || ''}</div>
          <div class="small">${r.address || ''}</div>
        </div>
        <div class="d-flex flex-column align-items-end gap-1">
          <div class="fw-bold ${r.currentBalance > 0 ? 'text-danger' : 'text-success'}">₹${(r.currentBalance||0).toFixed(2)}</div>
          <div class="d-flex gap-1">
             <button class="btn btn-sm btn-outline-info" data-act="ledger" data-id="${r._id}" title="Ledger"><i class="bi bi-journal-text"></i></button>
             <button class="btn btn-sm btn-outline-primary" onclick="preparePayment('${r._id}', '${r.name}')" data-bs-toggle="modal" data-bs-target="#paymentModal"><i class="bi bi-currency-rupee"></i></button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });
    
    list.onclick = async (ev)=>{
      const t = ev.target;
      const btn = t.closest('button');
      if(!btn) return;
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      if(!id||!act) return;
      
      if(act==='ledger'){
        const item = retailers.find((x)=>x._id===id);
        if(item) renderLedgerModal(item);
      }
    };
  });
}

async function preparePayment(id, name){
  qs('#payRetailerName').textContent = name;
  qs('#payRetailerId').value = id;
  qs('#payAmount').value = '';
  qs('#payNote').value = '';
}

async function submitPayment(){
  try {
    const retailerId = qs('#payRetailerId').value;
    const amount = Number(qs('#payAmount').value);
    const type = qs('#payType').value; // cash or online
    const note = qs('#payNote').value;
    
    if(!amount || amount <= 0) throw new Error('Invalid amount');
    
  await api('/api/my/transactions', {
    method: 'POST',
    body: JSON.stringify({ retailerId, amount, type, note })
  });
    
    alert('Payment recorded');
    const m = bootstrap.Modal.getInstance(qs('#paymentModal'));
    if(m) m.hide();
    loadRetailers();
  } catch(e){ alert(e.message); }
}

function notify(msg, type='info'){
  const area = qs('#notifyArea');
  const el = document.createElement('div');
  el.className = `alert alert-${type} alert-dismissible fade show`;
  el.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  area.appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}

// Reports
async function bindReportActions(){
  try{
    const catSel = qs('#repCategory');
    const searchInp = qs('#repSearch');
    const typeSel = qs('#repTypeSel');
    const staffSel = qs('#repStaffSel');
    const prodSel = qs('#repProductSel');
    const retSel = qs('#repRetailerSel');
    const supSel = qs('#repSupplierSel');
    const fromInp = qs('#repFromDate');
    const toInp = qs('#repToDate');
    const exportBtn = qs('#repExportBtn');

    // Set default date to today (Local Time)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    if(fromInp) fromInp.value = today;
    if(toInp) toInp.value = today;

    const products = await api('/api/products');
    if(prodSel){ prodSel.innerHTML = '<option value="">All Products</option>' + products.map(p=>`<option value="${p._id}">${p.nameEnglish}</option>`).join(''); }

    if(ROLE === 'admin'){
      const distributors = await api('/api/users?role=distributor');
      const retailers = await api('/api/users?role=retailer');
      const distSel = qs('#repDistributorSel');
      if(distSel){ 
         distSel.innerHTML = '<option value="">All Distributors</option>' + distributors.map(d=>`<option value="${d._id}">${d.name}</option>`).join(''); 
         distSel.onchange = () => renderReport();
      }
      if(retSel){ retSel.innerHTML = '<option value="">All Retailers</option>' + retailers.map(r=>`<option value="${r._id}">${r.name}</option>`).join(''); }
    } else {
      const staff = await api('/api/my/staff');
      const retailers = await api('/api/my/retailers');
      const suppliers = await api('/api/my/suppliers');
      if(staffSel){ staffSel.innerHTML = '<option value="">All Staff</option>' + staff.map(s=>`<option value="${s._id}">${s.name}</option>`).join(''); }
      if(retSel){ retSel.innerHTML = '<option value="">All Retailers</option>' + retailers.map(r=>`<option value="${r._id}">${r.name}</option>`).join(''); }
      if(supSel){ supSel.innerHTML = '<option value="">All Suppliers</option>' + suppliers.map(s=>`<option value="${s._id}">${s.name}</option>`).join(''); }
    }

    const setTypeOptions = () => {
      const cat = catSel ? catSel.value : '';
      if(!typeSel) return;
      if(cat === 'stock') typeSel.innerHTML = '<option value="">All</option><option value="IN">IN</option><option value="OUT">OUT</option>';
      else if(cat === 'financial' || cat === 'retailer_ledger') typeSel.innerHTML = '<option value="">All</option><option value="order">Order</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
      else if(cat === 'supplier_ledger') typeSel.innerHTML = '<option value="">All</option><option value="bill">Bill</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
    };
    setTypeOptions();

    const re = ()=>renderReport();
    if(catSel) catSel.onchange = () => { setTypeOptions(); re(); };
    if(searchInp) searchInp.oninput = re;
    if(typeSel) typeSel.onchange = re;
    if(staffSel) staffSel.onchange = re;
    if(prodSel) prodSel.onchange = re;
    if(retSel) retSel.onchange = re;
    if(supSel) supSel.onchange = re;
    if(fromInp) fromInp.onchange = re;
    if(toInp) toInp.onchange = re;
    if(exportBtn) exportBtn.onclick = () => {
      const hdr = (window.REP_HEADER||[]).join(',');
      const rows = (window.REP_DATA||[]).map(r=>r.map(v=>String(v).replace(/\n/g,' ').replace(/"/g,'"')).join(','));
      const csv = [hdr].concat(rows).join('\n');
      const blob = new Blob([csv],{ type:'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    };
    renderReport();
  }catch(e){ console.error(e); }
}

async function renderReport(){
  try{
    const cat = qs('#repCategory') ? qs('#repCategory').value : 'stock';
    const search = qs('#repSearch') ? (qs('#repSearch').value||'').toLowerCase() : '';
    const type = qs('#repTypeSel') ? qs('#repTypeSel').value : '';
    const staffId = qs('#repStaffSel') ? qs('#repStaffSel').value : '';
    const productId = qs('#repProductSel') ? qs('#repProductSel').value : '';
    const retailerId = qs('#repRetailerSel') ? qs('#repRetailerSel').value : '';
    const supplierId = qs('#repSupplierSel') ? qs('#repSupplierSel').value : '';
    const from = qs('#repFromDate') ? qs('#repFromDate').value : '';
    const to = qs('#repToDate') ? qs('#repToDate').value : '';

    let url = '';
    const params = [];
    if(staffId) params.push(`staffId=${encodeURIComponent(staffId)}`);
    if(from) params.push(`from=${encodeURIComponent(from)}`);
    if(to) params.push(`to=${encodeURIComponent(to)}`);
    if(cat === 'stock'){
      url = '/api/my/stock-moves';
      if(productId) params.push(`productId=${encodeURIComponent(productId)}`);
      if(retailerId) params.push(`retailerId=${encodeURIComponent(retailerId)}`);
      if(type) params.push(`type=${encodeURIComponent(type)}`);
    } else if(cat === 'financial' || cat === 'retailer_ledger'){
      url = '/api/my/transactions';
      if(retailerId) params.push(`retailerId=${encodeURIComponent(retailerId)}`);
      if(type) params.push(`type=${encodeURIComponent(type)}`);
    } else if(cat === 'supplier_ledger'){
      url = '/api/my/supplier-transactions';
      if(supplierId) params.push(`supplierId=${encodeURIComponent(supplierId)}`);
      if(type) params.push(`type=${encodeURIComponent(type)}`);
    }
    const full = params.length ? `${url}?${params.join('&')}` : url;
    const items = await api(full);

    const thead = qs('#repThead');
    const tbody = qs('#repRows');
    const cnt = qs('#repCount');
    const products = await api('/api/products');
    const pMap = {}; products.forEach(p=>pMap[p._id]=p.nameEnglish);
    const rMap = {};
    let selectedRetailer = null;
    try{ 
      let retailers = [];
      if(ROLE==='admin') retailers = await api('/api/users?role=retailer');
      else retailers = await api('/api/my/retailers');
      retailers.forEach(r=>{
        rMap[r._id]=r.name;
        if(retailerId && r._id === retailerId) selectedRetailer = r;
      }); 
    }catch{}
    const sMap = {};
    try{ 
       if(ROLE!=='admin'){
         const suppliers = await api('/api/my/suppliers'); 
         suppliers.forEach(s=>sMap[s._id]=s.name); 
       }
    }catch{}

    let header = [];
    let data = [];
    if(cat === 'stock'){
      header = ['Date','Type','Product','Retailer','Qty'];
      if(thead) thead.innerHTML = '<tr><th>Date</th><th>T</th><th>Prod</th><th>Ret</th><th class="text-end">Qty</th></tr>';
      if(tbody){ tbody.innerHTML=''; items.forEach(m=>{
        const date = new Date(m.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        const pObj = (typeof m.productId === 'object') ? m.productId : null;
        const pId = pObj ? pObj._id : m.productId;
        const prod = pObj ? (pObj.nameEnglish || pObj.nameHindi || '?') : (pMap[pId] || pId || '-');
        
        const ret = m.retailerId ? (rMap[m.retailerId]||m.retailerId) : '-';
        const qty = Number(m.quantity)||0;
        
        let qtyDisplay = qty;
        if(pObj && pObj.unit && String(pObj.unit.type).trim().toLowerCase() === 'compound' && pObj.unit.conversionFactor){
           const conv = Number(pObj.unit.conversionFactor);
           if(conv > 0) {
             const first = Math.floor(qty / conv);
             const second = qty % conv;
             const s1 = (pObj.unit.firstUnit && pObj.unit.firstUnit.symbol) ? pObj.unit.firstUnit.symbol : 'Box';
             const s2 = (pObj.unit.secondUnit && pObj.unit.secondUnit.symbol) ? pObj.unit.secondUnit.symbol : 'Pouch';
             
             if(first > 0 && second > 0) qtyDisplay = `${first} ${s1} + ${second} ${s2}`;
             else if(first > 0) qtyDisplay = `${first} ${s1}`;
             else qtyDisplay = `${second} ${s2}`;
           }
        }

        const rowText = `${ds} ${m.type} ${prod} ${ret} ${qtyDisplay}`.toLowerCase();
        if(search && !rowText.includes(search)) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${ds}</td><td><span class="badge ${m.type==='IN'?'bg-success':'bg-primary'}">${m.type}</span></td><td>${prod}</td><td>${ret}</td><td class="text-end">${qtyDisplay}</td>`;
        tbody.appendChild(tr);
        data.push([ds,m.type,prod,ret,qtyDisplay]);
      }); }
    } else if(cat === 'financial' || cat === 'retailer_ledger'){
      let showBalance = false;
      let runningBal = 0;
      if(cat === 'retailer_ledger' && selectedRetailer && !to) {
          showBalance = true;
          runningBal = selectedRetailer.currentBalance || 0;
      }

      header = ['Date','Type','Retailer','Amount'];
      if(showBalance) header.push('Balance');

      let html = '<tr><th>Date</th><th>Type</th><th>Retailer</th><th class="text-end">Amount</th>';
      if(showBalance) html += '<th class="text-end">Balance</th>';
      html += '</tr>';

      if(thead) thead.innerHTML = html;
      
      if(tbody){ tbody.innerHTML=''; items.forEach(t=>{
        const date = new Date(t.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const ty = t.type;
        const ret = t.retailerId && t.retailerId.name ? t.retailerId.name : (t.retailerId||'-');
        const amt = Number(t.amount)||0;
        
        let balCell = '';
        let rowBalVal = '';
        if(showBalance){
            balCell = `<td class="text-end fw-bold">₹${runningBal.toFixed(2)}</td>`;
            rowBalVal = runningBal.toFixed(2);
            if(ty === 'order') runningBal -= amt;
            else if(['payment_cash','payment_online'].includes(ty)) runningBal += amt;
        }

        const rowText = `${ds} ${ty} ${ret} ${amt}`.toLowerCase();
        if(search && !rowText.includes(search)) return;

        const tr = document.createElement('tr');
        const badge = ty==='order'? 'bg-primary' : 'bg-success';
        let typeHtml = `<span class="badge ${badge}">${ty}</span>`;
        if (ty === 'order' && t.referenceId) {
            typeHtml = `<span class="badge ${badge}" style="cursor:pointer" onclick="showOrderDetails('${t.referenceId}')">${ty} <i class="bi bi-info-circle"></i></span>`;
        }
        tr.innerHTML = `<td>${ds}</td><td>${typeHtml}</td><td>${ret}</td><td class="text-end">₹${amt.toFixed(2)}</td>${balCell}`;
        tbody.appendChild(tr);
        
        const rowData = [ds,ty,ret,amt.toFixed(2)];
        if(showBalance) rowData.push(rowBalVal);
        data.push(rowData);
      }); }
    } else if(cat === 'supplier_ledger'){
      header = ['Date','Type','Supplier','Amount'];
      if(thead) thead.innerHTML = '<tr><th>Date</th><th>Type</th><th>Supplier</th><th class="text-end">Amount</th></tr>';
      if(tbody){ tbody.innerHTML=''; items.forEach(t=>{
        const date = new Date(t.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const ty = t.type;
        const sup = t.supplierId && t.supplierId.name ? t.supplierId.name : (t.supplierId||'-');
        const amt = Number(t.amount)||0;
        const rowText = `${ds} ${ty} ${sup} ${amt}`.toLowerCase();
        if(search && !rowText.includes(search)) return;
        const tr = document.createElement('tr');
        const badge = ty==='bill'? 'bg-danger' : 'bg-success';
        tr.innerHTML = `<td>${ds}</td><td><span class="badge ${badge}">${ty}</span></td><td>${sup}</td><td class="text-end">₹${amt.toFixed(2)}</td>`;
        tbody.appendChild(tr);
        data.push([ds,ty,sup,amt.toFixed(2)]);
      }); }
    }
    if(cnt) cnt.textContent = String(data.length||0);
    window.REP_HEADER = header;
    window.REP_DATA = data;
  }catch(e){ console.error(e); }
}

function loadStaff(){
  // ... implementation
}

function loadDistRates(){
  // ... implementation
}

// Initial
const path = location.pathname;
if(path.includes('admin.html')) loadAdmin();
else if(path.includes('distributor.html')) loadDistributor();
else if(path.includes('retailer.html')) { loadRetailer(); }
else {
  const loginBtn = qs('#loginBtn');
  if(loginBtn) loginBtn.onclick = login;
  checkAuth();
}

async function renderLedgerModal(retailer) {
  try {
    qs('#ledgerRetailerName').textContent = retailer.name;
    qs('#ledgerBalance').textContent = '₹ ' + (retailer.currentBalance || 0).toFixed(2);
    
    const rows = qs('#ledgerRows');
    rows.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    const m = new bootstrap.Modal(qs('#ledgerModal'));
    m.show();
    
    // Refresh retailer to get latest balance
    try {
        const retailers = await api('/api/my/retailers');
        const fresh = retailers.find(r => r._id === retailer._id);
        if (fresh) {
            qs('#ledgerBalance').textContent = '₹ ' + (fresh.currentBalance || 0).toFixed(2);
        }
    } catch {}

    const transactions = await api(`/api/my/transactions?retailerId=${retailer._id}`);
    const list = transactions.filter(m => m.type === 'order' || m.type === 'payment_cash' || m.type === 'payment_online');
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    rows.innerHTML = '';
    if (list.length === 0) {
      rows.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No transactions found</td></tr>';
      return;
    }

    list.forEach(t => {
      const tr = document.createElement('tr');
      const date = new Date(t.createdAt);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      let typeBadge = '';
      let amountClass = '';
      let sign = '';
      let amt = t.amount || 0;
      
      if (t.type === 'order') {
        typeBadge = '<span class="badge bg-primary">Order</span>';
        amountClass = 'text-danger';
        sign = '+';
      } else {
        typeBadge = `<span class="badge bg-success">${t.type.replace('payment_', 'Payment ')}</span>`;
        amountClass = 'text-success';
        sign = '-';
      }
      
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${typeBadge}</td>
        <td><small>${t.note || '-'}</small></td>
        <td class="text-end ${amountClass}">${sign}₹${amt.toFixed(2)}</td>
      `;
      rows.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    alert(e.message || 'Failed to load ledger');
  }
}

function renderUnitDetailModal(u, unitMap){
  const tbody = qs('#unitDetailTable');
  if(!tbody) return;
  
  let html = `
    <tr><th class="bg-light" style="width:30%">Type</th><td>${u.type}</td></tr>
    <tr><th class="bg-light">Symbol</th><td class="fw-bold">${u.symbol}</td></tr>
    <tr><th class="bg-light">Formal Name</th><td>${u.formalName||'-'}</td></tr>
    <tr><th class="bg-light">Decimal Places</th><td>${u.decimalPlaces}</td></tr>
  `;
  
  if(u.type === 'Compound'){
    const f = unitMap[u.firstUnit] || {};
    const s = unitMap[u.secondUnit] || {};
    const fSym = f.symbol || '?';
    const sSym = s.symbol || '?';
    const fName = f.formalName ? `(${f.formalName})` : '';
    const sName = s.formalName ? `(${s.formalName})` : '';
    
    html += `
      <tr><th class="bg-light">Base Unit</th><td>${fSym} ${fName}</td></tr>
      <tr><th class="bg-light">Sub Unit</th><td>${sSym} ${sName}</td></tr>
      <tr><th class="bg-light">Conversion</th><td>1 ${fSym} = ${u.conversionFactor} ${sSym}</td></tr>
    `;
  }
  
  tbody.innerHTML = html;
  
  try {
    const el = qs('#unitDetailModal');
    const m = bootstrap.Modal.getOrCreateInstance(el);
    m.show();
  } catch(e){ console.error(e); }
}

window.showOrderDetails = async function(orderId) {
    let modal = qs('#orderDetailModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="orderDetailModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Order Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="orderDetailsContent" class="text-center">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modal = qs('#orderDetailModal');
    }
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    const content = qs('#orderDetailsContent');
    content.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        const order = await api(`/api/orders/${orderId}`);
        let html = `
            <div class="d-flex justify-content-between mb-2">
                <strong>Date:</strong> <span>${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <strong>Retailer:</strong> <span>${order.retailerId ? order.retailerId.name : '-'}</span>
            </div>
            <div class="d-flex justify-content-between mb-3">
                <strong>Total:</strong> <span class="fw-bold">₹${(order.totalAmount||0).toFixed(2)}</span>
            </div>
            <table class="table table-sm table-bordered">
                <thead><tr><th>Product</th><th class="text-end">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead>
                <tbody>
        `;
        (order.items || []).forEach(item => {
             const p = item.productId || {};
             const pname = p.nameEnglish || p.nameHindi || 'Unknown';
             
             let qtyStr = item.quantity;
             if(p && p.unit && String(p.unit.type).trim().toLowerCase() === 'compound' && p.unit.conversionFactor){
                const conv = Number(p.unit.conversionFactor);
                if(conv > 0) {
                   const first = Math.floor(item.quantity / conv);
                   const second = item.quantity % conv;
                   const s1 = (p.unit.firstUnit && p.unit.firstUnit.symbol) ? p.unit.firstUnit.symbol : 'Box';
                   const s2 = (p.unit.secondUnit && p.unit.secondUnit.symbol) ? p.unit.secondUnit.symbol : 'Pouch';
                   
                   if(first > 0 && second > 0) qtyStr = `${first} ${s1} + ${second} ${s2}`;
                   else if(first > 0) qtyStr = `${first} ${s1}`;
                   else qtyStr = `${second} ${s2}`;
                }
             }

             html += `
                <tr>
                    <td>${pname}</td>
                    <td class="text-end">${qtyStr}</td>
                    <td class="text-end">₹${(item.price||0).toFixed(2)}</td>
                    <td class="text-end">₹${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
             `;
        });
        html += '</tbody></table>';
        content.innerHTML = html;
    } catch (e) {
        content.innerHTML = '<div class="text-danger">Failed to load order details</div>';
    }
};
