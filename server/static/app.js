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
function uiHref(page){ const isFile = location.protocol === 'file:'; return isFile ? `${page}.html` : `/ui/${page}.html`; }
async function api(path, opts={}){
  // Version check
  if(!window.APP_VERSION_LOGGED) {
      console.log('App Version: v1.0.10 - Loaded');
      window.APP_VERSION_LOGGED = true;
  }
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
  if(res.status===401 || res.status===403) { setToken('', ''); location.href = uiHref('index'); }
  if(!res.ok) throw new Error((data&&data.error)||`HTTP ${res.status}`);
  return data;
}
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function show(el){ el.classList.remove('d-none'); }
function hide(el){ el.classList.add('d-none'); }

function updateReportFilters(){
  const catSel = qs('#repCategory');
  const typeSel = qs('#repTypeSel');
  const cat = catSel ? catSel.value : '';
  
  // Clear previous report to prevent confusion
  if(qs('#repRows')) qs('#repRows').innerHTML = '';
  if(qs('#repCount')) qs('#repCount').textContent = '0';
  if(qs('#repThead')) qs('#repThead').innerHTML = '';

  // Hide all first
  if(qs('#repTypeDiv')) hide(qs('#repTypeDiv'));
  if(qs('#repStaffDiv')) hide(qs('#repStaffDiv'));
  if(qs('#repProductDiv')) hide(qs('#repProductDiv'));
  if(qs('#repRetailerDiv')) hide(qs('#repRetailerDiv'));
  if(qs('#repSupplierDiv')) hide(qs('#repSupplierDiv'));
  if(qs('#repActionDiv')) hide(qs('#repActionDiv'));
  
  if(!cat) {
    if(qs('#repRows')) qs('#repRows').innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted fs-5">Please select a report type above to view data</td></tr>';
    return;
  }

  if(qs('#repActionDiv')) show(qs('#repActionDiv'));

  if(cat === 'stock'){
      if(qs('#repTypeDiv')) show(qs('#repTypeDiv'));
      if(qs('#repProductDiv')) show(qs('#repProductDiv'));
      if(qs('#repRetailerDiv')) show(qs('#repRetailerDiv'));
      if(typeSel) typeSel.innerHTML = '<option value="">All</option><option value="IN">IN</option><option value="OUT">OUT</option>';
  } else if(cat === 'product_wise'){
      if(qs('#repProductDiv')) show(qs('#repProductDiv'));
      if(qs('#repRetailerDiv')) show(qs('#repRetailerDiv')); 
  } else if(cat === 'financial'){
      if(qs('#repTypeDiv')) show(qs('#repTypeDiv'));
      if(qs('#repRetailerDiv')) show(qs('#repRetailerDiv'));
      if(typeSel) typeSel.innerHTML = '<option value="">All</option><option value="order">Order</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
  } else if(cat === 'retailer_ledger'){
      if(qs('#repRetailerDiv')) show(qs('#repRetailerDiv'));
      if(qs('#repTypeDiv')) show(qs('#repTypeDiv'));
      if(typeSel) typeSel.innerHTML = '<option value="">All</option><option value="order">Order</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
  } else if(cat === 'supplier_ledger'){
      if(qs('#repSupplierDiv')) show(qs('#repSupplierDiv'));
      if(qs('#repTypeDiv')) show(qs('#repTypeDiv'));
      if(typeSel) typeSel.innerHTML = '<option value="">All</option><option value="bill">Bill</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
  }
}

async function prepareRateHistory(pid, pname){
  const modalEl = qs('#rateHistoryModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
  
  qs('#rateHistoryTitle').textContent = `Rate History for ${pname}`;
  qs('#rateHistoryDate').value = new Date().toISOString().split('T')[0];
  qs('#rateHistoryPrice').value = '';
  
  const tbody = qs('#rateHistoryRows');
  tbody.innerHTML = '<tr><td colspan="2" class="text-center">Loading...</td></tr>';
  
  const loadHistory = async () => {
      try {
          const rates = await api(`/api/my/rates/history?productId=${pid}`);
          if(rates.length > 0 && rates[0].history){
              const hist = rates[0].history;
              hist.sort((a,b) => new Date(b.date) - new Date(a.date));
              
              tbody.innerHTML = hist.map(h => `
                  <tr>
                      <td>${new Date(h.date).toLocaleDateString()}</td>
                      <td class="text-end">₹${h.price}</td>
                  </tr>
              `).join('');
          } else {
              tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No history found</td></tr>';
          }
      } catch(e){
          tbody.innerHTML = `<tr><td colspan="2" class="text-danger">Error: ${e.message}</td></tr>`;
      }
  };
  
  await loadHistory();
  
  const btn = qs('#rateHistoryAddBtn');
  btn.onclick = async () => {
      const date = qs('#rateHistoryDate').value;
      const price = Number(qs('#rateHistoryPrice').value);
      if(!date || isNaN(price)) { alert('Invalid date or price'); return; }
      
      try {
          await api('/api/my/rates', {
              method: 'POST',
              body: JSON.stringify({ productId: pid, price, effectiveDate: date })
          });
          alert('Rate updated');
          await loadHistory();
          renderRatesTable();
      } catch(e){
          alert(e.message);
      }
  };
}

window.openDailyReport = () => {
    if(window.switchTab) window.switchTab('tab-reports');
    const catSel = qs('#repCategory');
    if(catSel) {
        catSel.value = 'product_wise';
        updateReportFilters();
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    if(qs('#repFromDate')) qs('#repFromDate').value = today;
    if(qs('#repToDate')) qs('#repToDate').value = today;
    
    // Auto generate
    if(typeof renderReport === 'function') renderReport();
};


let globalStockMoves = {};
let globalUnitMap = {};

function formatUnitQty(qty, unitObj, unitMap){
  if(qty === undefined || qty === null || isNaN(qty)) return '0';
  qty = Number(qty);
  if(!unitObj) return qty;
  
  let u = unitObj;
  if(typeof u === 'string'){
     if(unitMap && unitMap[u]) u = unitMap[u];
     else return qty; 
  }
  
  if(String(u.type).toLowerCase() === 'compound'){
            const conv = Number(u.conversionFactor);
            if(!conv) return `${qty} ${u.symbol||''}`;
            
            const major = Math.trunc(qty / conv);
            const minor = qty % conv;
    
    let f = u.firstUnit;
    let s = u.secondUnit;
    
    if(typeof f === 'string' && unitMap) f = unitMap[f];
    if(typeof s === 'string' && unitMap) s = unitMap[s];
    
    // Robust fallbacks for symbols
    const fSym = (f && f.symbol) ? f.symbol : (u.symbol || 'Box');
    const sSym = (s && s.symbol) ? s.symbol : 'Pcs';
    
    let parts = [];
    if(major !== 0) parts.push(`${major} ${fSym}`);
    if(minor !== 0) parts.push(`${minor} ${sSym}`);
    if(parts.length === 0) return `0 ${sSym}`;
    return parts.join(' ');
  } else {
    return `${qty} ${u.symbol||''}`;
  }
}

function groupProducts(products) {
  const groupsMap = new Map();
  products.forEach(p => {
    const key = p.baseName || p.nameEnglish;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { name: key, items: [], hasVariants: false });
    }
    groupsMap.get(key).items.push(p);
  });
  
  const groups = Array.from(groupsMap.values());
  
  groups.forEach(g => {
     if(g.items.length > 1 || (g.items.length === 1 && (g.items[0].baseName || g.items[0].variantName))) {
        g.hasVariants = true;
        g.items.sort((a, b) => {
            const vA = a.variantName || '';
            const vB = b.variantName || '';
            if(!vA && vB) return -1;
            if(vA && !vB) return 1;
            return vA.localeCompare(vB);
        });
     }
  });
  return groups;
}
// Explicitly export to global scope to prevent scope issues
window.groupProducts = groupProducts;

async function logout(){ try{ if(TOKEN){ await api('/api/auth/logout',{ method:'POST' }); } }catch{} setToken('', ''); location.href = uiHref('index'); }
function bindLogout(){ const btn=qs('#logoutBtn'); if(btn){ btn.addEventListener('click', (e)=>{ e.preventDefault(); logout(); }); } }

function checkAuth(){
  const path = location.pathname;
  if(path.endsWith('index.html') || path=== '/'){
    if(TOKEN) {
      if(ROLE==='admin') location.href = uiHref('admin');
      else if(ROLE==='distributor' || ROLE==='staff') location.href = uiHref('distributor');
      else if(ROLE==='retailer') location.href = uiHref('retailer');
      else { setToken('', ''); location.href = uiHref('index'); }
    }
  } else {
    if(!TOKEN) location.href = uiHref('index');
  }
}

async function login(){
  const email=qs('#email').value;
  const password=qs('#password').value;
  if(!email || !password){ alert('Please fill all fields'); return; }
  try{
    const res = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ email, password }) });
    setToken(res.token, res.user.role);
    if(res.user.role==='admin') location.href = uiHref('admin');
    else if(res.user.role==='distributor' || res.user.role==='staff' || res.user.role==='super_distributor') location.href = uiHref('distributor');
    else if(res.user.role==='retailer') location.href = uiHref('retailer');
    else alert('Unknown role');
  }catch(e){ alert(e.message); }
}

function initApp() {
  const p = location.pathname;
  if (p.endsWith('index.html') || p === '/' || p.endsWith('/ui/')) {
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
  
  // Use path check with element fallback to ensure correct loader runs
  if (p.includes('admin.html') || document.getElementById('usersList')) {
    loadAdmin();
  } else if (p.includes('distributor.html') || document.getElementById('nav-dashboard')) {
    loadDistributor();
  } else if (p.includes('retailer.html') || document.getElementById('tab-order')) {
    loadRetailer();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

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

async function checkRoleAndRedirect(expected){ try{ const me=await api('/api/me'); const role=me&&me.role; if(expected==='admin' && role!=='admin'){ location.href = uiHref('index'); return; } if(expected==='distributor' && role!=='distributor' && role!=='staff' && role!=='super_distributor'){ location.href = uiHref('index'); return; } if(expected==='retailer' && role!=='retailer'){ location.href = uiHref('index'); return; } return me; }catch{ location.href = uiHref('index'); } }

async function loadAdmin(){
  await checkRoleAndRedirect('admin');
  bindLogout();
  bindProductEditModal();
  renderUnitsGrid('#unitsGrid');
  bindUnitForm();
  renderProductsGrid('#productsGrid');
  bindProductForm();
  renderUsersList('#usersList');
  bindUserEditModal();
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

async function renderProductsGrid(selector){ 
  const el = qs(selector); 
  if(!el) return; 
  const units = await api('/api/units'); 
  const products = await api('/api/products'); 
  const unitOpts = '<option value="">-</option>' + units.map(u => `<option value="${u._id}">${u.symbol}</option>`).join('');
  
  el.innerHTML=''; 
  products.forEach(p=>{ 
    const card = document.createElement('div'); 
    card.className = 'card p-3 mb-2'; 
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-bold">${p.nameEnglish}</div>
          <div class="small text-muted">${p.nameHindi || ''}</div>
          ${p.variantGroup ? `<div class="badge bg-light text-dark border mt-1">Group: ${p.variantGroup}</div>` : ''}
          <div class="input-group input-group-sm mt-1" style="max-width:200px">
             <span class="input-group-text">Unit</span>
             <select class="form-select" id="p-unit-${p._id}">${unitOpts}</select>
             <button class="btn btn-outline-primary" onclick="updateProductUnit('${p._id}')"><i class="bi bi-check"></i></button>
          </div>
        </div>
        <div class="d-flex align-items-center gap-1 action-div">
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${p._id}')"><i class="bi bi-trash"></i></button>
        </div>
      </div>`; 
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-secondary';
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
    editBtn.onclick = () => openProductEditModal(p, 'global');
    
    const actionDiv = card.querySelector('.action-div');
    if(actionDiv) actionDiv.insertBefore(editBtn, actionDiv.firstChild);

    el.appendChild(card);
    const sel = card.querySelector(`#p-unit-${p._id}`);
    if(sel && p.unit) sel.value = typeof p.unit === 'object' ? p.unit._id : p.unit;
  }); 
}

async function updateProductUnit(id){
  const sel = qs(`#p-unit-${id}`);
  const unit = sel ? sel.value : '';
  try {
    await api(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify({ unit }) });
    alert('Unit updated');
  } catch(e) { alert(e.message); }
}

function bindProductForm(){ const btn=qs('#prodSave'); if(btn){ btn.onclick=async ()=>{ const nameEnglish=qs('#prodName').value; try{ await api('/api/products',{ method:'POST', body: JSON.stringify({ nameEnglish }) }); qs('#prodName').value=''; renderProductsGrid('#productsGrid'); }catch(e){ alert(e.message); } }; } }
async function deleteProduct(id){ if(!confirm('Delete product?')) return; try{ await api(`/api/products/${id}`,{ method:'DELETE' }); renderProductsGrid('#productsGrid'); }catch(e){ alert(e.message); } }

function bindProductEditModal() {
  const btn = qs('#btnSaveProductEdit');
  if(!btn) return;
  btn.onclick = async () => {
    const id = qs('#editProdId').value;
    const source = qs('#editProdSource').value;
    const nameEnglish = qs('#editProdNameDisplay').value;
    const baseName = qs('#editProdBaseName').value;
    const variantName = qs('#editProdVariantName').value;
    const nameHindi = qs('#editProdNameHindi').value;
    const variantGroup = qs('#editProdVariantGroup') ? qs('#editProdVariantGroup').value : '';

    const payload = {
        nameEnglish,
        nameHindi,
        baseName,
        variantName,
        variantGroup
    };
    
    try {
        const isDistributor = location.pathname.includes('distributor.html') || document.getElementById('nav-dashboard');
        const endpoint = (source === 'custom' || isDistributor) ? `/api/my/products/${id}` : `/api/products/${id}`;
        await api(endpoint, { method: 'PATCH', body: JSON.stringify(payload) });
        
        // Hide modal
        const modalEl = qs('#productEditModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
        
        // Refresh grid
        renderProductsGrid('#productsGrid');
        alert('Product updated');
    } catch(e) {
        alert(e.message);
    }
  };
}

window.openProductEditModal = function(p, source) {
    const modalEl = qs('#productEditModal');
    if(!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    
    qs('#editProdId').value = p._id;
    qs('#editProdSource').value = source;
    qs('#editProdNameDisplay').value = p.nameEnglish;
    qs('#editProdBaseName').value = p.baseName || '';
    qs('#editProdVariantName').value = p.variantName || '';
    qs('#editProdNameHindi').value = p.nameHindi || '';
    if(qs('#editProdVariantGroup')) qs('#editProdVariantGroup').value = p.variantGroup || '';
    
    modal.show();
};

async function renderUsersList(selector){ 
  const el=qs(selector); 
  if(!el) return; 
  const users=await api('/api/users'); 
  el.innerHTML=''; 
  users.forEach(u=>{ 
    const card=document.createElement('div'); 
    card.className='card p-3 mb-2'; 
    card.innerHTML=`
      <div class="d-flex justify-content-between align-items-center">
        <div>
           <div class="fw-bold">${u.name} <span class="badge bg-secondary">${u.role}</span></div>
           <div class="text-muted small">${u.email}</div>
           <div class="text-muted small">${u.phone||''}</div>
        </div>
        <div>
           <button class="btn btn-sm btn-outline-primary" onclick='openUserEditModal(${JSON.stringify(u)})'><i class="bi bi-pencil"></i> Edit</button>
        </div>
      </div>`; 
    el.appendChild(card); 
  }); 
}

function openUserEditModal(u){
  qs('#editUserId').value = u._id;
  qs('#editUserName').value = u.name;
  qs('#editUserEmail').value = u.email;
  const roleSel = qs('#editUserRole');
  roleSel.value = u.role;
  qs('#editUserPhone').value = u.phone || '';
  qs('#editUserAddress').value = u.address || '';
  qs('#editUserActive').checked = u.active;
  qs('#editUserPassword').value = '';
  
  // Load distributors and handle role change
  const distDiv = qs('#editUserDistributorDiv');
  const distSel = qs('#editUserDistributor');
  
  const toggleDist = () => {
    if(roleSel.value === 'retailer') show(distDiv);
    else hide(distDiv);
  };
  roleSel.onchange = toggleDist;
  
  // Fetch distributors
  api('/api/users?role=distributor').then(dists => {
    distSel.innerHTML = '<option value="">-- Select Distributor --</option>';
    dists.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d._id;
      opt.textContent = d.name + (d.active ? '' : ' (Inactive)');
      if(u.distributorId === d._id || (u.distributorId && u.distributorId._id === d._id)) opt.selected = true;
      distSel.appendChild(opt);
    });
    toggleDist();
  }).catch(console.error);

  const m = bootstrap.Modal.getOrCreateInstance(qs('#userEditModal'));
  m.show();
}

function bindUserEditModal(){
  const btn = qs('#btnSaveUser');
  if(btn){
    btn.onclick = async () => {
       const id = qs('#editUserId').value;
       const name = qs('#editUserName').value;
       const email = qs('#editUserEmail').value;
       const role = qs('#editUserRole').value;
       const phone = qs('#editUserPhone').value;
       const address = qs('#editUserAddress').value;
       const active = qs('#editUserActive').checked;
       const password = qs('#editUserPassword').value;
       const distributorId = qs('#editUserDistributor').value;
       
       const body = { name, email, role, phone, address, active, distributorId };
       if(password) body.password = password;
       
       try {
         await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
         const el = qs('#userEditModal');
         const m = bootstrap.Modal.getInstance(el);
         if(m) m.hide();
         renderUsersList('#usersList');
       } catch(e) { alert(e.message); }
    };
  }
}
async function renderRatesList(selector){ const el=qs(selector); if(!el) return; const rates=await api('/api/admin/rates'); const products=await api('/api/products'); const pMap={}; products.forEach(p=>pMap[p._id]=p.nameEnglish); el.innerHTML=''; rates.forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${pMap[r.productId]||r.productId}</td><td>₹${r.price}</td>`; el.appendChild(tr); }); }
function bindGlobalRateForm(){ const btn=qs('#rateSave'); if(btn){ btn.onclick=async ()=>{ const productId=qs('#rateProduct').value; const price=qs('#ratePrice').value; try{ await api('/api/admin/rates',{ method:'POST', body: JSON.stringify({ productId, price }) }); renderRatesList('#ratesList'); }catch(e){ alert(e.message); } }; } loadRateProductSelect(); }
async function loadRateProductSelect(){ const products=await api('/api/products'); const opts='<option value="">Select Product</option>'+products.map(p=>`<option value="${p._id}">${p.nameEnglish}</option>`).join(''); qs('#rateProduct').innerHTML=opts; }

// Define switchTab globally so it's available even if loadDistributor pauses
window.switchTab = (id, pushHistory = true) => {
  qsa('.tab-pane').forEach(el => {
     el.classList.remove('show','active');
     if(el.id === id) el.classList.add('show','active');
  });
  qsa('.nav-link').forEach(el => el.classList.remove('active'));
  const navBtn = qs(`button[data-bs-target="#${id}"]`);
  if(navBtn) navBtn.classList.add('active');
  
  if(pushHistory){
      try { history.pushState({ tab: id }, '', `#${id}`); } catch(e){}
  }

  // Load content
  if(id==='tab-dashboard') loadDistDashboard();
  if(id==='tab-products') { renderDistProductsGrid('#distProdGrid'); renderHiddenProducts('#hiddenProdList'); bindDistProductAdd(); }
  if(id==='tab-inventory') renderInventoryStatus();
  if(id==='tab-stock-in') renderStockIn();
  if(id==='tab-stock-out') renderStockOut();
  if(id==='tab-stock-wastage') renderStockWastage();
  if(id==='tab-retailers') { loadRetailers(); bindRetailerAdd(); bindRetailerEdit(); bindAdjustmentForm(); bindPaymentActions(); }
  if(id==='tab-staff') { loadStaff(); bindStaffForm(); }
  if(id==='tab-rates') { loadDistRates(); }
  if(id==='tab-reports') { renderReport(); bindReportActions(); }
  if(id==='tab-sd') { renderSdDistributors(); }
};

async function loadDistributor(){
  // Tabs
  const tabs = ['dashboard','products','inventory','stock-in','stock-out','stock-wastage','rates','retailers','reports','staff','sd'];
  // window.switchTab is already defined above

  tabs.forEach(t => {
     const btn = qs(`#nav-${t}`);
     if(btn) btn.onclick = () => window.switchTab(`tab-${t}`);
     const qa = qs(`#qa-${t}`);
     if(qa) qa.onclick = () => window.switchTab(`tab-${t}`);
  });
  
  // History Handling
  window.onpopstate = (event) => {
      if(event.state && event.state.tab){
          window.switchTab(event.state.tab, false);
          // If we are at dashboard, trap the user by pushing state again
          // This prevents the next back button from exiting the app
          if(event.state.tab === 'tab-dashboard'){
              history.pushState({ tab: 'tab-dashboard' }, '', '#tab-dashboard');
          }
      } else {
          // If popped to initial/unknown state, force dashboard and trap
          window.switchTab('tab-dashboard', false);
          history.pushState({ tab: 'tab-dashboard' }, '', '#tab-dashboard');
      }
  };
  
  // Initialize history
  const h = location.hash;
  if(h && h.startsWith('#tab-')){
     const id = h.substring(1);
     // Base state should be dashboard
     history.replaceState({ tab: 'tab-dashboard' }, '', '#tab-dashboard');
     // Push the requested tab on top
     window.switchTab(id, true);
  } else {
     // Push initial state so we have something to pop
     history.replaceState({ tab: 'tab-dashboard' }, '', '#tab-dashboard');
     history.pushState({ tab: 'tab-dashboard' }, '', '#tab-dashboard'); 
     // Ensure dashboard is active
     window.switchTab('tab-dashboard', false);
  }

  // Bind offcanvas listeners immediately
  const ocEl = qs('#offcanvasNavbar');
  if(ocEl){
    ocEl.addEventListener('click', (ev)=>{
      const t = ev.target;
      if(!(t.closest('.nav-link') || t.closest('.btn') || t.closest('input') || t.closest('select') || t.closest('textarea'))){
        try{ 
            if(ocEl){
                const inst = bootstrap.Offcanvas.getInstance(ocEl) || bootstrap.Offcanvas.getOrCreateInstance(ocEl); 
                inst.hide();
            }
        }catch{}
      }
    });
    document.addEventListener('click', (ev)=>{
      const open = document.querySelector('.offcanvas.show');
      if(!open) return;
      if(ev.target.closest('.offcanvas')) return;
      try{ 
          if(open){
            const inst = bootstrap.Offcanvas.getInstance(open) || bootstrap.Offcanvas.getOrCreateInstance(open); 
            inst.hide();
          }
      }catch{}
    });
  }

  const me = await checkRoleAndRedirect('distributor');
  bindLogout();
  bindProductEditModal();
  
  // Show staff name if available
  if(me.name) {
    const brand = qs('#navbarBrand');
    if(brand) {
       if(me.role === 'staff') brand.textContent = `${me.name} Panel`;
       else if(me.role === 'super_distributor') {
         brand.textContent = `Super Distributor Dashboard - ${me.name}`;
         const navWrap = qs('#nav-sd-wrapper');
         if(navWrap) navWrap.classList.remove('d-none');
       } else {
         brand.textContent = `Distributor Dashboard - ${me.name}`;
       }
    }
  }
  
  if(me.role === 'staff'){
    const p = me.permissions || [];
    window.PERM = p;
    const hideIt = (id) => {
       const el = qs('#qa-'+id); if(el) hide(el);
       const nav = qs('#nav-'+id); if(nav) hide(nav.parentNode);
    };
    
    // Permission based hiding
    if(!p.includes('products')) hideIt('products');
    if(!p.includes('inventory')) hideIt('inventory');
    if(!p.includes('rates')) hideIt('rates');
    if(!p.includes('reports')) hideIt('reports');
    if(!p.includes('staff')) hideIt('staff');
    
    if(!p.includes('stock_in')) hideIt('stock-in');
    if(!p.includes('stock_out')) hideIt('stock-out');
    if(!p.includes('stock_wastage')) hideIt('stock-wastage');
    
    // Retailers: Show if they have explicit view permission OR any functional permission
    if(!(p.includes('view_retailers') || p.includes('add_retailer') || p.includes('payment_cash') || p.includes('payment_online'))) hideIt('retailers');
  }
  
  if(me.role === 'super_distributor'){
    const addBtn = qs('#sdAddDistributorBtn');
    if(addBtn) addBtn.onclick = sdAddDistributor;
  }
  
  loadDistDashboard();
}

async function renderSdDistributors(){
  try{
    const tbody = qs('#sdDistributorsBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';
    const items = await api('/api/sd/accounts/summary');
    if(!items.length){
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No distributors found.</td></tr>';
      return;
    }
    const rows = items.map(d => {
      const balance = Number(d.balance || 0);
      const isActive = d.active === undefined ? true : !!d.active;
      const badge = isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
      const balCls = balance > 0 ? 'text-danger' : (balance < 0 ? 'text-success' : 'text-muted');
      const id = d.distributorId || d._id;
      return `
        <tr data-id="${id}">
          <td>${d.name||'-'}</td>
          <td>${d.email||'-'}</td>
          <td>${d.phone||'-'}</td>
          <td>${badge}</td>
          <td class="text-end ${balCls}">${balance.toFixed(2)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="sdViewRetailers('${id}')"><i class="bi bi-people"></i></button>
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="sdEditDistributor('${id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-success me-1" onclick="sdAddPayment('${id}')"><i class="bi bi-cash-coin"></i></button>
            <button class="btn btn-sm btn-outline-warning me-1" onclick="sdAddStockOut('${id}')"><i class="bi bi-box-arrow-up"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="sdToggleDistributor('${id}', ${isActive})"><i class="bi bi-power"></i></button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows.join('');
  }catch(e){
    const tbody = qs('#sdDistributorsBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error: ${e.message}</td></tr>`;
  }
}

async function sdViewRetailers(distId){
  try{
    const section = qs('#sdRetailerSection');
    const tbody = qs('#sdRetailersBody');
    if(!section || !tbody) return;
    section.classList.remove('d-none');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';
    const items = await api(`/api/sd/retailers?distributorId=${encodeURIComponent(distId)}`);
    if(!items.length){
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No retailers found.</td></tr>';
      return;
    }
    const rows = items.map(r => {
      const badge = r.active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>';
      const bal = Number(r.currentBalance || 0);
      const balCls = bal > 0 ? 'text-danger' : (bal < 0 ? 'text-success' : 'text-muted');
      return `
        <tr>
          <td>${r.name}</td>
          <td>${r.phone||'-'}</td>
          <td>${badge}</td>
          <td class="text-end ${balCls}">${bal.toFixed(2)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" onclick="sdEditRetailer('${r._id}')"><i class="bi bi-pencil"></i></button>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = rows.join('');
  }catch(e){
    const tbody = qs('#sdRetailersBody');
    if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Error: ${e.message}</td></tr>`;
  }
}

async function sdAddDistributor(){
  try{
    const name = prompt('Distributor name','');
    if(!name) return;
    const email = prompt('Email','');
    if(!email) return;
    const password = prompt('Password for distributor login','');
    if(!password) return;
    const phone = prompt('Phone','') || '';
    const address = prompt('Address','') || '';
    await api('/api/sd/distributors', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, address })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

async function sdEditRetailer(id){
  try{
    const items = await api('/api/sd/retailers');
    const r = items.find(x => x._id === id);
    if(!r) return;
    const name = prompt('Retailer name', r.name || '');
    if(name === null) return;
    const phone = prompt('Phone', r.phone || '');
    if(phone === null) return;
    const address = prompt('Address', r.address || '');
    if(address === null) return;
    await api(`/api/sd/retailers/${id}`,{
      method:'PATCH',
      body: JSON.stringify({ name, phone, address })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

async function sdAddPayment(distId){
  try{
    const type = prompt('Payment type: cash / online / adjust','cash');
    if(!type) return;
    let mapped = '';
    if(type.toLowerCase()==='cash') mapped='payment_cash';
    else if(type.toLowerCase()==='online') mapped='payment_online';
    else mapped='adjustment';
    const amtStr = prompt('Amount','0');
    if(!amtStr) return;
    const amount = Number(amtStr);
    if(!amount || amount<=0){ alert('Invalid amount'); return; }
    const note = prompt('Note','');
    await api(`/api/sd/distributors/${distId}/accounts/payments`,{
      method:'POST',
      body: JSON.stringify({ type: mapped, amount, note })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

async function sdAddStockOut(distId){
  try{
    const amtStr = prompt('Stock value amount','0');
    if(!amtStr) return;
    const amount = Number(amtStr);
    if(!amount || amount<=0){ alert('Invalid amount'); return; }
    const note = prompt('Note','Stock OUT');
    await api(`/api/sd/distributors/${distId}/accounts/payments`,{
      method:'POST',
      body: JSON.stringify({ type: 'stock_out', amount, note })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

async function sdEditDistributor(id){
  try{
    const items = await api('/api/sd/distributors');
    const d = items.find(x => x._id === id);
    if(!d) return;
    const name = prompt('Distributor name', d.name || '');
    if(name === null) return;
    const phone = prompt('Phone', d.phone || '');
    if(phone === null) return;
    const address = prompt('Address', d.address || '');
    if(address === null) return;
    await api(`/api/sd/distributors/${id}`,{
      method:'PATCH',
      body: JSON.stringify({ name, phone, address })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

async function sdToggleDistributor(id, isActive){
  try{
    const next = !isActive;
    const msg = next ? 'Activate this distributor?' : 'Deactivate this distributor?';
    if(!confirm(msg)) return;
    await api(`/api/sd/distributors/${id}`,{
      method:'PATCH',
      body: JSON.stringify({ active: next })
    });
    renderSdDistributors();
  }catch(e){ alert(e.message); }
}

window.renderSdDistributors = renderSdDistributors;
window.sdViewRetailers = sdViewRetailers;
window.sdEditRetailer = sdEditRetailer;
window.sdAddPayment = sdAddPayment;
window.sdAddDistributor = sdAddDistributor;
window.sdAddStockOut = sdAddStockOut;
window.sdEditDistributor = sdEditDistributor;
window.sdToggleDistributor = sdToggleDistributor;

async function loadDistDashboard(){
  try{
    const stats = await api('/api/my/stats');
    if(qs('#dStatInventory')) qs('#dStatInventory').textContent = stats.inventoryCount || 0;
    if(qs('#dStatLowStock')) qs('#dStatLowStock').textContent = stats.lowStockCount || 0;
    if(qs('#dStatRetailers')) qs('#dStatRetailers').textContent = stats.retailerCount || 0;
    if(qs('#dStatOrders')) qs('#dStatOrders').textContent = stats.todayOrders || 0;
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
           const f = (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]) ? (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]).symbol : '?';
           const s = (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]) ? (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]).symbol : '?';
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
        
        const baseNameEl = qs('#distProdBaseName');
        const variantNameEl = qs('#distProdVariantName');
        const baseName = baseNameEl ? baseNameEl.value.trim() : '';
        const variantName = variantNameEl ? variantNameEl.value.trim() : '';

        if(!name && !baseName){ notify('Product Name or Base Name required', 'warning'); return; }
        
        const payload = { unit };
        if(name) payload.nameEnglish = name;
        if(baseName) payload.baseName = baseName;
        if(variantName) payload.variantName = variantName;

        try{
          await api('/api/my/products',{ method:'POST', body: JSON.stringify(payload) });
          if(nameEl) nameEl.value='';
          if(unitEl) unitEl.value='';
          if(baseNameEl) baseNameEl.value='';
          if(variantNameEl) variantNameEl.value='';
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
  
  // Group items by baseName
  const groups = {};
  items.forEach(p => {
    const key = p.baseName ? p.baseName : p.nameEnglish;
    if(!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  // Helper to render a single row within div layout
  const renderRow = (p, isVariant=false) => {
    const div = document.createElement('div');
    div.className = 'variant-row'; // Custom CSS class
    
    const unitOptions = '<option value="">-</option>' + units.map(u=>{
      let label = u.symbol;
      if(u.type==='Compound'){
         const f = (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]) ? (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]).symbol : '?';
         const s = (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]) ? (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]).symbol : '?';
         label += ` (${f} → ${s} × ${u.conversionFactor})`;
      } else if(u.formalName){
         label += ` (${u.formalName})`;
      }
      return `<option value="${u._id}" ${p.unit===u._id?'selected':''}>${label}</option>`;
    }).join('');
    
    const displayName = isVariant && p.variantName ? p.variantName : p.nameEnglish;
    const nameDisplay = `<div class="variant-name">${displayName}</div>${p.nameHindi ? `<div class="variant-sub">${p.nameHindi}</div>` : ''}`;
    const badge = p.source === 'global' ? '<span class="badge bg-secondary rounded-pill" style="font-size:0.6rem">Global</span>' : '<span class="badge bg-info text-dark rounded-pill" style="font-size:0.6rem">Custom</span>';
    const groupBadge = p.variantGroup ? `<span class="badge bg-light text-dark border ms-1" style="font-size:0.6rem" title="Group: ${p.variantGroup}">${p.variantGroup}</span>` : '';

    div.innerHTML=`
      <div class="variant-info">
        ${nameDisplay}
        <div class="mt-1">${badge}${groupBadge}</div>
      </div>
      
      <div class="variant-controls">
        <div class="price-input-group">
          <input type="number" class="form-control form-control-sm" placeholder="Price" value="${p.price||''}" data-id="${p._id}" data-type="price">
        </div>
        
        <div class="unit-select-group">
           <div class="input-group input-group-sm">
             <select class="form-select" data-id="${p._id}" data-type="unit">${unitOptions}</select>
             <button class="btn btn-outline-secondary" type="button" data-act="unitInfo" data-id="${p._id}" title="Info"><i class="bi bi-info-circle"></i></button>
           </div>
        </div>

        <div class="action-btn-group">
          <button class="btn btn-sm btn-outline-primary" data-act="save" data-id="${p._id}" data-source="${p.source}" title="Save Price/Unit"><i class="bi bi-check-lg"></i></button>
          <button class="btn btn-sm btn-outline-secondary" data-act="edit" data-id="${p._id}" title="Edit Name/Details"><i class="bi bi-pencil"></i></button>
          ${p.source==='custom' ? `<button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${p._id}" title="Delete"><i class="bi bi-trash"></i></button>` : `<button class="btn btn-sm btn-outline-secondary" data-act="hide" data-id="${p._id}" title="Hide"><i class="bi bi-eye-slash"></i></button>`}
        </div>
      </div>
    `;
    return div;
  };

  Object.keys(groups).sort().forEach(key => {
    const groupItems = groups[key];
    groupItems.sort((a,b) => (a.variantName||'').localeCompare(b.variantName||''));

    const card = document.createElement('div');
    card.className = 'prod-group-card'; // Custom CSS class
    
    // Header
    const header = document.createElement('div');
    header.className = 'prod-group-header'; // Custom CSS class
    header.innerHTML = `
       <div class="fw-bold text-dark m-0 fs-5"><i class="bi bi-collection-fill me-2 text-primary"></i>${key}</div>
       <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm" data-act="addVariant" data-base="${key}"><i class="bi bi-plus-lg"></i> Add Variant</button>
    `;
    card.appendChild(header);

    // Body container
    const body = document.createElement('div');
    body.className = 'prod-group-body';
    
    groupItems.forEach(p => {
        body.appendChild(renderRow(p, !!p.variantName));
    });
    
    card.appendChild(body);
    el.appendChild(card);
  });
  
  el.onclick = async (ev)=>{
    const t = ev.target;
    const btn = t.closest('button');
    if(!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id'); 

    if(act === 'addVariant') {
       const base = btn.getAttribute('data-base');
       fillAddVariant(base);
       return;
    }

    if(!act||!id) return;
    
    try{
      if(act==='edit'){
        const product = items.find(x => x._id === id);
        if(product) openProductEditModal(product, product.source);
        return;
      }
      if(act==='unitInfo'){
        const sel = el.querySelector(`select[data-id="${id}"]`);
        const unitId = sel ? sel.value : '';
        if(!unitId) { alert('No unit selected'); return; }
        const unit = unitMap[unitId];
        if(unit) renderUnitDetailModal(unit, unitMap);
      }
      if(act==='save'){
        // Save both Price and Unit
        const row = btn.closest('.variant-row');
        const priceInput = row.querySelector(`input[data-type="price"]`);
        const unitSelect = row.querySelector(`select[data-type="unit"]`);
        
        const price = priceInput ? parseFloat(priceInput.value) : 0;
        const unit = unitSelect ? unitSelect.value : '';
        const source = btn.getAttribute('data-source');
        
        await api(`/api/my/products/${id}`, { 
            method:'PATCH', 
            body: JSON.stringify({ unit, price }) 
        });
        
        // Visual feedback
        const icon = btn.querySelector('i');
        if(icon) { icon.className='bi bi-check2-all'; setTimeout(()=>icon.className='bi bi-check-lg', 1500); }
        notify('Product updated', 'success');
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
        await api(`/api/my/products/${id}/hide`, { method:'DELETE' });
        renderHiddenProducts(selector);
        renderDistProductsGrid('#distProdGrid');
      }catch(e){ alert(e.message); }
    }
  };
}

function fillAddVariant(baseName) {
  const baseInput = qs('#distProdBaseName');
  const varInput = qs('#distProdVariantName');
  const simpleInput = qs('#distProdName');
  
  if(baseInput) {
     baseInput.value = baseName;
     // Scroll to it
     setTimeout(() => baseInput.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }
  if(simpleInput) simpleInput.value = ''; // Clear simple name
  if(varInput) {
     varInput.value = '';
     setTimeout(() => varInput.focus(), 600);
  }
}

async function renderInventoryStatus(){
  try {
    const products = await api('/api/my/products?_t=' + Date.now());
    console.log('Raw Products from API:', products); // DEBUG LOG

    // Fetch product stats for sorting
    try {
        const stats = await api('/api/my/product-stats');
        const statMap = {};
        stats.forEach(s => statMap[s._id] = s.movement);
        products.sort((a, b) => {
            const mA = statMap[a._id] || 0;
            const mB = statMap[b._id] || 0;
            return mB - mA;
        });
    } catch(e) { console.error('Failed to sort products', e); }

    const inv = await api('/api/my/inventory');
    const units = await api('/api/units');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    const invMap = {};
    inv.forEach(i => { invMap[i.productId] = Number(i.quantity) || 0; });

    const tbody = qs('#invStatusRows');
    if (tbody) {
      tbody.innerHTML = '';
      const grouped = groupProducts(products);
      console.log('Grouped Products:', grouped); // DEBUG LOG
      grouped.forEach(g => {
        if(g.hasVariants) {
             const trHeader = document.createElement('tr');
             trHeader.className = 'table-light fw-bold';
             trHeader.innerHTML = `<td colspan="2">${g.name}</td>`;
             tbody.appendChild(trHeader);
             
             g.items.forEach(p => {
                const qty = invMap[p._id] || 0;
                let badgeClass = 'bg-secondary';
                if(qty > 10) badgeClass = 'bg-success';
                else if(qty > 0) badgeClass = 'bg-warning text-dark';
                const qtyStr = formatUnitQty(qty, p.unit, unitMap);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td class="ps-4">
                    <div class="">${p.variantName || 'Base'}</div>
                  </td>
                  <td class="text-end">
                    <span class="badge ${badgeClass} fs-6">${qtyStr}</span>
                  </td>
                `;
                tbody.appendChild(tr);
             });
        } else {
             const p = g.items[0];
             const qty = invMap[p._id] || 0;
             let badgeClass = 'bg-secondary';
             if(qty > 10) badgeClass = 'bg-success';
             else if(qty > 0) badgeClass = 'bg-warning text-dark';
             const qtyStr = formatUnitQty(qty, p.unit, unitMap);
             
             const tr = document.createElement('tr');
             tr.innerHTML = `
               <td>
                 <div class="fw-bold">${p.nameEnglish}</div>
                 <div class="text-muted small">${p.nameHindi}</div>
               </td>
               <td class="text-end">
                 <span class="badge ${badgeClass} fs-6">${qtyStr}</span>
               </td>
             `;
             tbody.appendChild(tr);
        }
      });
    }
  } catch (e) { console.error(e); }
}

async function addSupplierPrompt(){
  const name = prompt('Enter new supplier name:');
  if(!name) return;
  try{
    await api('/api/my/suppliers',{ method:'POST', body: JSON.stringify({ name }) });
    alert('Supplier added');
    renderStockIn();
  }catch(e){ alert(e.message); }
}

function autoConvertSecondUnit(e) {
  const input = e.target;
  const val = Number(input.value);
  const conv = Number(input.getAttribute('data-conv'));
  
  // Only convert if value is valid and greater than or equal to conversion factor
  if (!conv || isNaN(val) || val < conv) return;

  const extraMajor = Math.floor(val / conv);
  const newMinor = val % conv;

  // Find sibling "first" unit input in the same input-group
  const parent = input.closest('.input-group');
  if(!parent) return;
  
  const firstInput = parent.querySelector('input[class*="-first"]'); 
  if(firstInput) {
      const currentMajor = Number(firstInput.value || 0);
      firstInput.value = currentMajor + extraMajor;
      // Trigger input event to ensure any dependent logic (like totals) updates
      firstInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  input.value = newMinor;
  // Trigger input event to reflect change in any listeners
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function renderStockIn(editMove = null){
  try {
    const suppliers = await api('/api/my/suppliers');
    const products = await api('/api/my/products?_t=' + Date.now());
    
    // Fetch product stats for sorting
    try {
        const stats = await api('/api/my/product-stats');
        const statMap = {};
        stats.forEach(s => statMap[s._id] = s.movement);
        products.sort((a, b) => {
            const mA = statMap[a._id] || 0;
            const mB = statMap[b._id] || 0;
            return mB - mA;
        });
    } catch(e) { console.error('Failed to sort products', e); }

    const units = await api('/api/units');
    const inv = await api('/api/my/inventory');
    const invMap = {}; inv.forEach(i => invMap[i.productId] = Number(i.quantity) || 0);
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);

    let dateInput = qs('#stockInDate');
    if(dateInput && !dateInput.value){ dateInput.value = new Date().toISOString().split('T')[0]; }

    const sel = qs('#stockInSupplierSel');
    const tbody = qs('#stockInRows');
    const saveBtn = qs('#stockInSaveBtn');
    const totalQtyEl = qs('#stockInTotalQty');

    const calcTotal = () => {
        let totalMCT = 0;
        let totalBox = 0;
        
        products.forEach(p => {
             const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
             const isCompound = u && String(u.type) === 'Compound';
             const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
             let major = 0;
             
             if(isCompound){
               const a = qs(`.in-first[data-id="${p._id}"]`);
               major = Number(a && a.value || 0);
             } else {
               const s = qs(`.in-simple[data-id="${p._id}"]`);
               major = Number(s && s.value || 0);
             }

             // Check unit name to decide bucket
             const uName = u ? (u.formalName || u.symbol || '').toLowerCase() : '';
             if(uName.includes('mct') || uName.includes('crate')) {
                 totalMCT += major;
             } else {
                 // Default to box/other
                 totalBox += major;
             }
        });
        
        if(totalQtyEl) {
            const parts = [];
            if(totalMCT > 0) parts.push(`${totalMCT} MCT`);
            if(totalBox > 0) parts.push(`${totalBox} Box`);
            totalQtyEl.textContent = parts.length > 0 ? parts.join(' + ') : '0';
        }
    };

    // Removed updateBalance as per request to remove supplier balance

    if(sel){
      const cur = editMove ? (editMove.supplierId && editMove.supplierId._id ? editMove.supplierId._id : editMove.supplierId) : sel.value;
      sel.innerHTML = '<option value="">Select Supplier</option>' + suppliers.map(s=>`<option value="${s._id}">${s.name}</option>`).join('');
      if(cur) sel.value = cur;
      if(editMove) sel.disabled = true; else sel.disabled = false;
    }

    // Load existing IN moves for selected date+supplier
    let existingMap = {};
    let outExistingMap = {};
    const loadExisting = async () => {
      existingMap = {};
      try {
        const date = (dateInput && dateInput.value) ? dateInput.value : '';
        const sid = sel ? sel.value : '';
        if(!date || !sid) return;
        const range = `from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`;
        const url = `/api/my/stock-moves?type=IN&supplierId=${encodeURIComponent(sid)}&${range}`;
        const moves = await api(url);
        moves.forEach(m => {
          const pid = m.productId && m.productId._id ? m.productId._id : m.productId;
          existingMap[pid] = m;
        });
      } catch {}
    };
    const loadExistingOut = async () => {
      outExistingMap = {};
      try {
        const date = (dateInput && dateInput.value) ? dateInput.value : '';
        const sid = sel ? sel.value : '';
        if(!date || !sid) return;
        const range = `from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`;
        const url = `/api/my/stock-moves?type=OUT&supplierId=${encodeURIComponent(sid)}&${range}`;
        const moves = await api(url);
        moves.forEach(m => {
          const pid = m.productId && m.productId._id ? m.productId._id : m.productId;
          const qty = Number(m.quantity) || 0;
          outExistingMap[pid] = (outExistingMap[pid] || 0) + qty;
        });
      } catch {}
    };
    await loadExisting();
    await loadExistingOut();

    if(dateInput) dateInput.onchange = async () => { await renderStockIn(); };
    if(sel) sel.onchange = async () => { await renderStockIn(); };

    if(tbody){
      tbody.innerHTML = '';
      const grouped = groupProducts(products);
      
      const createRow = (p, isGrouped) => {
        if(p.source === 'global' && !p.active) return null;
        const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
        const isCompound = u && String(u.type) === 'Compound';
        const first = isCompound ? (u.firstUnit && typeof u.firstUnit === 'object' ? u.firstUnit : (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])) : null;
        const second = isCompound ? (u.secondUnit && typeof u.secondUnit === 'object' ? u.secondUnit : (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])) : null;
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const qtyInCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm qty-narrow in-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm qty-narrow in-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>
             <div class="small text-muted sm-hide">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
          : `<input type="number" class="form-control form-control-sm qty-narrow in-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        const outQtyCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm qty-narrow supout-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm qty-narrow supout-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>`
          : `<input type="number" class="form-control form-control-sm qty-narrow supout-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        
        const tr = document.createElement('tr');
        tr.id = `row-in-${p._id}`;
        
        const nameDisplay = isGrouped ? (p.variantName || 'Base') : p.nameEnglish;
        const nameClass = isGrouped ? '' : 'fw-bold small';
        const tdClass = isGrouped ? 'ps-4' : '';

        tr.innerHTML = `
          <td class="${tdClass}">
            <div class="${nameClass}">${nameDisplay}</div>
          </td>
          <td>${qtyInCell}</td>
          <td>${outQtyCell}</td>
        `;

        const ex = existingMap[p._id];
        if(ex){
          const u2 = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
          const isC = u2 && String(u2.type) === 'Compound';
          const conv2 = isC ? Number(u2.conversionFactor)||0 : 0;
          if(isC){
            const major = Math.floor(Number(ex.quantity||0)/conv2);
            const minor = Number(ex.quantity||0) % conv2;
            const inp1 = tr.querySelector('.in-first');
            const inp2 = tr.querySelector('.in-second');
            if(inp1) inp1.value = major;
            if(inp2) inp2.value = minor;
          } else {
            const s = tr.querySelector('.in-simple');
            if(s) s.value = Number(ex.quantity||0);
          }
        }

        const exOutQty = outExistingMap[p._id] ? Number(outExistingMap[p._id]) || 0 : 0;
        if(exOutQty){
          const u3 = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
          const isC3 = u3 && String(u3.type) === 'Compound';
          const conv3 = isC3 ? Number(u3.conversionFactor)||0 : 0;
          if(isC3 && conv3 > 0){
            const majorO = Math.floor(exOutQty/conv3);
            const minorO = exOutQty % conv3;
            const o1 = tr.querySelector('.supout-first');
            const o2 = tr.querySelector('.supout-second');
            if(o1) o1.value = majorO;
            if(o2) o2.value = minorO;
          } else {
            const os = tr.querySelector('.supout-simple');
            if(os) os.value = exOutQty;
          }
        }
        return tr;
      };

      grouped.forEach(g => {
         if(g.hasVariants) {
             const trHeader = document.createElement('tr');
             trHeader.className = 'table-light fw-bold';
             trHeader.innerHTML = `<td colspan="2">${g.name}</td>`;
             tbody.appendChild(trHeader);
             
             g.items.forEach(p => {
                 const tr = createRow(p, true);
                 if(tr) tbody.appendChild(tr);
             });
         } else {
             const tr = createRow(g.items[0], false);
             if(tr) tbody.appendChild(tr);
         }
      });
      
      // Auto-convert listeners
      qsa('.in-second').forEach(i => i.addEventListener('change', autoConvertSecondUnit));
      qsa('.supout-second').forEach(i => i.addEventListener('change', autoConvertSecondUnit));

      // Calc Total listeners
      qsa('.in-first').forEach(i => i.addEventListener('input', calcTotal));
      qsa('.in-second').forEach(i => i.addEventListener('input', calcTotal));
      qsa('.in-simple').forEach(i => i.addEventListener('input', calcTotal));
    }

    if(editMove){
       const pId = editMove.productId && editMove.productId._id ? editMove.productId._id : editMove.productId;
       const row = qs(`#row-in-${pId}`);
       if(row){
          row.classList.add('table-warning');
          row.scrollIntoView({behavior:'smooth', block:'center'});
          
          const u = editMove.productId && editMove.productId.unit ? editMove.productId.unit : null;
          let unitObj = u;
          if(typeof u === 'string') unitObj = unitMap[u];
          
          if(unitObj && String(unitObj.type) === 'Compound' && unitObj.conversionFactor){
             const conv = Number(unitObj.conversionFactor);
             const major = Math.floor(editMove.quantity / conv);
             const minor = editMove.quantity % conv;
             const inp1 = row.querySelector('.in-first');
             const inp2 = row.querySelector('.in-second');
             if(inp1) inp1.value = major;
             if(inp2) inp2.value = minor;
          } else {
             const inp = row.querySelector('.in-simple');
             if(inp) inp.value = editMove.quantity;
          }
       }
       // Hide other rows or disable inputs? Maybe just leave them.
    }
    
    // Initial Calc
    calcTotal();

    if(saveBtn){
      const handler = async (ev) => {
        const btn = ev && ev.currentTarget ? ev.currentTarget : null;
        if (btn) {
          if (btn.disabled) return;
          btn.disabled = true;
        }
        try {
          if(editMove){
             // UPDATE Logic
             const pId = editMove.productId && editMove.productId._id ? editMove.productId._id : editMove.productId;
             // Find quantity inputs
             let qty = 0;
             const row = qs(`#row-in-${pId}`);
             if(!row) return;
             
             const u = editMove.productId && editMove.productId.unit ? editMove.productId.unit : null;
             let unitObj = u;
             if(typeof u === 'string') unitObj = unitMap[u];
             const isCompound = unitObj && String(unitObj.type) === 'Compound';
             const conv = isCompound ? Number(unitObj.conversionFactor)||0 : 0;
             
             if(isCompound){
               const a = row.querySelector('.in-first');
               const b = row.querySelector('.in-second');
               qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
             } else {
               const s = row.querySelector('.in-simple');
               qty = Number(s && s.value || 0);
             }
             
             if(qty < 0) throw new Error('Invalid quantity');
             
             await api(`/api/my/stock-moves/${editMove._id}`, { method:'PUT', body: JSON.stringify({ quantity: qty }) });
             alert('Stock updated');
             renderStockIn(); // reset
             return;
          }

          const supplierId = sel ? sel.value : '';
          if(!supplierId) throw new Error('Select supplier');
          const date = dateInput ? dateInput.value : '';
          if(!date) throw new Error('Select date');
          const ops = [];
          const outItems = [];
          
          products.forEach(p => {
            const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
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
            
            const existing = existingMap[p._id];
            if(existing){
              const curQty = Number(existing.quantity)||0;
              if(qty !== curQty){
                if(qty > 0){ ops.push({ type:'update', id: existing._id, quantity: qty }); }
                else { ops.push({ type:'delete', id: existing._id }); }
              }
            } else {
              if(qty > 0){ ops.push({ type:'create', productId: p._id, quantity: qty }); }
            }

            let outQty = 0;
            if(isCompound){
              const oa = qs(`.supout-first[data-id="${p._id}"]`);
              const ob = qs(`.supout-second[data-id="${p._id}"]`);
              outQty = (Number(oa && oa.value || 0)*conv) + (Number(ob && ob.value || 0));
            } else {
              const os = qs(`.supout-simple[data-id="${p._id}"]`);
              outQty = Number(os && os.value || 0);
            }
            const prevOut = outExistingMap[p._id] ? Number(outExistingMap[p._id]) || 0 : 0;
            if(outQty !== prevOut){
              outItems.push({ productId: p._id, quantity: outQty });
            }
          });
          
          if(ops.length === 0 && outItems.length === 0) throw new Error('No changes');
          
          let ok = 0; let errs = [];
          for(const op of ops){
            try{
              if(op.type === 'update'){
                await api(`/api/my/stock-moves/${op.id}`, { method:'PUT', body: JSON.stringify({ quantity: op.quantity }) });
              } else if(op.type === 'delete'){
                await api(`/api/my/stock-moves/${op.id}`, { method:'DELETE' });
              } else if(op.type === 'create'){
                await api('/api/my/stock-in',{ method:'POST', body: JSON.stringify({ productId: op.productId, quantity: op.quantity, supplierId, createdAt: date }) });
              }
              ok++;
            }catch(e){ errs.push(e.message||'stock-in error'); }
          }

          if(outItems.length){
            try{
              await api('/api/my/stock-out-supplier', { method:'POST', body: JSON.stringify({ supplierId, items: outItems, createdAt: date }) });
              ok += outItems.length;
            }catch(e){ errs.push(e.message||'supplier out error'); }
          }
          
          if(errs.length){ alert(`Processed ${ok} items. Errors: \n${errs.join('\n')}`); } else { alert('Saved'); }
          
          qsa('.in-first').forEach(i => i.value = '');
          qsa('.in-second').forEach(i => i.value = '');
          qsa('.in-simple').forEach(i => i.value = '');
          qsa('.supout-first').forEach(i => i.value = '');
          qsa('.supout-second').forEach(i => i.value = '');
          qsa('.supout-simple').forEach(i => i.value = '');
          renderStockIn();
        } catch(e){ alert(e.message); }
        finally {
          if (btn) btn.disabled = false;
        }
      };
      
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', handler);
      
      if(editMove){
         newBtn.textContent = 'Update Transaction';
         newBtn.className = 'btn btn-warning w-100';
         // Add Cancel button
         let cancelBtn = qs('#stockInCancelBtn');
         if(!cancelBtn){
            cancelBtn = document.createElement('button');
            cancelBtn.id = 'stockInCancelBtn';
            cancelBtn.className = 'btn btn-secondary w-100 mt-2';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.onclick = () => renderStockIn();
            newBtn.parentNode.appendChild(cancelBtn);
         }
      } else {
         newBtn.textContent = 'Save Stock In';
         newBtn.className = 'btn btn-success w-100';
         const cancelBtn = qs('#stockInCancelBtn');
         if(cancelBtn) cancelBtn.remove();
      }
    }

    
  } catch (e) { console.error(e); }
}

async function renderStockWastage(){
  try {
    const products = await api('/api/my/products?_t=' + Date.now());
    // Fetch product stats for sorting
    try {
        const stats = await api('/api/my/product-stats');
        const statMap = {};
        stats.forEach(s => statMap[s._id] = s.movement);
        products.sort((a, b) => {
            const mA = statMap[a._id] || 0;
            const mB = statMap[b._id] || 0;
            return mB - mA;
        });
    } catch(e) { console.error('Failed to sort products', e); }
    const units = await api('/api/units');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    const inv = await api('/api/my/inventory');
    const invMap = {}; inv.forEach(i => invMap[i.productId] = Number(i.quantity) || 0);
    let dateInput = qs('#stockWastageDate');
    const noteInp = qs('#stockWastageNote');
    const tbody = qs('#stockWastageRows');
    const saveBtn = qs('#stockWastageSaveBtn');
    if(dateInput && !dateInput.value){ dateInput.value = new Date().toISOString().split('T')[0]; }
    if(tbody){
      tbody.innerHTML = '';
      const grouped = groupProducts(products);
      
      const createRow = (p, isGrouped) => {
        if(p.source === 'global' && !p.active) return null;
        const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
        const isCompound = u && String(u.type) === 'Compound';
        const first = isCompound ? (u.firstUnit && typeof u.firstUnit === 'object' ? u.firstUnit : (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])) : null;
        const second = isCompound ? (u.secondUnit && typeof u.secondUnit === 'object' ? u.secondUnit : (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])) : null;
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const qtyCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm qty-narrow wast-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm qty-narrow wast-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>`
          : `<input type="number" class="form-control form-control-sm qty-narrow wast-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        const tr = document.createElement('tr');
        
        const nameDisplay = isGrouped ? (p.variantName || 'Base') : p.nameEnglish;
        const nameClass = isGrouped ? '' : 'fw-bold small';
        const tdClass = isGrouped ? 'ps-4' : '';

        tr.innerHTML = `
          <td class="${tdClass}">
            <div class="${nameClass}">${nameDisplay}</div>
            <div class="text-muted small">Cur: <span class="badge ${ (invMap[p._id]||0) > 0 ? 'bg-success':'bg-secondary'}">${formatUnitQty(invMap[p._id]||0, p.unit, unitMap)}</span></div>
          </td>
          <td>${qtyCell}</td>
        `;
        return tr;
      };

      grouped.forEach(g => {
         if(g.hasVariants) {
             const trHeader = document.createElement('tr');
             trHeader.className = 'table-light fw-bold';
             trHeader.innerHTML = `<td colspan="2">${g.name}</td>`;
             tbody.appendChild(trHeader);
             
             g.items.forEach(p => {
                 const tr = createRow(p, true);
                 if(tr) tbody.appendChild(tr);
             });
         } else {
             const tr = createRow(g.items[0], false);
             if(tr) tbody.appendChild(tr);
         }
      });
      qsa('.wast-second').forEach(i => i.addEventListener('change', autoConvertSecondUnit));
    }
    if(saveBtn){
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.addEventListener('click', async () => {
        const date = dateInput ? dateInput.value : '';
        if(!date) { alert('Select date'); return; }
        const items = [];
        products.forEach(p => {
          const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
          const isCompound = u && String(u.type) === 'Compound';
          const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
          let qty = 0;
          if(isCompound){
            const a = qs(`.wast-first[data-id="${p._id}"]`);
            const b = qs(`.wast-second[data-id="${p._id}"]`);
            qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
          } else {
            const s = qs(`.wast-simple[data-id="${p._id}"]`);
            qty = Number(s && s.value || 0);
          }
          if(qty > 0) items.push({ productId: p._id, quantity: qty });
        });
        if(items.length === 0){ alert('No wastage quantities entered'); return; }
        const createdAt = new Date(date).toISOString();
        const note = noteInp ? noteInp.value : '';
        try {
          await api('/api/my/stock-wastage', { method:'POST', body: JSON.stringify({ items, createdAt, note }) });
          alert('Wastage recorded');
          qsa('.wast-first').forEach(i => i.value = '');
          qsa('.wast-second').forEach(i => i.value = '');
          qsa('.wast-simple').forEach(i => i.value = '');
          renderStockWastage();
        } catch(e){ alert(e.message); }
      });
    }
  } catch(e){ console.error(e); }
}

async function renderStockOut(initialState = null){
  try {
    const retailers = await api('/api/my/retailers');
    const products = await api('/api/my/products?_t=' + Date.now());

    // Fetch product stats for sorting
    try {
        const stats = await api('/api/my/product-stats');
        const statMap = {};
        stats.forEach(s => statMap[s._id] = s.movement);
        products.sort((a, b) => {
            const mA = statMap[a._id] || 0;
            const mB = statMap[b._id] || 0;
            return mB - mA;
        });
    } catch(e) { console.error('Failed to sort products', e); }

    const units = await api('/api/units');
    const inv = await api('/api/my/inventory');
    const distRates = await api('/api/my/rates');
    const unitMap = {}; units.forEach(u => unitMap[u._id] = u);
    const invMap = {}; inv.forEach(i => invMap[i.productId] = Number(i.quantity) || 0);
    const distRateMap = {}; distRates.forEach(r => distRateMap[r.productId] = Number(r.price)||0);

    let dateInput = qs('#stockOutDate');
    const rSel = qs('#stockOutRetailerSel');
    
    // Date Input is now in HTML, no need to inject
    
    if(dateInput && !dateInput.value) {
       dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    if(initialState && initialState.date && dateInput) dateInput.value = initialState.date;

    const balEl = qs('#stockOutCurBalance');
    const tbody = qs('#stockOutRows');
    const subtotalEl = qs('#stockOutSubtotal');
    const cashInp = qs('#stockOutCash');
    const onlineInp = qs('#stockOutOnline');
    const recvEl = qs('#stockOutReceivable');
    const curTotalEl = qs('#stockOutCurrentTotal');
    const saveBtn = qs('#stockOutSaveBtn');

    let rrMap = {};
    let dailyMovesMap = {};
    let dailyTxnsMap = {};
    let initialNet = 0;
    let lastCalculatedNet = 0;
    const dirtyProductIds = new Set();
    const dirtyPaymentTypes = new Set();

    const markProductDirty = (e) => {
        const id = e.target.getAttribute('data-id');
        if(id) dirtyProductIds.add(id);
    };

    const markPaymentDirty = (e) => {
        const type = e.target.getAttribute('data-type');
        if(type) dirtyPaymentTypes.add(type);
    };

    const updateBalance = () => {
      if(!balEl || !rSel) return 0;
      const r = retailers.find(x=>x._id === rSel.value);
      const currentDbBal = r ? (Number(r.currentBalance)||0) : 0;
      
      let base = 0;
      if (r && r.dayOpeningBalance !== undefined) {
          base = Number(r.dayOpeningBalance);
      } else {
          base = currentDbBal - initialNet;
      }
      
      balEl.textContent = '₹'+base.toFixed(2); 
      balEl.className = 'fw-bold ' + (base>0? 'text-danger':'text-success');
      
      if(curTotalEl) {
         curTotalEl.textContent = '₹' + currentDbBal.toFixed(2);
         curTotalEl.className = 'fw-bold fs-5 ' + (currentDbBal>0? 'text-danger':'text-success');
      }
      
      return base;
    };

    const fillRetailers = () => {
      const cur = (initialState && initialState.retailerId) ? initialState.retailerId : (rSel ? rSel.value : '');
      if(rSel){
        const sorted = [...retailers].sort((a,b) => {
            const aActive = a.active !== false;
            const bActive = b.active !== false;
            if(aActive && !bActive) return -1;
            if(!aActive && bActive) return 1;
            return (a.sortOrder||0) - (b.sortOrder||0) || a.name.localeCompare(b.name);
        });
        
        rSel.innerHTML = '<option value="">Select retailer</option>' + sorted.map(r=>{
             const isActive = r.active !== false;
             return `<option value="${r._id}" ${!isActive ? 'class="text-muted bg-light"' : ''}>${r.name}${!isActive?' (Inactive)':''}</option>`;
        }).join('');
        if(cur) rSel.value = cur;
        updateBalance();
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
    
    if(initialState && initialState.retailerId) await loadRetailerRates();

    const getPrice = (pid) => {
      const a = rrMap[pid];
      if(a !== undefined) return a;
      const b = distRateMap[pid];
      if(b !== undefined) return b;
      const p = products.find(x => x._id === pid);
      if(p && p.price !== undefined) return Number(p.price) || 0;
      return 0;
    };

    const computeTotalAndAmounts = () => {
      let subtotal = 0;
      products.forEach(p => {
        const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
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
          if(av>0 || bv>0){ brk = `${av||0} ${(u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])?(u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]).symbol:''} + ${bv||0} ${(u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])?(u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]).symbol:''} = ${qty}`; }
        } else {
          const s = qs(`.out-simple[data-id="${p._id}"]`);
          qty = Number(s && s.value || 0);
        }
        
        let amt = 0;
        if (isCompound && conv > 0) {
           amt = (price / conv) * qty;
        } else {
           amt = price * qty;
        }
        
        const amtEl = qs(`#amt-${p._id}`);
        const brkEl = qs(`#brk-${p._id}`);
        if(amtEl) amtEl.textContent = '₹' + amt.toFixed(2);
        if(brkEl) brkEl.textContent = brk;
        subtotal += amt;
      });
      if(subtotalEl) subtotalEl.textContent = '₹' + subtotal.toFixed(2);
      const cash = Number(cashInp && cashInp.value || 0);
      const online = Number(onlineInp && onlineInp.value || 0);
      
      const base = updateBalance(); // Get the static Last Balance
      
      // Receivable = Last Balance + Subtotal - Cash - Online
      const receivable = base + subtotal - cash - online;
      
      if(recvEl) recvEl.textContent = '₹' + receivable.toFixed(2);
      
      lastCalculatedNet = subtotal - cash - online;
    };

    const onInput = () => computeTotalAndAmounts();

    const renderRows = () => {
      if(!tbody) return;
      tbody.innerHTML = '';
      const grouped = groupProducts(products);
      
      const createRow = (p, isGrouped) => {
        if(p.source === 'global' && !p.active) return null;
        const stock = invMap[p._id] || 0;
        const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
        const isCompound = u && String(u.type) === 'Compound';
        const first = isCompound ? (u.firstUnit && typeof u.firstUnit === 'object' ? u.firstUnit : (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])) : null;
        const second = isCompound ? (u.secondUnit && typeof u.secondUnit === 'object' ? u.secondUnit : (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])) : null;
        const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
        const price = getPrice(p._id);
        
        const priceUnitSymbol = isCompound ? (first?first.symbol:'Base') : (u?u.symbol:'unit');

        const tr = document.createElement('tr');
        tr.id = `row-out-${p._id}`;
        const qtyCell = isCompound
          ? `<div class="input-group input-group-sm">
               <input type="number" class="form-control form-control-sm qty-narrow out-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
               <span class="input-group-text">+</span>
               <input type="number" class="form-control form-control-sm qty-narrow out-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
             </div>
             <div class="small text-muted sm-hide">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
          : `<input type="number" class="form-control form-control-sm qty-narrow out-simple" data-id="${p._id}" min="0" placeholder="Qty">`;

        const nameDisplay = isGrouped ? (p.variantName || 'Base') : p.nameEnglish;
        const nameClass = isGrouped ? '' : 'fw-bold';
        const tdClass = isGrouped ? 'ps-4' : '';

        tr.innerHTML = `
          <td class="${tdClass}">
            <div class="${nameClass}">${nameDisplay}</div>
            <div class="small text-muted sm-hide">₹${price.toFixed(2)} / ${priceUnitSymbol}</div>
          </td>
          <td>${qtyCell}</td>
          <td class="text-end">
            <div id="amt-${p._id}" class="fw-bold">₹0</div>
            <div id="brk-${p._id}" class="small text-muted sm-hide"></div>
          </td>
        `;
        return tr;
      };

      grouped.forEach(g => {
         if(g.hasVariants) {
             const trHeader = document.createElement('tr');
             trHeader.className = 'table-light fw-bold';
             trHeader.innerHTML = `<td colspan="3">${g.name}</td>`;
             tbody.appendChild(trHeader);
             
             g.items.forEach(p => {
                 const tr = createRow(p, true);
                 if(tr) tbody.appendChild(tr);
             });
         } else {
             const tr = createRow(g.items[0], false);
             if(tr) tbody.appendChild(tr);
         }
      });
      
      qsa('.out-first').forEach(i => {
        i.addEventListener('input', onInput);
        i.addEventListener('input', markProductDirty);
      });
      qsa('.out-second').forEach(i => {
         i.addEventListener('input', onInput);
         i.addEventListener('input', markProductDirty);
         i.addEventListener('change', autoConvertSecondUnit);
      });
      qsa('.out-simple').forEach(i => {
        i.addEventListener('input', onInput);
        i.addEventListener('input', markProductDirty);
      });
      if(cashInp) {
        cashInp.setAttribute('data-type', 'payment_cash');
        cashInp.addEventListener('input', onInput);
        cashInp.addEventListener('input', markPaymentDirty);
      }
      if(onlineInp) {
        onlineInp.setAttribute('data-type', 'payment_online');
        onlineInp.addEventListener('input', onInput);
        onlineInp.addEventListener('input', markPaymentDirty);
      }
    };
    renderRows();

    const loadDailyData = async (clearDirty = true) => {
        const d = dateInput ? dateInput.value : null;
        const rid = rSel ? rSel.value : null;
        
        initialNet = 0;
        lastCalculatedNet = 0;

        if (clearDirty) {
            dirtyProductIds.clear();
            dirtyPaymentTypes.clear();
        }

        // Reset
        qsa('.out-first, .out-second, .out-simple').forEach(i => i.value = '');
        if(cashInp) cashInp.value = '';
        if(onlineInp) onlineInp.value = '';
        dailyMovesMap = {};
        dailyTxnsMap = {};
        
        if(!d || !rid) { 
            computeTotalAndAmounts(); 
            initialNet = lastCalculatedNet;
            updateBalance();
            return; 
        }
        
        // Refresh Retailer Balance
        try {
             const balData = await api(`/api/my/retailers/${rid}/balance-at-date?date=${d}`);
             const idx = retailers.findIndex(x => x._id === rid);
             if(idx !== -1) {
                 retailers[idx].dayOpeningBalance = balData.openingBalance;
                 retailers[idx].currentBalance = balData.currentBalance;
             }
        } catch(e) { console.error('Failed to refresh retailer balance', e); }
        
        try {
            const from = new Date(d); from.setHours(0,0,0,0);
            const to = new Date(d); to.setHours(23,59,59,999);
            const rangeQuery = `from=${from.toISOString()}&to=${to.toISOString()}`;
            
            // Fetch Moves
            const moves = await api(`/api/my/stock-moves?type=OUT&retailerId=${rid}&${rangeQuery}`);
            
            // Aggregate Moves by Product
            const productMoves = {};
            moves.forEach(m => {
                if(!m.productId) return;
                const pid = m.productId._id || m.productId;
                if(!productMoves[pid]) productMoves[pid] = [];
                productMoves[pid].push(m);
            });

            for(const pid in productMoves){
                const list = productMoves[pid];
                const totalQty = list.reduce((sum, m) => sum + m.quantity, 0);
                
                // Store in dailyMovesMap as { _id, others, quantity }
                // Use the first move's ID as primary, others as secondary to delete on update
                dailyMovesMap[pid] = {
                    _id: list[0]._id,
                    others: list.slice(1).map(x=>x._id),
                    quantity: totalQty
                };

                const row = document.getElementById(`row-out-${pid}`);
                if(row){
                   // Use product info from the first move or from products list
                   const pInfo = list[0].productId;
                   const u = (pInfo && pInfo.unit) ? pInfo.unit : (products.find(x=>x._id===pid)||{}).unit;
                   
                   let unitObj = u;
                   if(typeof u === 'string') unitObj = unitMap[u];
                   const isCompound = unitObj && String(unitObj.type) === 'Compound';
                   const conv = isCompound ? Number(unitObj.conversionFactor)||0 : 0;
                   
                   if(isCompound && conv){
                       const major = Math.floor(totalQty / conv);
                       const minor = totalQty % conv;
                       const i1 = row.querySelector('.out-first');
                       const i2 = row.querySelector('.out-second');
                       if(i1) i1.value = major;
                       if(i2) i2.value = minor;
                   } else {
                       const i = row.querySelector('.out-simple');
                       if(i) i.value = totalQty;
                   }
                }
            }

            // Fetch Transactions
            const txns = await api(`/api/my/transactions?retailerId=${rid}&${rangeQuery}`);
            
            // Aggregate Payments
            const payCash = [];
            const payOnline = [];
            
            txns.forEach(t => {
               if(t.type === 'payment_cash') payCash.push(t);
               if(t.type === 'payment_online') payOnline.push(t);
            });
            
            if(payCash.length > 0){
                const total = payCash.reduce((sum, t) => sum + t.amount, 0);
                dailyTxnsMap['payment_cash'] = {
                    _id: payCash[0]._id,
                    others: payCash.slice(1).map(x=>x._id),
                    amount: total
                };
                if(cashInp) cashInp.value = total;
            }
            
            if(payOnline.length > 0){
                const total = payOnline.reduce((sum, t) => sum + t.amount, 0);
                dailyTxnsMap['payment_online'] = {
                    _id: payOnline[0]._id,
                    others: payOnline.slice(1).map(x=>x._id),
                    amount: total
                };
                if(onlineInp) onlineInp.value = total;
            }
            
            computeTotalAndAmounts();
            initialNet = lastCalculatedNet;
            updateBalance();
            computeTotalAndAmounts(); // Recalculate to ensure Receivable uses the correct Opening Balance
        } catch(e) { console.error('Error loading daily data', e); throw e; }
    };
    
    if(initialState && initialState.retailerId) {
        await loadDailyData();
    }

    if(rSel){
      rSel.onchange = async () => {
        initialNet = 0;
        lastCalculatedNet = 0;
        updateBalance();
        await loadRetailerRates();
        renderRows();
        await loadDailyData();
      };
    }
    if(dateInput){
        dateInput.onchange = async () => {
            await loadDailyData();
        };
    }

    if(saveBtn){
      const newBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newBtn, saveBtn);
      newBtn.textContent = 'Save / Update Daily Entry';
      newBtn.className = 'btn btn-primary w-100';
      
      // Remove Cancel Btn if exists (cleanup from previous logic)
      const cancelBtn = qs('#stockOutCancelBtn');
      if(cancelBtn) cancelBtn.remove();
      
      newBtn.addEventListener('click', async () => {
        const d = dateInput ? dateInput.value : null;
        const rid = rSel ? rSel.value : null;
        if(!d || !rid){ alert('Please select Date and Retailer'); return; }
        
        try {
             // 1. Capture current user inputs (because loadDailyData will reset DOM)
             const captured = {
                 moves: {},
                 cash: Number(cashInp && cashInp.value || 0),
                 online: Number(onlineInp && onlineInp.value || 0)
             };

             for(const p of products){
                 const row = qs(`#row-out-${p._id}`);
                 if(!row) continue;
                 
                 const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
                 const isCompound = u && String(u.type) === 'Compound';
                 const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
                 let qty = 0;
                 if(isCompound){
                     const a = row.querySelector('.out-first');
                     const b = row.querySelector('.out-second');
                     qty = (Number(a && a.value || 0)*conv) + (Number(b && b.value || 0));
                 } else {
                     const s = row.querySelector('.out-simple');
                     qty = Number(s && s.value || 0);
                 }
                 captured.moves[p._id] = qty;
             }

             // 2. Re-read daily data to ensure IDs are fresh (prevents duplicate payments)
             try {
                 await loadDailyData(false);
             } catch(e) {
                 alert('Failed to refresh data. Please check connection and try again.');
                 return;
             }

             let ok = 0;
             const newItems = [];
             
             // 3. Compare Captured Input vs Loaded Data
             // Moves
             for(const p of products){
                 // Note: we use captured.moves instead of querying DOM again
                 // Only use captured value if the field was dirty (user modified it)
                 // Otherwise, preserve the existing server value
                 let qty = 0;
                 if(dirtyProductIds.has(p._id)){
                    qty = captured.moves[p._id] !== undefined ? captured.moves[p._id] : 0;
                 } else {
                    const existing = dailyMovesMap[p._id];
                    qty = existing ? existing.quantity : 0;
                 }
                 
                 const existing = dailyMovesMap[p._id];
                 if(existing){
                     if(qty !== existing.quantity){
                         if(qty === 0) {
                             // Delete primary
                             try {
                                await api(`/api/my/stock-moves/${existing._id}`, { method: 'DELETE' });
                             } catch(e) {
                                if(!e.message.includes('404') && !e.message.includes('not found')) throw e;
                             }
                         } else {
                             // Update primary
                             try {
                                const createdAt = new Date(d).toISOString();
                                await api(`/api/my/stock-moves/${existing._id}`, { method: 'PUT', body: JSON.stringify({ quantity: qty, date: createdAt }) });
                             } catch(e) {
                                if(e.message.includes('404') || e.message.includes('not found')){
                                    newItems.push({ productId: p._id, quantity: qty });
                                } else {
                                    throw e;
                                }
                             }
                         }
                         
                         // Delete others if any (consolidate)
                         if(existing.others && existing.others.length > 0){
                             for(const oid of existing.others){
                                 try {
                                    await api(`/api/my/stock-moves/${oid}`, { method: 'DELETE' });
                                 } catch(e) {
                                    if(!e.message.includes('404') && !e.message.includes('not found')) throw e;
                                 }
                             }
                         }
                         ok++;
                     }
                 } else {
                     if(qty > 0){
                         newItems.push({ productId: p._id, quantity: qty });
                     }
                 }
             }
             
             if(newItems.length > 0){
                 const createdAt = new Date(d).toISOString();
                 await api('/api/my/stock-out', { method: 'POST', body: JSON.stringify({ retailerId: rid, items: newItems, createdAt }) });
                 ok += newItems.length;
             }
             
             // Payments
             const processPay = async (type, val, mapKey) => {
                 // val is passed directly from captured state, but we only use it if dirty
                 const isDirty = dirtyPaymentTypes.has(mapKey);
                 const existing = dailyTxnsMap[mapKey];
                 
                 console.log(`processPay: type=${type}, val=${val}, isDirty=${isDirty}, date=${d}`);

                 if(!isDirty && existing){
                     // If not dirty and exists, force val to match existing so no change is detected
                     val = existing.amount;
                 } else if(!isDirty && !existing) {
                     val = 0;
                 }

                 if(existing){
                     if(val !== existing.amount){
                         if(val === 0) {
                             try {
                                await api(`/api/my/transactions/${existing._id}`, { method: 'DELETE' });
                             } catch(e) {
                                if(!e.message.includes('404') && !e.message.includes('not found')) throw e;
                             }
                         } else {
                             try {
                                const createdAt = new Date(d).toISOString();
                                await api(`/api/my/transactions/${existing._id}`, { method: 'PUT', body: JSON.stringify({ amount: val, date: createdAt }) });
                             } catch(e) {
                                if(e.message.includes('404') || e.message.includes('not found')){
                                    const createdAt = new Date(d).toISOString();
                                    await api('/api/my/transactions', { method: 'POST', body: JSON.stringify({ retailerId: rid, type, amount: val, createdAt }) });
                                } else {
                                    throw e;
                                }
                             }
                         }
                         
                         if(existing.others && existing.others.length > 0){
                             for(const oid of existing.others){
                                 try {
                                    await api(`/api/my/transactions/${oid}`, { method: 'DELETE' });
                                 } catch(e) {
                                    if(!e.message.includes('404') && !e.message.includes('not found')) throw e;
                                 }
                             }
                         }
                         ok++;
                     }
                 } else {
                     if(val > 0){
                         const createdAt = new Date(d).toISOString();
                         await api('/api/my/transactions', { method: 'POST', body: JSON.stringify({ retailerId: rid, type, amount: val, createdAt }) });
                         ok++;
                     }
                 }
             };
             
             await processPay('payment_cash', captured.cash, 'payment_cash');
             await processPay('payment_online', captured.online, 'payment_online');
             
            // Recompute the consolidated Order and Transaction for the day
            await api('/api/my/recompute-order', { method: 'POST', body: JSON.stringify({ retailerId: rid, date: d }) });
            if(ok > 0) alert(`Saved/Updated ${ok} items.`);
            else alert('No changes detected.');
            
            await loadDailyData();
        } catch(e){ alert(e.message); }
      });
    }

  } catch(e){ 
    console.error(e); 
    alert('Stock Out Page Error: ' + e.message);
  }
}

async function loadRetailer(){
  await checkRoleAndRedirect('retailer');
  bindLogout();
  const tabs = ['order','history','profile'];
  const switchTab = (id) => {
    qsa('.tab-pane').forEach(el => {
      el.classList.remove('show','active');
      if(el.id === id) el.classList.add('show','active');
    });
    qsa('.nav-link').forEach(el => el.classList.remove('active'));
    const navBtn = qs(`button[data-bs-target="#${id}"]`);
    if(navBtn) navBtn.classList.add('active');
    if(id==='tab-order') { renderRetailerProducts(); }
    if(id==='tab-history') { loadRetailerTransactions(); }
    if(id==='tab-profile') { renderRetailerProfile(); }
  };
  window.switchTab = switchTab;
  renderRetailerProducts();
  loadRetailerTransactions();
  
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
      const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
      const isCompound = u && String(u.type) === 'Compound';
      const first = isCompound ? (u.firstUnit && typeof u.firstUnit === 'object' ? u.firstUnit : (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit])) : null;
      const second = isCompound ? (u.secondUnit && typeof u.secondUnit === 'object' ? u.secondUnit : (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit])) : null;
      const conv = isCompound ? Number(u.conversionFactor)||0 : 0;
      
      const qtyCell = isCompound
        ? `<div class="input-group input-group-sm">
             <input type="number" class="form-control form-control-sm r-first" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${first?first.symbol:'Base'}">
             <span class="input-group-text">+</span>
             <input type="number" class="form-control form-control-sm r-second" data-id="${p._id}" data-conv="${conv}" min="0" placeholder="${second?second.symbol:'Unit'}">
           </div>
           <div class="small text-muted">${first?first.symbol:''} × ${conv} = ${second?second.symbol:''}</div>`
        : `<input type="number" class="form-control form-control-sm r-simple" data-id="${p._id}" min="0" placeholder="Qty">`;
        
      // Price Display Unit
      const priceUnitSymbol = isCompound ? (first?first.symbol:'Base') : (u?u.symbol:'unit');
        
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="fw-bold">${p.nameEnglish}</div>
          <div class="small text-muted">${p.nameHindi||''}</div>
        </td>
        <td class="text-center">
          <span class="badge ${p.stock>0?'bg-success':'bg-secondary'}">${p.stock}</span>
        </td>
        <td class="text-end">₹${p.price} / ${priceUnitSymbol}</td>
        <td>${qtyCell}</td>
      `;
      tbody.appendChild(tr);
    });
    
    const updateEst = () => {
      let total = 0;
      products.forEach(p => {
        const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
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
        
        if (isCompound && conv > 0) {
           total += qty * (p.price / conv);
        } else {
           total += qty * p.price;
        }
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
      const u = p.unit ? (typeof p.unit === 'object' ? p.unit : unitMap[p.unit]) : null;
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
    loadRetailerTransactions();
    qs('#orderTotal').textContent = '₹0';
  } catch(e){ alert(e.message); }
}

async function loadRetailerTransactions(){
  const list = qs('#orderHistoryList');
  if(!list) return;
  
  const type = qs('#txFilterType') ? qs('#txFilterType').value : '';
  const from = qs('#txFilterFrom') ? qs('#txFilterFrom').value : '';
  const to = qs('#txFilterTo') ? qs('#txFilterTo').value : '';

  try {
    let url = '/api/retailer/transactions';
    const params = [];
    if(type) params.push(`type=${encodeURIComponent(type)}`);
    if(from) params.push(`from=${encodeURIComponent(from)}`);
    if(to) params.push(`to=${encodeURIComponent(to)}`);
    if(params.length) url += '?' + params.join('&');

    const txs = await api(url);
    list.innerHTML = '';
    if(txs.length === 0){ list.innerHTML = '<div class="text-muted p-3">No transactions found</div>'; return; }
    
    txs.forEach(t => {
      const date = new Date(t.createdAt).toLocaleString();
      const div = document.createElement('div');
      div.className = 'card p-3 mb-2';
      
      let content = '';
      if(t.type === 'order' && t.items){
          let itemsHtml = '<ul class="mb-0 ps-3 small">';
          t.items.forEach(i => {
             const p = i.productId;
             let name = p ? p.nameEnglish : '?';
             let qtyStr = i.quantity;
    
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
          content = `<div class="mt-2">${itemsHtml}</div>`;
      } else {
          content = `<div class="mt-2 text-muted fst-italic">${t.type} - ${t.note || ''}</div>`;
      }
      
      let badgeClass = 'bg-secondary';
      if(t.type === 'order') badgeClass = 'bg-primary';
      else if(t.type.startsWith('payment')) badgeClass = 'bg-success';
      else if(t.type === 'adjustment') badgeClass = 'bg-warning text-dark';

      div.innerHTML = `
        <div class="d-flex justify-content-between">
           <div class="fw-bold">#${t._id.substr(-6)}</div>
           <div class="badge ${badgeClass} text-uppercase">${t.type}</div>
        </div>
        <div class="small text-muted">${date}</div>
        ${content}
        <div class="mt-2 fw-bold text-end">Amount: ₹${t.amount.toFixed(2)}</div>
      `;
      list.appendChild(div);
    });
  } catch(e){ console.error(e); }
}

function loadRetailers(){
  const list = qs('#retList');
  if(!list) return;
  const perms = (ROLE === 'staff' && Array.isArray(window.PERM)) ? window.PERM : [];
  api('/api/my/retailers').then(retailers => {
    list.innerHTML = '';
    retailers.forEach(r => {
      const div = document.createElement('li');
      div.className = 'list-group-item d-flex justify-content-between align-items-center';
      const isActive = r.active !== false;
      const canPay = ROLE !== 'staff' || perms.includes('payment_cash') || perms.includes('payment_online');
      const canEdit = ROLE !== 'staff' || perms.includes('add_retailer');
      const payBtnHtml = canPay ? `<button class="btn btn-sm btn-outline-primary" onclick="preparePayment('${r._id}', '${r.name}', ${r.currentBalance||0})" data-bs-toggle="modal" data-bs-target="#paymentModal" title="Payment"><i class="bi bi-currency-rupee"></i></button>` : '';
      const adjBtnHtml = canPay ? `<button class="btn btn-sm btn-outline-warning" onclick="prepareAdjustment('${r._id}', '${r.name}', ${r.currentBalance||0})" data-bs-toggle="modal" data-bs-target="#adjustmentModal" title="Adjustment"><i class="bi bi-sliders"></i></button>` : '';
      const editBtnHtml = canEdit ? `<button class="btn btn-sm btn-outline-secondary" data-act="edit" data-id="${r._id}" title="Edit"><i class="bi bi-pencil"></i></button>` : '';
      
      div.innerHTML = `
        <div>
          <div class="fw-bold ${isActive ? '' : 'text-decoration-line-through text-muted'}">${r.name} ${isActive ? '' : '<span class="badge bg-danger">Inactive</span>'}</div>
          <div class="small text-muted">${r.phone || ''}</div>
          <div class="small">${r.address || ''}</div>
        </div>
        <div class="d-flex flex-column align-items-end gap-1">
          <div class="fw-bold ${r.currentBalance > 0 ? 'text-danger' : 'text-success'}">₹${(r.currentBalance||0).toFixed(2)}</div>
          <div class="d-flex gap-1 align-items-center">
             ${ROLE === 'distributor' ? `
             <div class="form-check form-switch me-2" title="Active/Inactive">
                <input class="form-check-input" type="checkbox" ${isActive ? 'checked' : ''} data-act="toggle-active" data-id="${r._id}">
             </div>` : ''}
             <button class="btn btn-sm btn-outline-info" data-act="ledger" data-id="${r._id}" title="Ledger"><i class="bi bi-journal-text"></i></button>
             ${editBtnHtml}
             ${adjBtnHtml}
             ${payBtnHtml}
          </div>
        </div>
      `;
      list.appendChild(div);
    });
    
    list.onclick = async (ev)=>{
      const t = ev.target;
      
      // Handle Toggle Switch
      if(t.classList.contains('form-check-input') && t.dataset.act === 'toggle-active'){
          const id = t.dataset.id;
          const newState = t.checked;
          try {
              await api(`/api/my/retailers/${id}/status`, {
                  method: 'PATCH',
                  body: JSON.stringify({ active: newState })
              });
              loadRetailers(); // Reload to update UI
          } catch(e) {
              t.checked = !newState; // Revert
              alert('Failed to update status: ' + e.message);
          }
          return;
      }

      const btn = t.closest('button');
      if(!btn) return;
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      if(!id||!act) return;
      
      if(act==='ledger'){
        const item = retailers.find((x)=>x._id===id);
        if(item) renderLedgerModal(item, btn);
      }
      if(act==='edit'){
        const item = retailers.find((x)=>x._id===id);
        if(item) openEditRetailerModal(item);
      }
    };
  });
}

function openEditRetailerModal(r){
  qs('#editRetId').value = r._id;
  qs('#editRetName').value = r.name;
  qs('#editRetPhone').value = r.phone || '';
  qs('#editRetAddress').value = r.address || '';
  qs('#editRetSortOrder').value = r.sortOrder || 0;
  
  const m = new bootstrap.Modal(document.getElementById('editRetailerModal'));
  m.show();
}

function bindRetailerEdit(){
  const btn = qs('#editRetSave');
  if(btn){
     btn.onclick = async () => {
        const id = qs('#editRetId').value;
        const name = qs('#editRetName').value;
        const phone = qs('#editRetPhone').value;
        const address = qs('#editRetAddress').value;
        const sortOrder = qs('#editRetSortOrder').value;
        
        if(!id || !name) return;
        
        try {
           await api(`/api/my/retailers/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ name, phone, address, sortOrder: Number(sortOrder)||0 })
           });
           
           // Hide modal
           const el = document.getElementById('editRetailerModal');
           const m = bootstrap.Modal.getInstance(el);
           if(m) m.hide();
           
           loadRetailers();
        } catch(e){
           alert(e.message || 'Failed to update retailer');
        }
     };
  }
}

function bindRetailerAdd() {
  const btn = qs('#retSave');
  if(btn) {
    btn.onclick = async () => {
       const name = qs('#retName').value;
       const phone = qs('#retPhone').value;
       const address = qs('#retAddress').value;
       const openingBalance = qs('#retBalance').value;
       const sortOrder = qs('#retSortOrder').value;
       
       if(!name) { alert('Name is required'); return; }
       
       try {
           await api('/api/my/retailers', {
               method: 'POST',
               body: JSON.stringify({ name, phone, address, openingBalance: Number(openingBalance)||0, sortOrder: Number(sortOrder)||0 })
           });
           
           qs('#retName').value = '';
           qs('#retPhone').value = '';
           qs('#retAddress').value = '';
           qs('#retBalance').value = '';
           qs('#retSortOrder').value = '';
           
           // Dismiss modal manually if needed, or rely on data-bs-dismiss.
           // Since the button has data-bs-dismiss, it closes automatically.
           // We just refresh the list.
           loadRetailers();
       } catch(e) {
           alert(e.message || 'Failed to add retailer');
       }
    };
  }
}

function bindPaymentActions(){
  const btn = qs('#paySave');
  if(btn){
     btn.onclick = submitPayment;
  }
}

async function preparePayment(id, name, currentBalance){
  qs('#payRetailerName').textContent = name;
  qs('#payRetailerId').value = id;
  const amtInp = qs('#payAmount');
  if(amtInp) amtInp.value = '';
  qs('#payNote').value = '';
  
  const balEl = qs('#payCurrentBalance');
  if(balEl) {
     const bal = Number(currentBalance)||0;
     balEl.dataset.originalBalance = bal;
     balEl.textContent = '₹ ' + bal.toFixed(2);
     balEl.className = 'fw-bold ' + (bal>0 ? 'text-danger' : 'text-success');
     
     if(amtInp){
         amtInp.oninput = () => {
             const orig = Number(balEl.dataset.originalBalance)||0;
             const pay = Number(amtInp.value)||0;
             const newBal = orig - pay;
             balEl.innerHTML = `<span class="text-decoration-line-through text-muted">₹${orig.toFixed(2)}</span> <i class="bi bi-arrow-right"></i> <span class="${newBal>0?'text-danger':'text-success'}">₹${newBal.toFixed(2)}</span>`;
         };
     }
  }
  
  const typeSel = qs('#payType');
  const saveBtn = qs('#paySave');
  if(typeSel){
    const perms = (ROLE === 'staff' && Array.isArray(window.PERM)) ? window.PERM : [];
    const allowCash = ROLE !== 'staff' || perms.includes('payment_cash');
    const allowOnline = ROLE !== 'staff' || perms.includes('payment_online');
    let html = '';
    if(allowCash) html += '<option value="payment_cash">Cash</option>';
    if(allowOnline) html += '<option value="payment_online">Online</option>';
    typeSel.innerHTML = html;
    if(saveBtn) saveBtn.disabled = (!allowCash && !allowOnline);
  }
}

async function submitPayment(){
  try {
    const retailerId = qs('#payRetailerId').value;
    const amount = Number(qs('#payAmount').value);
    const type = qs('#payType').value; // cash or online
    const note = qs('#payNote').value;
    
    if(!amount || amount <= 0) throw new Error('Invalid amount');
    if(ROLE === 'staff'){
      const perms = Array.isArray(window.PERM) ? window.PERM : [];
      if(!perms.includes(type)) throw new Error('Not permitted for selected payment type');
    }
    
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

    let products = [];
    if(ROLE === 'admin') products = await api('/api/products');
    else products = await api('/api/my/products?_t=' + Date.now());

    if(prodSel){ prodSel.innerHTML = '<option value="">All Products</option>' + products.map(p=>`<option value="${p._id}">${p.nameEnglish}</option>`).join(''); }

    if(ROLE === 'admin'){
      const distributors = await api('/api/users?role=distributor');
      const retailers = await api('/api/users?role=retailer');
      const distSel = qs('#repDistributorSel');
      if(distSel){ 
         distSel.innerHTML = '<option value="">All Distributors</option>' + distributors.map(d=>`<option value="${d._id}">${d.name}</option>`).join(''); 
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
      
      // Clear previous report to prevent confusion
      if(qs('#repRows')) qs('#repRows').innerHTML = '';
      if(qs('#repCount')) qs('#repCount').textContent = '0';
      if(qs('#repThead')) qs('#repThead').innerHTML = '';

      // Hide all first
      hide(qs('#repTypeDiv'));
      hide(qs('#repStaffDiv'));
      hide(qs('#repProductDiv'));
      hide(qs('#repRetailerDiv'));
      hide(qs('#repSupplierDiv'));
      hide(qs('#repActionDiv'));
      
      if(!cat) return;

      show(qs('#repActionDiv'));

      if(cat === 'stock'){
          show(qs('#repTypeDiv'));
          // hide(qs('#repStaffDiv'));
          show(qs('#repProductDiv'));
          show(qs('#repRetailerDiv'));
          typeSel.innerHTML = '<option value="">All</option><option value="IN">IN</option><option value="OUT">OUT</option>';
      } else if(cat === 'product_wise'){
          show(qs('#repProductDiv'));
          // Product wise doesn't need Type (always agg), Retailer (maybe agg?)
          // Let's allow Retailer filter if needed, but usually it's global. 
          // User asked for "consolidated report", likely global. But filtering by retailer is a nice plus.
          // Let's keep Retailer filter available.
          show(qs('#repRetailerDiv')); 
      } else if(cat === 'financial'){
          show(qs('#repTypeDiv'));
          show(qs('#repRetailerDiv'));
          typeSel.innerHTML = '<option value="">All Payments</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
      } else if(cat === 'retailer_ledger'){
          show(qs('#repRetailerDiv'));
          // hide type for ledger? usually we want to see all. But optional is fine.
          show(qs('#repTypeDiv'));
          typeSel.innerHTML = '<option value="">All</option><option value="order">Order</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
      } else if(cat === 'supplier_ledger'){
          show(qs('#repSupplierDiv'));
          show(qs('#repTypeDiv'));
          typeSel.innerHTML = '<option value="">All</option><option value="bill">Bill</option><option value="payment_cash">Cash</option><option value="payment_online">Online</option>';
      }
    };
    updateReportFilters();

    if(catSel) catSel.onchange = updateReportFilters;


    
    const genBtn = qs('#repGenerateBtn');
    if(genBtn) genBtn.onclick = renderReport;

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
    // renderReport(); // Initial load disabled
  }catch(e){ console.error(e); }
}

async function renderReport(){
  try{
    const cat = qs('#repCategory') ? qs('#repCategory').value : '';
    if(!cat) { 
       const tbody = qs('#repRows');
       if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted fs-5">Please select a report type above to view data</td></tr>';
       return; 
    }
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
    params.push(`_t=${Date.now()}`);
    if(staffId) params.push(`staffId=${encodeURIComponent(staffId)}`);
    if(from) params.push(`from=${encodeURIComponent(from)}`);
    if(to) params.push(`to=${encodeURIComponent(to)}`);
    if(cat === 'stock'){
      url = '/api/my/stock-moves';
      if(productId) params.push(`productId=${encodeURIComponent(productId)}`);
      if(retailerId) params.push(`retailerId=${encodeURIComponent(retailerId)}`);
      if(type) params.push(`type=${encodeURIComponent(type)}`);
    } else if(cat === 'product_wise'){
      url = '/api/my/stock-moves';
      if(productId) params.push(`productId=${encodeURIComponent(productId)}`);
      if(retailerId) params.push(`retailerId=${encodeURIComponent(retailerId)}`);
    } else if(cat === 'financial'){
      url = '/api/my/transactions';
      if(retailerId) params.push(`retailerId=${encodeURIComponent(retailerId)}`);
    } else if(cat === 'retailer_ledger'){
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
    
    // Fetch Staff for mapping
    let staffMap = {};
    try {
        const staffList = await api('/api/my/staff');
        staffList.forEach(s => staffMap[s._id] = s.name);
    } catch(e){}

    let products = [];
    if(ROLE === 'admin') products = await api('/api/products');
    else products = await api('/api/my/products?_t=' + Date.now());

    const pMap = {}; products.forEach(p=>pMap[p._id]=p.nameEnglish);
    const rMap = {};
    const rBalMap = {};
    const rSortMap = {};
    let selectedRetailer = null;
    try{ 
      let retailers = [];
      if(ROLE==='admin') retailers = await api('/api/users?role=retailer');
      else retailers = await api('/api/my/retailers');
      retailers.forEach(r=>{
        rMap[r._id]=r.name;
        rBalMap[r._id] = Number(r.currentBalance)||0;
        rSortMap[r._id] = Number(r.sortOrder)||0;
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
      header = ['Date','Type','Product','Party / Note','Qty'];
      if(thead) thead.innerHTML = '<tr><th>Date</th><th>T</th><th>Prod</th><th>Party / Note</th><th class="text-end">Qty</th></tr>';
      let totalStockQty = 0;
      let totalIn = 0;
      let totalOut = 0;

      if(tbody){ tbody.innerHTML=''; items.forEach(m=>{
        const date = new Date(m.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        const pObj = (typeof m.productId === 'object') ? m.productId : null;
        const pId = pObj ? pObj._id : m.productId;
        const prod = pObj ? (pObj.nameEnglish || pObj.nameHindi || '?') : (pMap[pId] || pId || '-');
        
        let party = '-';
        if (m.retailerId) {
            const retObj = m.retailerId || {};
            party = retObj.name || (typeof m.retailerId === 'string' ? (rMap[m.retailerId] || m.retailerId) : '-');
        } else if (m.supplierId) {
            const sObj = m.supplierId || {};
            const sName = sObj.name || (typeof m.supplierId === 'string' ? (sMap[m.supplierId] || m.supplierId) : 'Supplier');
            party = `${sName} (Supplier)`;
        } else if (String(m.note).toUpperCase().includes('WASTAGE')) {
            party = '<span class="text-danger">Wastage</span>';
        } else {
            party = m.note || '-';
        }
        
        const qty = Number(m.quantity)||0;
        
        let qtyDisplay = qty;
        if(pObj && pObj.unit && String(pObj.unit.type).trim().toLowerCase() === 'compound' && pObj.unit.conversionFactor){
           const conv = Number(pObj.unit.conversionFactor);
           if(conv > 0) {
             const first = Math.trunc(qty / conv);
             const second = qty % conv;
             const s1 = (pObj.unit.firstUnit && pObj.unit.firstUnit.symbol) ? pObj.unit.firstUnit.symbol : 'Box';
             const s2 = (pObj.unit.secondUnit && pObj.unit.secondUnit.symbol) ? pObj.unit.secondUnit.symbol : 'Pouch';
             
             if(first > 0 && second > 0) qtyDisplay = `${first} ${s1} + ${second} ${s2}`;
             else if(first > 0) qtyDisplay = `${first} ${s1}`;
             else qtyDisplay = `${second} ${s2}`;
           }
        }

        const rowText = `${ds} ${m.type} ${prod} ${party.replace(/<[^>]*>/g,'')} ${qtyDisplay}`.toLowerCase();
        if(search && !rowText.includes(search)) return;
        
        totalStockQty += qty;
        if(m.type === 'IN') totalIn += qty;
        else totalOut += qty;

        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${ds}</td><td><span class="badge ${m.type==='IN'?'bg-success':'bg-primary'}">${m.type}</span></td><td><a href="#" onclick="showProductDetails('${pId}'); return false;">${prod}</a></td><td>${party}</td><td class="text-end">${qtyDisplay}</td>`;
        tbody.appendChild(tr);
        data.push([ds,m.type,prod,party.replace(/<[^>]*>/g,''),qtyDisplay]);
      }); 
      
      if(data.length > 0) {
          const tr = document.createElement('tr');
          tr.className = 'table-light fw-bold';
          tr.innerHTML = `<td colspan="4">Total: IN ${totalIn} | OUT ${totalOut} (Net: ${totalIn - totalOut})</td><td class="text-end">${totalStockQty} (Activity)</td>`;
          tbody.appendChild(tr);
      }
      }
    } else if(cat === 'product_wise'){
      header = ['Product', 'OP', 'Total IN', 'Total OUT', 'Net Change', 'Closing'];
      if(thead) thead.innerHTML = '<tr><th>Product</th><th class="text-end">OP</th><th class="text-end">Total IN</th><th class="text-end">Total OUT</th><th class="text-end">Net Change</th><th class="text-end">Closing</th></tr>';

      const agg = {};
      // Clear breakdown data
      window.REP_OUT_BREAKDOWN = {};

      items.forEach(m => {
         const pObj = (typeof m.productId === 'object') ? m.productId : null;
         const pId = pObj ? pObj._id : m.productId;
         if(!agg[pId]) agg[pId] = { in:0, out:0, obj: pObj, id: pId };
         const qty = Number(m.quantity)||0;
         if(m.type === 'IN') agg[pId].in += qty;
         else if(m.type === 'OUT') {
             agg[pId].out += qty;
             
             // Track breakdown
             if(!window.REP_OUT_BREAKDOWN[pId]) window.REP_OUT_BREAKDOWN[pId] = {};
             
             // Save unit info for popup
             if(pObj && pObj.unit && !window.REP_OUT_BREAKDOWN[pId]._unit) {
                 window.REP_OUT_BREAKDOWN[pId]._unit = pObj.unit;
             }

             // Group OUT by retailer, supplier-out, and wastage
             let grpId = 'unknown';
             let grpName = 'Unknown Retailer';
             if (m.retailerId) {
                 const retObj = m.retailerId || {};
                 grpId = retObj._id || m.retailerId;
                 grpName = retObj.name || (rMap[grpId] || 'Unknown Retailer');
             } else if (m.supplierId) {
                 const sObj = m.supplierId || {};
                 const sid = sObj._id || m.supplierId;
                 grpId = `supplier:${sid}`;
                 grpName = sObj.name || sMap[sid] || 'Out to Supplier';
             } else {
                 grpId = 'wastage';
                 grpName = 'Wastage';
             }
             
             if(!window.REP_OUT_BREAKDOWN[pId][grpId]) window.REP_OUT_BREAKDOWN[pId][grpId] = { name: grpName, qty: 0 };
             window.REP_OUT_BREAKDOWN[pId][grpId].qty += qty;
         }
      });

      // Compute Opening stock per product if from-date provided
      const openingMap = {};
      if(from){
        let preTo = '';
        try {
          if(String(from).length === 10){
            const f = new Date(from);
            // Match backend's IST start logic (00:00 - 330m)
            f.setMinutes(f.getMinutes() - 330);
            // Subtract 1ms to strictly precede the main query's start time
            f.setMilliseconds(f.getMilliseconds() - 1);
            preTo = f.toISOString();
          } else {
            const f = new Date(from);
            const prev = new Date(f.getTime() - 1);
            preTo = prev.toISOString();
          }
        } catch {}
        const preParams = [];
        if(preTo) preParams.push(`to=${encodeURIComponent(preTo)}`);
        if(productId) preParams.push(`productId=${encodeURIComponent(productId)}`);
        if(retailerId) preParams.push(`retailerId=${encodeURIComponent(retailerId)}`);
        const preUrl = preParams.length ? `/api/my/stock-moves?${preParams.join('&')}` : '/api/my/stock-moves';
        try {
          const preItems = await api(preUrl);
          preItems.forEach(m => {
            const pObj = (typeof m.productId === 'object') ? m.productId : null;
            const pid = pObj ? pObj._id : m.productId;
            const qty = Number(m.quantity)||0;
            const delta = m.type === 'IN' ? qty : -qty;
            openingMap[pid] = (openingMap[pid]||0) + delta;
          });
        } catch(e){ console.error('Failed to load opening stock', e); }
      }

      let totalOp = 0;
      let totalIn = 0;
      let totalOut = 0;
      let totalNet = 0;
      let totalClosing = 0;

      if(tbody){ tbody.innerHTML=''; 
      
      // Prepare items for grouping
      const reportItems = [];
      const orphanItems = [];
      
      Object.values(agg).forEach(item => {
            if(item.obj) {
                const p = { ...item.obj };
                p._stats = item;
                reportItems.push(p);
            } else {
                orphanItems.push(item);
            }
        });

        if(reportItems.length > 0) {
            console.log('DEBUG: First report item:', reportItems[0]);
            console.log('DEBUG: Item baseName:', reportItems[0].baseName);
        }

        const groups = groupProducts(reportItems);

      // Calculate group totals for sorting
      groups.forEach(g => {
          g.totalMove = g.items.reduce((sum, p) => {
              const s = p._stats;
              return sum + (s.in||0) + (s.out||0);
          }, 0);
      });

      // Sort groups by total movement Descending
      groups.sort((a, b) => b.totalMove - a.totalMove);
      console.log('Report Groups:', groups); // DEBUG LOG

      const renderRow = (item, isGrouped) => {
          const stats = item._stats || item; 
          const pObj = stats.obj || item;
          const pId = stats.id;
          
          const prodName = isGrouped 
              ? (pObj.variantName || 'Base') 
              : (pObj ? (pObj.nameEnglish || pObj.nameHindi || '?') : (pMap[pId] || pId || '-'));

          const fmt = (q) => {
              if(pObj && pObj.unit) return formatUnitQty(q, pObj.unit);
              return q;
          };

          const op = Number(openingMap[pId]||0);
          const net = stats.in - stats.out;
          const closing = op + net;

          const opStr = fmt(op);
          const inStr = fmt(stats.in);
          const outStr = fmt(stats.out);
          const netStr = fmt(net);
          const closingStr = fmt(closing);

          totalOp += op;
          totalIn += stats.in;
          totalOut += stats.out;
          totalNet += net;
          totalClosing += closing;

          const tr = document.createElement('tr');
          // Indent if grouped
          const nameContent = isGrouped 
              ? `<span class="ps-4">${prodName}</span>` 
              : `<a href="#" onclick="showProductDetails('${pId}'); return false;">${prodName}</a>`;

          tr.innerHTML = `
            <td>${nameContent}</td>
            <td class="text-end">${opStr}</td>
            <td class="text-end text-success">${inStr}</td>
            <td class="text-end text-primary"><a href="#" onclick="showOutBreakdown('${pId}'); return false;" class="text-decoration-none">${outStr}</a></td>
            <td class="text-end fw-bold">${netStr}</td>
            <td class="text-end">${closingStr}</td>
          `;
          tbody.appendChild(tr);
          data.push([prodName, opStr, inStr, outStr, netStr, closingStr]);
      };

      // Helper to check visibility
      const isVisible = (item) => {
          if(!search) return true;
          const stats = item._stats || item;
          const pObj = stats.obj;
          const pId = stats.id;
          
          const prodName = pObj ? (pObj.nameEnglish || pObj.nameHindi || '?') : (pMap[pId] || pId || '-');
          const fmt = (q) => (pObj && pObj.unit) ? formatUnitQty(q, pObj.unit) : q;
          
          const op = Number(openingMap[pId]||0);
          const net = stats.in - stats.out;
          const closing = op + net;
          
          const rowText = `${prodName} ${fmt(op)} ${fmt(stats.in)} ${fmt(stats.out)} ${fmt(net)} ${fmt(closing)}`.toLowerCase();
          return rowText.includes(search);
      };

      groups.forEach(g => {
          const visibleItems = g.items.filter(isVisible);
          if(visibleItems.length === 0) return;

          if(g.hasVariants) {
              const trHeader = document.createElement('tr');
              trHeader.className = 'table-light fw-bold';
              trHeader.innerHTML = `<td colspan="6">${g.name}</td>`;
              tbody.appendChild(trHeader);
              visibleItems.forEach(p => renderRow(p, true));
          } else {
              visibleItems.forEach(p => renderRow(p, false));
          }
      });
      
      orphanItems.filter(isVisible).forEach(item => renderRow(item, false)); 

      if(data.length > 0) {
          const tr = document.createElement('tr');
          tr.className = 'table-light fw-bold';
          tr.innerHTML = `<td>Total (Raw Units)</td><td class="text-end">${totalOp}</td><td class="text-end">${totalIn}</td><td class="text-end">${totalOut}</td><td class="text-end">${totalNet}</td><td class="text-end">${totalClosing}</td>`;
          tbody.appendChild(tr);
      }
      }
    } else if(cat === 'financial'){
      header = ['Retailer','Op Balance','StockOut Amount','Payment Received','Cl Balance'];
      if(thead) thead.innerHTML = '<tr><th>Retailer</th><th class="text-end">Op Balance</th><th class="text-end">StockOut Amount</th><th class="text-end">Payment Received</th><th class="text-end">Cl Balance</th></tr>';
      
      const currentBals = {...rBalMap};
      const agg = {};
      
      // We iterate items (Newest -> Oldest) to calculate running balances and aggregate
      items.forEach(t=>{
          const ty = t.type;
          const rObj = t.retailerId || {};
          const rId = rObj._id || (typeof t.retailerId === 'string' ? t.retailerId : null);
          const retName = rObj.name || rMap[rId] || '-';
          const amt = Number(t.amount)||0;
          
          // Balance Rewind Logic (Newest to Oldest)
          // clBal is the balance AFTER this transaction
          let clBal = currentBals[rId] !== undefined ? currentBals[rId] : 0;
          let opBal = clBal; // opBal will be the balance BEFORE this transaction
          
          if(ty === 'order') opBal = clBal - amt; 
          else if(['payment_cash','payment_online'].includes(ty)) opBal = clBal + amt;
          else if(ty === 'return') opBal = clBal + amt; // Assuming return reduces debt like payment
          
          if(rId) currentBals[rId] = opBal;

          if(rId){
              if(!agg[rId]){
                  agg[rId] = {
                      id: rId,
                      name: retName,
                      sortOrder: rSortMap[rId] || 0,
                      clBal: clBal, // First time seen = Balance at End of Period
                      stockOut: 0,
                      payment: 0,
                      opBal: 0 
                  };
              }
              
              if(ty === 'order') agg[rId].stockOut += amt;
              else if(['payment_cash','payment_online'].includes(ty)) agg[rId].payment += amt;
              
              // Last time seen = Balance at Start of Period
              agg[rId].opBal = opBal;
          }
      });

      let totOp = 0;
      let totStockOut = 0;
      let totPay = 0;
      let totCl = 0;

      if(tbody){ 
        tbody.innerHTML='';
        const dateRange = (from || to) ? `${from || '?'} to ${to || 'Now'}` : 'All Time';
        
        // Sort by SortOrder then Retailer Name
        const sorted = Object.values(agg).sort((a,b)=> {
            const diff = a.sortOrder - b.sortOrder;
            if(diff !== 0) return diff;
            return a.name.localeCompare(b.name);
        });
        
        sorted.forEach(row => {
            // Filter: If user wants only "payment received", we might check row.payment > 0?
            // But user also asked for "StockOut Amount" column and "for all retailers".
            // We show all active retailers in the period.
            if(search && !row.name.toLowerCase().includes(search)) return;

            totOp += row.opBal;
            totStockOut += row.stockOut;
            totPay += row.payment;
            totCl += row.clBal;

            const stockOutHtml = row.stockOut !== 0 
               ? `<a href="#" onclick="showStockOutDetails('${row.id}', '${encodeURIComponent(row.name)}', '${from||''}', '${to||''}'); return false;">₹${row.stockOut.toFixed(2)}</a>` 
               : `₹0.00`;

            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.name}</td><td class="text-end">₹${row.opBal.toFixed(2)}</td><td class="text-end">${stockOutHtml}</td><td class="text-end">₹${row.payment.toFixed(2)}</td><td class="text-end">₹${row.clBal.toFixed(2)}</td>`;
            tbody.appendChild(tr);
            data.push([row.name, row.opBal.toFixed(2), row.stockOut.toFixed(2), row.payment.toFixed(2), row.clBal.toFixed(2)]);
        });

        if(data.length > 0) {
            const tr = document.createElement('tr');
            tr.className = 'table-light fw-bold';
            tr.innerHTML = `<td>Total</td><td class="text-end">₹${totOp.toFixed(2)}</td><td class="text-end">₹${totStockOut.toFixed(2)}</td><td class="text-end">₹${totPay.toFixed(2)}</td><td class="text-end">₹${totCl.toFixed(2)}</td>`;
            tbody.appendChild(tr);
        }
      }

    } else if(cat === 'retailer_ledger'){
      let showBalance = false;
      let runningBal = 0;
      if(selectedRetailer && !to) {
          showBalance = true;
          runningBal = selectedRetailer.currentBalance || 0;
      }

      header = ['Date','Type','Retailer','Staff','Amount'];
      if(showBalance) header.push('Balance');

      let html = '<tr><th>Date</th><th>Type</th><th>Retailer</th><th>Staff</th><th class="text-end">Amount</th>';
      if(showBalance) html += '<th class="text-end">Balance</th>';
      html += '</tr>';

      if(thead) thead.innerHTML = html;
      
      let totalDebit = 0;
      let totalCredit = 0;

      if(tbody){ tbody.innerHTML=''; items.forEach(t=>{
        const date = new Date(t.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const ty = t.type;
        const rObj = t.retailerId || {};
        const ret = rObj.name || (typeof t.retailerId === 'string' ? t.retailerId : '-');
        const amt = Number(t.amount)||0;
        const staffName = t.createdByStaffId ? (staffMap[t.createdByStaffId] || 'Unknown') : 'Distributor';
        
        let balCell = '';
        let rowBalVal = '';
        if(showBalance){
            balCell = `<td class="text-end fw-bold">₹${runningBal.toFixed(2)}</td>`;
            rowBalVal = runningBal.toFixed(2);
            if(ty === 'order') runningBal -= amt;
            else if(['payment_cash','payment_online'].includes(ty)) runningBal += amt;
        }

        const rowText = `${ds} ${ty} ${ret} ${staffName} ${amt}`.toLowerCase();
        if(search && !rowText.includes(search)) return;

        if(ty === 'order') totalDebit += amt;
        else if(ty.startsWith('payment')) totalCredit += amt;

        const tr = document.createElement('tr');
        const badge = ty==='order'? 'bg-primary' : 'bg-success';
        let typeHtml = `<span class="badge ${badge}">${ty}</span>`;
        if (ty === 'order' && t.referenceId) {
            const refId = t.referenceId._id || t.referenceId;
            typeHtml = `<span class="badge ${badge}" style="cursor:pointer" onclick="showOrderDetails('${refId}')">${ty} <i class="bi bi-info-circle"></i></span>`;
        }
        tr.innerHTML = `<td>${ds}</td><td>${typeHtml}</td><td>${ret}</td><td>${staffName}</td><td class="text-end">₹${amt.toFixed(2)}</td>${balCell}`;
        tbody.appendChild(tr);
        
        const rowData = [ds,ty,ret,staffName,amt.toFixed(2)];
        if(showBalance) rowData.push(rowBalVal);
        data.push(rowData);
      }); 
      
      if(data.length > 0) {
          const tr = document.createElement('tr');
          tr.className = 'table-light fw-bold';
          const balCol = showBalance ? '<td></td>' : '';
          tr.innerHTML = `<td>Total</td><td></td><td></td><td></td><td class="text-end"><div class="text-danger small">Orders: ₹${totalDebit.toFixed(2)}</div><div class="text-success small">Recd: ₹${totalCredit.toFixed(2)}</div></td>${balCol}`;
          tbody.appendChild(tr);
      }
      }
    } else if(cat === 'supplier_ledger'){
      header = ['Date','Type','Supplier','Staff','Amount'];
      if(thead) thead.innerHTML = '<tr><th>Date</th><th>Type</th><th>Supplier</th><th>Staff</th><th class="text-end">Amount</th></tr>';
      
      let totalBill = 0;
      let totalPaid = 0;

      if(tbody){ tbody.innerHTML=''; items.forEach(t=>{
        const date = new Date(t.createdAt);
        const ds = date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const ty = t.type;
        const sup = t.supplierId && t.supplierId.name ? t.supplierId.name : (t.supplierId||'-');
        const amt = Number(t.amount)||0;
        const staffName = t.createdByStaffId ? (staffMap[t.createdByStaffId] || 'Unknown') : 'Distributor';

        const rowText = `${ds} ${ty} ${sup} ${staffName} ${amt}`.toLowerCase();
        if(search && !rowText.includes(search)) return;

        if(ty === 'bill') totalBill += amt;
        else totalPaid += amt;

        const tr = document.createElement('tr');
        const badge = ty==='bill'? 'bg-danger' : 'bg-success';
        tr.innerHTML = `<td>${ds}</td><td><span class="badge ${badge}">${ty}</span></td><td>${sup}</td><td>${staffName}</td><td class="text-end">₹${amt.toFixed(2)}</td>`;
        tbody.appendChild(tr);
        data.push([ds,ty,sup,staffName,amt.toFixed(2)]);
      }); 
      
      if(data.length > 0) {
          const tr = document.createElement('tr');
          tr.className = 'table-light fw-bold';
          tr.innerHTML = `<td>Total</td><td></td><td></td><td></td><td class="text-end"><div class="text-danger small">Bills: ₹${totalBill.toFixed(2)}</div><div class="text-success small">Paid: ₹${totalPaid.toFixed(2)}</div></td>`;
          tbody.appendChild(tr);
      }
      }
    }
    if(cnt) cnt.textContent = String(data.length||0);
    if(data.length === 0 && tbody) {
       tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted py-3">No data found</td></tr>';
    }
    window.REP_HEADER = header;
    window.REP_DATA = data;
  }catch(e){ console.error(e); }
}

function showOutBreakdown(pId){
    const agg = (window.REP_OUT_BREAKDOWN && window.REP_OUT_BREAKDOWN[pId]) ? window.REP_OUT_BREAKDOWN[pId] : {};
    console.log('showOutBreakdown agg:', pId, agg);
    const cachedUnit = agg._unit;

    const renderModal = (product, retailers, units) => {
        // Create unit map for resolving compound unit details
        const unitMap = {};
        if(units) units.forEach(u => unitMap[u._id] = u);

        // Resolve full unit object from map to ensure we have conversion factors
        // Prefer cached unit from report generation as it's reliable
        let pUnit = cachedUnit || product.unit;
        
        // If pUnit is an object and looks good (has conversionFactor), use it.
        // Only lookup in map if we need to or if pUnit is just an ID.
        const isObj = pUnit && typeof pUnit === 'object';
        const typeStr = isObj ? String(pUnit.type).toLowerCase() : '';
        const hasConv = isObj && (pUnit.conversionFactor || typeStr !== 'compound');
        
        if(!hasConv) {
            const uId = isObj ? pUnit._id : pUnit;
            if(unitMap[uId]) pUnit = unitMap[uId];
        }

        let html = `
            <div class="d-flex gap-2 align-items-center mb-2 small">
                <span class="badge bg-primary">Retailer</span>
                <span class="badge bg-warning text-dark">Supplier</span>
                <span class="badge bg-danger">Wastage</span>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-bordered table-striped">
                    <thead><tr><th>Retailer</th><th class="text-end">Quantity</th></tr></thead>
                    <tbody>
        `;
        
        let total = 0;
        const rows = [];
        const visited = new Set();
        
        // Active Retailers
        retailers.forEach(r => {
            visited.add(r._id);
            const item = agg[r._id];
            const qty = item ? item.qty : 0;
            rows.push({ name: r.name, qty, kind: 'retailer', sortOrder: Number(r.sortOrder)||0 });
        });
        
        // Orphaned sales
        Object.keys(agg).forEach(rid => {
            if(rid === '_unit') return;
            if(!visited.has(rid)){
                let kind = 'retailer';
                if(rid === 'wastage') kind = 'wastage';
                else if(String(rid).startsWith('supplier:')) kind = 'supplier';
                rows.push({ name: agg[rid].name, qty: agg[rid].qty, kind, sortOrder: 9999 });
            }
        });

        // Calculate total
        rows.forEach(r => total += r.qty);

        // Sort: SortOrder first, then High quantity, then alphabetical
        rows.sort((a,b) => {
            const diff = a.sortOrder - b.sortOrder;
            if(diff !== 0) return diff;
            if(b.qty !== a.qty) return b.qty - a.qty;
            return a.name.localeCompare(b.name);
        });

        rows.forEach(r => {
            const qStr = pUnit ? formatUnitQty(r.qty, pUnit, unitMap) : r.qty;
            const cls = r.qty > 0 ? 'fw-bold' : 'text-muted';
            let badge = '<span class="badge bg-primary me-1">Retailer</span>';
            if(r.kind === 'supplier') badge = '<span class="badge bg-warning text-dark me-1">Supplier</span>';
            else if(r.kind === 'wastage') badge = '<span class="badge bg-danger me-1">Wastage</span>';
            html += `<tr class="${cls}"><td>${badge}${r.name}</td><td class="text-end">${qStr}</td></tr>`;
        });
        
        const totalStr = pUnit ? formatUnitQty(total, pUnit, unitMap) : total;
        html += `<tr class="table-light fw-bold border-top"><td>Total</td><td class="text-end">${totalStr}</td></tr>`;
        html += `</tbody></table></div>`;
        
        let modal = document.getElementById('outBreakdownModal');
        if(!modal){
            const d = document.createElement('div');
            d.innerHTML = `
            <div class="modal fade" id="outBreakdownModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">OUT Breakdown</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="outBreakdownBody"></div>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(d.firstElementChild);
            modal = document.getElementById('outBreakdownModal');
        }
        
        modal.querySelector('.modal-title').textContent = `OUT Breakdown: ${product.nameEnglish}`;
        document.getElementById('outBreakdownBody').innerHTML = html;
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    };

    Promise.all([
        api('/api/my/retailers').catch(() => []),
        api(`/api/products/${pId}`).catch(() => ({ nameEnglish: 'Product', unit: null })),
        api('/api/units').catch(() => [])
    ]).then(([retailers, product, units]) => {
        renderModal(product, retailers, units);
    }).catch(e => {
        console.error(e);
        alert('Failed to load data');
    });
}

function loadStaff(){
  // ... implementation
}

async function loadDistRates(){
  const sel = qs('#rateRetailerSel');
  if(!sel) return;
  
  try {
    const retailers = await api('/api/my/retailers');
    sel.innerHTML = '<option value="">Default Rates (All Retailers)</option>' + 
                    retailers.map(r => `<option value="${r._id}">${r.name}</option>`).join('');
    
    // Initial render for Default Rates
    await renderRatesTable();
    
  } catch(e){ console.error(e); }
}

async function renderRatesTable(){
  const sel = qs('#rateRetailerSel');
  const tbody = qs('#rateRows');
  if(!sel || !tbody) return;
  
  const retailerId = sel.value;
  tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
  
  try {
    const products = await api('/api/my/products?_t=' + Date.now());
    // Fetch product stats for sorting
    try {
        const stats = await api('/api/my/product-stats');
        const statMap = {};
        stats.forEach(s => statMap[s._id] = s.movement);
        products.sort((a, b) => {
            const mA = statMap[a._id] || 0;
            const mB = statMap[b._id] || 0;
            return mB - mA;
        });
    } catch(e) { console.error('Failed to sort products', e); }
    const distRates = await api('/api/my/rates');
    let retailerRates = [];
    if(retailerId){
       retailerRates = await api(`/api/my/retailers/${retailerId}/rates`);
    }
    
    const distRateMap = {};
    distRates.forEach(r => distRateMap[r.productId] = r.price);
    
    const retRateMap = {};
    retailerRates.forEach(r => retRateMap[r.productId] = r.price);
    
    tbody.innerHTML = '';
    
    const grouped = groupProducts(products);
    
    grouped.forEach(g => {
       const items = g.items.filter(p => !(p.source === 'global' && !p.active));
       if(items.length === 0) return;
       
       if(g.hasVariants) {
            const trHeader = document.createElement('tr');
            trHeader.className = 'table-light fw-bold';
            trHeader.innerHTML = `<td colspan="3">${g.name}</td>`;
            tbody.appendChild(trHeader);
       }
       
       items.forEach(p => {
           const tr = document.createElement('tr');
           const defPrice = distRateMap[p._id];
           const retPrice = retRateMap[p._id];
           
           const u = p.unit;
           const isCompound = u && String(u.type) === 'Compound';
           const symbol = isCompound ? (u.firstUnit && u.firstUnit.symbol ? u.firstUnit.symbol : 'Unit') : (u ? u.symbol : 'Unit');
           
           let defInput = '';
           let retInput = '';
           
           if(retailerId){
              // Retailer Mode: Default is Read-Only, Retailer is Input
              defInput = `<div class="input-group input-group-sm"><input type="number" step="1" class="form-control" value="${defPrice !== undefined ? Number(defPrice).toFixed(0) : ''}" disabled><span class="input-group-text">${symbol}</span></div>`;
              retInput = `<div class="input-group input-group-sm"><input type="number" step="1" class="form-control rate-ret-inp" data-pid="${p._id}" value="${retPrice !== undefined ? Number(retPrice).toFixed(0) : ''}" placeholder="Override"><span class="input-group-text">${symbol}</span></div>`;
           } else {
              // Default Mode: Default is Input, Retailer is N/A
              defInput = `<div class="input-group input-group-sm" style="min-width: 150px"><input type="number" step="1" class="form-control rate-def-inp" data-pid="${p._id}" value="${defPrice !== undefined ? Number(defPrice).toFixed(0) : ''}" placeholder="Set Default"><span class="input-group-text">${symbol}</span><button class="btn btn-outline-secondary" type="button" onclick="prepareRateHistory('${p._id}', '${p.nameEnglish}')" title="History"><i class="bi bi-clock-history"></i></button></div>`;
              retInput = `<span class="text-muted">-</span>`;
           }
           
           const nameClass = g.hasVariants ? 'ps-4' : '';
           const displayName = g.hasVariants ? (p.variantName || 'Base') : p.nameEnglish;

           tr.innerHTML = `
             <td class="${nameClass}">
               <div class="fw-bold small">${displayName}</div>
               <div class="text-muted small">${p.nameHindi||''}</div>
             </td>
             <td>${defInput}</td>
             <td>${retInput}</td>
           `;
           tbody.appendChild(tr);
       });
    });
    
    // Attach event listeners
    qsa('.rate-def-inp').forEach(i => i.addEventListener('change', async (e) => {
       const pid = e.target.dataset.pid;
       const price = Number(e.target.value);
       if(pid && price >= 0){
          try {
             await api('/api/my/rates', { method: 'POST', body: JSON.stringify({ productId: pid, price }) });
             e.target.classList.add('is-valid');
             setTimeout(()=>e.target.classList.remove('is-valid'), 1000);
          } catch(err){ alert(err.message); }
       }
    }));
    
    qsa('.rate-ret-inp').forEach(i => i.addEventListener('change', async (e) => {
       const pid = e.target.dataset.pid;
       const price = Number(e.target.value);
       if(pid && price >= 0){
          try {
             await api(`/api/my/retailers/${retailerId}/rates`, { method: 'POST', body: JSON.stringify({ productId: pid, price }) });
             e.target.classList.add('is-valid');
             setTimeout(()=>e.target.classList.remove('is-valid'), 1000);
          } catch(err){ alert(err.message); }
       }
    }));
    
  } catch(e){ 
    tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Error: ${e.message}</td></tr>`;
  }
}

// Initial
const path = location.pathname;
if(path.includes('admin.html')) loadAdmin();
else if(path.includes('distributor.html')) loadDistributor();
else if(path.includes('retailer.html')) { loadRetailer(); }
else {
  const loginBtn = qs('#loginBtn');
  if(loginBtn) loginBtn.onclick = login;
}

// --- History / Edit Extensions ---

 



try{
  if(path.includes('distributor.html') || path.includes('retailer.html')){
    history.pushState(null, '', location.href);
    window.addEventListener('popstate', function(ev){
      if(typeof window.handleBack === 'function') window.handleBack();
      try{ history.pushState(null, '', location.href); }catch{}
    });
  }
}catch{}




async function renderLedgerModal(retailer, triggerBtn) {
  try {
    qs('#ledgerRetailerName').textContent = retailer.name;
    qs('#ledgerBalance').textContent = '₹ ' + (retailer.currentBalance || 0).toFixed(2);
    
    const rows = qs('#ledgerRows');
    rows.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    const el = qs('#ledgerModal');
    if(!el) return;
    let m = bootstrap.Modal.getInstance(el);
    if(!m) m = new bootstrap.Modal(el);
    
    if(triggerBtn) {
        const onHidden = () => {
            if(document.body.contains(triggerBtn)) triggerBtn.focus();
            el.removeEventListener('hidden.bs.modal', onHidden);
        };
        el.addEventListener('hidden.bs.modal', onHidden);
    }

    m.show();
    
    // Refresh retailer to get latest balance
    try {
        const retailers = await api('/api/my/retailers?_t=' + Date.now());
        const fresh = retailers.find(r => r._id === retailer._id);
        if (fresh) {
            qs('#ledgerBalance').textContent = '₹ ' + (fresh.currentBalance || 0).toFixed(2);
        }
    } catch {}

    const transactions = await api(`/api/my/transactions?retailerId=${retailer._id}&_t=` + Date.now());
    console.log('Ledger transactions:', transactions);
    const list = transactions.filter(m => m.type === 'order' || m.type === 'payment_cash' || m.type === 'payment_online' || m.type === 'adjustment');
    console.log('Filtered ledger list:', list);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    rows.innerHTML = '';
    if (list.length === 0) {
      rows.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No transactions found</td></tr>';
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
        if (t.referenceId) {
             const refId = t.referenceId._id || t.referenceId;
             typeBadge = `<span class="badge bg-primary" style="cursor:pointer" onclick="showOrderDetails('${refId}')">Order <i class="bi bi-info-circle"></i></span>`;
        } else {
             typeBadge = '<span class="badge bg-primary">Order</span>';
        }
        amountClass = 'text-danger';
        sign = '+';
      } else if (t.type === 'adjustment') {
        typeBadge = '<span class="badge bg-warning text-dark">Adjustment</span>';
        if (amt >= 0) {
            amountClass = 'text-danger';
            sign = '+';
        } else {
            amountClass = 'text-success';
            sign = ''; 
        }
      } else {
        typeBadge = `<span class="badge bg-success">${t.type.replace('payment_', 'Payment ')}</span>`;
        amountClass = 'text-success';
        sign = '-';
      }
      
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${typeBadge}</td>
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
    const f = (u.firstUnit && u.firstUnit.symbol ? u.firstUnit : unitMap[u.firstUnit]) || {};
    const s = (u.secondUnit && u.secondUnit.symbol ? u.secondUnit : unitMap[u.secondUnit]) || {};
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
            <div class="modal fade" id="orderDetailModal" tabindex="-1" style="z-index: 10000;">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Order Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="orderDetailContent" class="text-center">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modal = qs('#orderDetailModal');
    } else {
        modal.style.zIndex = '10000';
    }
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    const content = qs('#orderDetailContent');
    if(content) content.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        const order = await api(`/api/orders/${orderId}`);
        console.log('Order Details:', order); // Debug log

        let html = `
            <div class="d-flex justify-content-between mb-2">
                <strong>Date:</strong> <span>${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
                <strong>Retailer:</strong> <span>${order.retailerId ? order.retailerId.name : '-'}</span>
            </div>
            <div class="d-flex justify-content-between mb-3">
                <strong>Total:</strong> <span class="fw-bold">₹${Number(order.totalAmount||0).toFixed(2)}</span>
            </div>
            <table class="table table-sm table-bordered">
                <thead><tr><th>Product</th><th class="text-end">Qty</th><th class="text-end">Price</th><th class="text-end">Total</th></tr></thead>
                <tbody>
        `;
        (order.items || []).forEach(item => {
             const p = item.productId || {};
             const pname = p.nameEnglish || p.nameHindi || 'Unknown';
             
             const rawQty = Number(item.quantity || 0);
             let rawPrice = Number(item.price || 0);
             
             // Fallback for existing orders with missing price data
             if (rawPrice === 0 && p.price) {
                 rawPrice = Number(p.price);
             }
             
             let qtyStr = rawQty;
             if(p && p.unit && String(p.unit.type).trim().toLowerCase() === 'compound' && p.unit.conversionFactor){
                const conv = Number(p.unit.conversionFactor);
                if(conv > 0) {
                   const first = Math.trunc(rawQty / conv);
                   const second = rawQty % conv;
                   const s1 = (p.unit.firstUnit && p.unit.firstUnit.symbol) ? p.unit.firstUnit.symbol : 'Box';
                   const s2 = (p.unit.secondUnit && p.unit.secondUnit.symbol) ? p.unit.secondUnit.symbol : 'Pouch';
                   
                   if(first > 0 && second > 0) qtyStr = `${first} ${s1} + ${second} ${s2}`;
                   else if(first > 0) qtyStr = `${first} ${s1}`;
                   else qtyStr = `${second} ${s2}`;
                }
             }

            let unitPrice = rawPrice;
            let lineTotal = rawQty * rawPrice;
            if(p && p.unit && String(p.unit.type).trim().toLowerCase() === 'compound' && p.unit.conversionFactor){
               const conv = Number(p.unit.conversionFactor);
               if(conv > 0){
                  unitPrice = rawPrice / conv;
                  lineTotal = unitPrice * rawQty;
               }
            }
            html += `
               <tr>
                   <td>${pname}</td>
                   <td class="text-end">${qtyStr}</td>
                   <td class="text-end">₹${unitPrice.toFixed(2)}</td>
                   <td class="text-end">₹${lineTotal.toFixed(2)}</td>
               </tr>
            `;
        });
        html += '</tbody></table>';
        if(content) content.innerHTML = html;
    } catch (e) {
        console.error(e);
        if(content) content.innerHTML = '<div class="text-danger">Failed to load order details</div>';
    }
};


async function renderRetailerProfile(){

  const el = qs('#retailerProfileContent');

  if(!el) return;

  

  try {

    const me = await api('/api/me');

    let html = `

      <div class="mb-3">

        <label class="form-label text-muted">Name</label>

        <div class="fw-bold">${me.name}</div>

      </div>

      <div class="mb-3">

        <label class="form-label text-muted">Email</label>

        <div>${me.email}</div>

      </div>

      <div class="mb-3">

        <label class="form-label text-muted">Role</label>

        <span class="badge bg-secondary">${me.role}</span>

      </div>

      <div class="mb-3">

        <label class="form-label text-muted">Phone</label>

        <div>${me.phone || '-'}</div>

      </div>

      <div class="mb-3">

        <label class="form-label text-muted">Address</label>

        <div>${me.address || '-'}</div>

      </div>

    `;

    

    if(!me.profileEditedOnce){

       html += `

         <hr>

         <div class="alert alert-info small">You can edit your profile details once.</div>

         <div class="mb-2"><label class="form-label">Name</label><input id="myProfileName" class="form-control" value="${me.name}"></div>

         <div class="mb-2"><label class="form-label">Phone</label><input id="myProfilePhone" class="form-control" value="${me.phone||''}"></div>

         <div class="mb-2"><label class="form-label">Address</label><textarea id="myProfileAddress" class="form-control">${me.address||''}</textarea></div>

         <button class="btn btn-primary w-100 mt-2" onclick="saveMyProfile()">Save Profile</button>

       `;

    }

    

    el.innerHTML = html;

  } catch(e){

    el.innerHTML = `<div class="text-danger">${e.message}</div>`;

  }

}



async function saveMyProfile(){

  const name = qs('#myProfileName').value;

  const phone = qs('#myProfilePhone').value;

  const address = qs('#myProfileAddress').value;

  

  if(!name) { alert('Name required'); return; }

  

  try {

    await api('/api/me/profile', { method:'PATCH', body: JSON.stringify({ name, phone, address }) });

    alert('Profile updated');

    renderRetailerProfile();

  } catch(e){ alert(e.message); }

}


async function loadStaff() {
  const tbody = qs('#staffList');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
  try {
    const staff = await api('/api/my/staff');
    tbody.innerHTML = '';
    if (staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No staff found.</td></tr>';
      return;
    }
    staff.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>${s.phone || '-'}</td>
        <td><span class="badge bg-secondary">${s.role}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editStaff('${s._id}')"><i class="bi bi-pencil"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Error: ${e.message}</td></tr>`;
  }
}

window.showProductDetails = async function(productId) {
    let modal = qs('#productDetailModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="productDetailModal" tabindex="-1" style="z-index: 10000;">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Product Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="productDetailContent" class="text-center">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modal = qs('#productDetailModal');
    } else {
        modal.style.zIndex = '10000';
    }
    
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    const content = qs('#productDetailContent');
    if(content) content.innerHTML = '<div class="spinner-border text-primary"></div>';
    
    try {
        const product = await api(`/api/products/${productId}`);
        const p = product;
        
        let unitStr = '-';
        if(p.unit){
           if(p.unit.type === 'Compound'){
               unitStr = `Compound (${p.unit.conversionFactor} ${p.unit.secondUnit?.symbol||''} = 1 ${p.unit.firstUnit?.symbol||''})`;
           } else {
               unitStr = p.unit.symbol || '-';
           }
        }

        let html = `
            <div class="mb-2"><strong>Name (English):</strong> ${p.nameEnglish || '-'}</div>
            <div class="mb-2"><strong>Name (Hindi):</strong> ${p.nameHindi || '-'}</div>
            <div class="mb-2"><strong>Category:</strong> ${p.category || '-'}</div>
            <div class="mb-2"><strong>Unit:</strong> ${unitStr}</div>
            <div class="mb-2"><strong>Base Price:</strong> ₹${Number(p.price||0).toFixed(2)}</div>
            <div class="mb-3"><strong>Current Stock:</strong> ${p.stock || 0}</div>
        `;
        
        if(content) content.innerHTML = html;
    } catch (e) {
        console.error(e);
        if(content) content.innerHTML = '<div class="text-danger">Failed to load product details</div>';
    }
};

function bindStaffForm() {
  // logic is handled by prepareAddStaff and saveStaff global functions or onclicks
}

function prepareAddStaff() {
  qs('#staffId').value = '';
  qs('#staffName').value = '';
  qs('#staffPhone').value = '';
  qs('#staffPhone').disabled = false;
  qs('#staffPassword').value = '';
  qs('#staffPassword').placeholder = 'Password';
  qsa('.staff-perm').forEach(c => c.checked = false);
  qs('#staffDeleteBtn').classList.add('d-none');
  qs('.modal-title', '#staffModal').textContent = 'Add Staff';
}

async function editStaff(id) {
  try {
    const staffList = await api('/api/my/staff');
    const s = staffList.find(x => x._id === id);
    if (!s) return;
    
    qs('#staffId').value = s._id;
    qs('#staffName').value = s.name;
    qs('#staffPhone').value = s.phone || '';
    qs('#staffPhone').disabled = true;
    qs('#staffPassword').value = '';
    qs('#staffPassword').placeholder = 'Leave blank to keep current';
    
    qsa('.staff-perm').forEach(c => {
      c.checked = s.permissions && s.permissions.includes(c.value);
    });
    
    qs('#staffDeleteBtn').classList.remove('d-none');
    qs('.modal-title', '#staffModal').textContent = 'Edit Staff';
    
    const m = new bootstrap.Modal(qs('#staffModal'));
    m.show();
  } catch (e) { alert(e.message); }
}

async function saveStaff() {
  const id = qs('#staffId').value;
  const name = qs('#staffName').value;
  const phone = qs('#staffPhone').value;
  const password = qs('#staffPassword').value;
  const permissions = [];
  qsa('.staff-perm').forEach(c => { if (c.checked) permissions.push(c.value); });

  if (!name || (!id && !phone) || (!id && !password)) {
    alert('Name, Mobile Number and Password are required for new staff');
    return;
  }

  const body = { name, permissions };
  if (phone) body.phone = phone;
  if (password) body.password = password;

  try {
    if (id) {
      await api(`/api/my/staff/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await api('/api/my/staff', { method: 'POST', body: JSON.stringify(body) });
    }
    const el = qs('#staffModal');
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
    loadStaff();
  } catch (e) { alert(e.message); }
}

async function deleteStaff() {
  const id = qs('#staffId').value;
  if (!id || !confirm('Are you sure you want to delete this staff member?')) return;
  try {
    await api(`/api/my/staff/${id}`, { method: 'DELETE' });
    const el = qs('#staffModal');
    const m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
    loadStaff();
  } catch (e) { alert(e.message); }
}

(function(){
  function handleBack(){
    var m = document.querySelector('.modal.show');
    if (m) {
      try { var inst = bootstrap.Modal.getInstance(m) || bootstrap.Modal.getOrCreateInstance(m); inst.hide(); } catch {}
      return;
    }
    var p = location.pathname;
    if (p.includes('distributor.html')) {
      var oc = document.querySelector('.offcanvas.show');
      if (oc) { try { var oinst = bootstrap.Offcanvas.getInstance(oc) || bootstrap.Offcanvas.getOrCreateInstance(oc); oinst.hide(); } catch {} return; }
      var active = document.querySelector('.tab-pane.show.active');
      if (active && active.id !== 'tab-dashboard' && typeof window.switchTab === 'function') { window.switchTab('tab-dashboard'); return; }
      return;
    }
    if (p.includes('retailer.html')) {
      var rActive = document.querySelector('.tab-pane.show.active');
      if (rActive && rActive.id !== 'tab-order' && typeof window.switchTab === 'function') { window.switchTab('tab-order'); return; }
      return;
    }
    return;
  }
  window.handleBack = handleBack;
  var cap = window.Capacitor;
  var appPlug = cap && cap.Plugins && cap.Plugins.App;
  if (appPlug && appPlug.addListener) {
    appPlug.addListener('backButton', handleBack);
  } else {
    document.addEventListener('backbutton', function(e){ e.preventDefault(); handleBack(); }, false);
  }
})();

// --- Stock Edit (Inline) ---
async function openEditStockMove(id){
  const move = globalStockMoves[id];
  if(!move) return;
  
  // Close any open modals if any (though history is usually on main page)
  const m = document.querySelector('.modal.show');
  if(m){ try{ const inst = bootstrap.Modal.getInstance(m); if(inst) inst.hide(); }catch{} }

  if(move.type === 'IN'){
     if(window.switchTab) window.switchTab('tab-stock-in');
     // renderStockIn is async, wait for it to finish rendering then pre-fill
     // Actually renderStockIn(move) handles both rendering and pre-filling
     await renderStockIn(move);
  } else if(move.type === 'OUT'){
     if(window.switchTab) window.switchTab('tab-stock-out');
     const d = new Date(move.createdAt).toISOString().split('T')[0];
     const rid = move.retailerId && move.retailerId._id ? move.retailerId._id : move.retailerId;
     await renderStockOut({ date: d, retailerId: rid });
  } else {
     alert('Cannot edit this transaction type inline.');
  }
}

/* 
// Legacy Modal Edit - Commented out
async function saveStockEdit(){ ... }
*/

let currentAdjBaseBalance = 0;

function updateAdjDynamicBalance() {
  const balEl = qs('#adjCurrentBalance');
  const inputEl = qs('#adjAmount');
  const btn = qs('#adjSave');
  if(!balEl || !inputEl) return;

  const val = Number(inputEl.value) || 0;
  
  let base = currentAdjBaseBalance;
  
  // If editing, subtract the original amount of the transaction being edited
  if(btn && btn.dataset.id && window.currentAdjustments){
      const tx = window.currentAdjustments.find(t => t._id === btn.dataset.id);
      if(tx){
          base -= (tx.amount || 0);
      }
  }
  
  const newBal = base + val;
  balEl.textContent = '₹ ' + newBal.toFixed(2);
  balEl.className = 'fw-bold ' + (newBal>0 ? 'text-danger' : 'text-success');
}

function prepareAdjustment(id, name, currentBalance){
  const nameEl = qs('#adjRetailerName');
  if(nameEl) nameEl.textContent = name;
  qs('#adjRetailerId').value = id;
  qs('#adjAmount').value = '';
  qs('#adjNote').value = '';
  
  // Reset date to today and clear edit mode
  const today = new Date().toISOString().split('T')[0];
  const dateEl = qs('#adjDate');
  if(dateEl) dateEl.value = today;
  
  const btn = qs('#adjSave');
  if(btn) {
      btn.textContent = 'Save';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-warning');
      btn.dataset.id = '';
  }

  currentAdjBaseBalance = Number(currentBalance)||0;
  updateAdjDynamicBalance();
  
  // Load history
  if(window.loadAdjustmentHistory) window.loadAdjustmentHistory(id, today);
}

window.loadAdjustmentHistory = async function(retailerId, dateStr) {
    const tbody = qs('#adjHistoryRows');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    try {
        const txs = await api(`/api/my/transactions?retailerId=${retailerId}&type=adjustment&from=${dateStr}&to=${dateStr}`);
        tbody.innerHTML = '';
        if(txs.length === 0){
             tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No adjustments found on this date.</td></tr>';
             return;
        }
        
        // Sort by creation time desc
        txs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        txs.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
               <td>${new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
               <td>${tx.note || '-'}</td>
               <td class="text-end ${tx.amount > 0 ? 'text-danger' : 'text-success'}">₹${tx.amount.toFixed(2)}</td>
               <td class="text-end">
                   <button class="btn btn-sm btn-outline-primary me-1" onclick="window.editAdjustment('${tx._id}')"><i class="bi bi-pencil"></i></button>
                   <button class="btn btn-sm btn-outline-danger" onclick="window.deleteAdjustment('${tx._id}')"><i class="bi bi-trash"></i></button>
               </td>
            `;
            tbody.appendChild(tr);
        });
        // Store for editing lookup
        window.currentAdjustments = txs;
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Failed to load history</td></tr>';
    }
};

window.editAdjustment = function(id) {
    const tx = window.currentAdjustments && window.currentAdjustments.find(t => t._id === id);
    if(!tx) return;
    
    qs('#adjAmount').value = tx.amount;
    qs('#adjNote').value = tx.note || '';
    // Keep the date as selected, or update if tx has different date (unlikely with filter)
    
    const btn = qs('#adjSave');
    btn.textContent = 'Update';
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-primary');
    btn.dataset.id = id;
};

window.deleteAdjustment = async function(id) {
    if(!confirm('Delete this adjustment? Balance will be reverted.')) return;
    try {
        await api(`/api/my/transactions/${id}`, { method: 'DELETE' });
        window.loadAdjustmentHistory(qs('#adjRetailerId').value, qs('#adjDate').value);
        loadRetailers(); 
    } catch(e) {
        alert(e.message);
    }
};

function bindAdjustmentForm(){
  const btn = qs('#adjSave');
  const dateEl = qs('#adjDate');
  const amtEl = qs('#adjAmount');
  
  if(amtEl){
      amtEl.addEventListener('input', updateAdjDynamicBalance);
  }
  
  if(dateEl) {
      dateEl.onchange = () => {
          const rid = qs('#adjRetailerId').value;
          if(rid) window.loadAdjustmentHistory(rid, dateEl.value);
      };
  }

  if(btn){
    btn.onclick = async () => {
      try {
        const retailerId = qs('#adjRetailerId').value;
        const amount = qs('#adjAmount').value;
        const note = qs('#adjNote').value;
        const date = qs('#adjDate').value;
        const txId = btn.dataset.id;
        
        if(!amount) throw new Error('Invalid amount');
        const amtVal = Number(amount);
        if(isNaN(amtVal) || amtVal === 0) throw new Error('Amount cannot be zero');
        if(!date) throw new Error('Date is required');

        if(txId) {
            // Update
            await api(`/api/my/transactions/${txId}`, {
                method: 'PUT',
                body: JSON.stringify({ amount: amtVal, note, date })
            });
            alert('Adjustment updated');
            
            // Reset to create mode
            btn.textContent = 'Save';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-warning');
            btn.dataset.id = '';
            qs('#adjAmount').value = '';
            qs('#adjNote').value = '';

        } else {
            // Create
            await api('/api/my/retailer-adjustment', {
              method: 'POST',
              body: JSON.stringify({ retailerId, amount: amtVal, note, date })
            });
            alert('Adjustment recorded');
            qs('#adjAmount').value = '';
            qs('#adjNote').value = '';
        }
        
        window.loadAdjustmentHistory(retailerId, date);
        loadRetailers();
      } catch(e){
        alert(e.message);
      }
    };
  }
}

window.showStockOutDetails = async function(retailerId, encodedName, from, to) {
    const name = decodeURIComponent(encodedName);
    
    // 1. Create Modal if not exists
    let modal = qs('#stockOutDetailModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="stockOutDetailModal" tabindex="-1" style="z-index: 10000;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Stock Out Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <h6 id="sodTitle" class="mb-3"></h6>
                            <div class="table-responsive" style="max-height: 400px;">
                                <table class="table table-sm table-striped mb-0">
                                    <thead><tr><th>Time</th><th>Note</th><th class="text-end">Amount</th></tr></thead>
                                    <tbody id="sodRows"></tbody>
                                    <tfoot id="sodFooter"></tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modal = qs('#stockOutDetailModal');
    }
    
    // 2. Show Modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    qs('#sodTitle').textContent = `${name} (${from || 'Start'} - ${to || 'Now'})`;
    const tbody = qs('#sodRows');
    const tfoot = qs('#sodFooter');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
    tfoot.innerHTML = '';

    // 3. Fetch Data
    try {
        const params = new URLSearchParams({
            retailerId,
            type: 'order',
            populateOrders: 'true'
        });
        if(from) params.append('from', from);
        if(to) params.append('to', to);
        
        const txs = await api(`/api/my/transactions?${params.toString()}`);
        
        // 4. Render
        tbody.innerHTML = '';
        if(txs.length === 0){
             tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No records found.</td></tr>';
             return;
        }
        
        let total = 0;
        // Sort DESC
        txs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        txs.forEach(tx => {
            console.log('StockOut TX:', tx);
            total += tx.amount;
            const d = new Date(tx.createdAt);
            const ds = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            
            let detailsHtml = '';
            if (tx.referenceId && Array.isArray(tx.referenceId.items) && tx.referenceId.items.length > 0) {
                detailsHtml = '<div class="mt-2"><table class="table table-bordered table-sm small mb-0 bg-white" style="font-size: 0.85em;">';
                detailsHtml += '<thead class="table-light"><tr><th>Product</th><th class="text-end">Qty</th><th class="text-end">Rate</th><th class="text-end">Total</th></tr></thead><tbody>';
                tx.referenceId.items.forEach(item => {
                    const pObj = item.productId || {};
                    const pName = (typeof pObj === 'object' && (pObj.nameEnglish || pObj.nameHindi)) 
                                  ? (pObj.nameEnglish || pObj.nameHindi) 
                                  : 'Unknown Product';
                    const qty = item.quantity;
                    const price = item.price;
                    const sub = qty * price;
                    detailsHtml += `<tr><td>${pName}</td><td class="text-end">${qty}</td><td class="text-end">₹${price.toFixed(2)}</td><td class="text-end">₹${sub.toFixed(2)}</td></tr>`;
                });
                detailsHtml += '</tbody></table></div>';
            } else {
                 if(tx.amount > 0) {
                     detailsHtml = '<div class="mt-1 text-muted small fst-italic">Order details not available.</div>';
                 }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="vertical-align: top;">${ds}</td>
                <td style="vertical-align: top;">
                    <div class="fw-bold">${tx.note || 'Stock Out'}</div>
                    ${detailsHtml}
                </td>
                <td class="text-end fw-bold" style="vertical-align: top;">₹${tx.amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        tfoot.innerHTML = `
            <tr class="fw-bold table-light">
                <td colspan="2">Total</td>
                <td class="text-end">₹${total.toFixed(2)}</td>
            </tr>
        `;
        
    } catch(e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger">Error: ${e.message}</td></tr>`;
    }
};
