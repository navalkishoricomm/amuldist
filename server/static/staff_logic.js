
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
    qs('#staffPhone').disabled = false;
    qs('#staffPassword').value = '';
    qs('#staffPassword').placeholder = 'Leave blank to keep current';
    
    qsa('.staff-perm').forEach(c => {
      c.checked = s.permissions && s.permissions.includes(c.value);
    });
    
    qs('#staffDeleteBtn').classList.remove('d-none');
    qs('.modal-title', '#staffModal').textContent = 'Edit Staff';
    
    const m = bootstrap.Modal.getOrCreateInstance(qs('#staffModal'));
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
    alert('Name, Phone and Password are required for new staff');
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
