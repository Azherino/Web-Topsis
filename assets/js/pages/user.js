// ═══════════════════════════════════════════
// Kelola Data User Page
// ═══════════════════════════════════════════

const PageUser = {
  data: [],

  async init() {
    await this.load();
  },

  async load() {
    const container = document.getElementById('page-user');
    const search = document.getElementById('search-user')?.value ?? '';

    try {
      const res = await API.get('user.php', { search });
      this.data = res.data;
      this.render();
    } catch (e) {
      container.innerHTML = InfoBanner('Gagal memuat data user', 'error');
    }
  },

  render() {
    const container = document.getElementById('page-user');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Kelola Data User</h1>
        <p class="page-subtitle">Manajemen pengguna sistem SPK</p>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-box">
              <input type="text" id="search-user" placeholder="Cari username..." oninput="PageUser.load()">
            </div>
          </div>
          <div class="table-toolbar-right">
            <button class="btn btn-primary" onclick="PageUser.showForm()">+ Tambah User</button>
          </div>
        </div>
        <div id="tabel-user"></div>
      </div>
    `;

    document.getElementById('tabel-user').innerHTML = buildTable(
      [
        { key: 'no', label: 'No', align: 'center', render: (r, i) => i + 1 },
        { key: 'username', label: 'Username', render: r => `<strong>${r.username}</strong>` },
        { key: 'role', label: 'Role', render: r => Badge(r.role === 'superadmin' ? 'Superadmin' : r.role.charAt(0).toUpperCase() + r.role.slice(1), r.role === 'superadmin' ? 'red' : r.role === 'admin' ? 'purple' : r.role === 'manager' ? 'blue' : 'gray') },
        { key: 'status', label: 'Status', render: r => Badge(r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif', r.status === 'aktif' ? 'green' : 'red') },
        {
          key: 'aksi', label: 'Aksi', align: 'center', render: r => `
          <div class="action-btns" style="justify-content:center">
            <button class="btn-icon" onclick="PageUser.showForm(${r.id})" title="Edit">✏️</button>
            ${r.role === 'superadmin' ? '' : `<button class="btn-icon danger" onclick="PageUser.hapus(${r.id})" title="Hapus">🗑️</button>`}
          </div>` }
      ],
      this.data
    );
  },

  showForm(id = null) {
    const user = id ? this.data.find(u => u.id == id) : null;
    showModal(
      user ? 'Edit User' : 'Tambah User',
      `<div class="form-group">
        <label class="form-label">Username *</label>
        <input class="form-input" id="input-username" value="${user?.username ?? ''}" placeholder="Min 4 karakter" required>
      </div>
      <div class="form-group">
        <label class="form-label">Password ${user ? '(kosongkan jika tidak diubah)' : '*'}</label>
        <input class="form-input" id="input-password" type="password" placeholder="Password" ${user ? '' : 'required'}>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-select" id="input-role">
            ${user?.role === 'superadmin' ? '<option value="superadmin" selected disabled>Superadmin</option>' : ''}
            <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Administrator</option>
            <option value="manager" ${user?.role === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="staff" ${user?.role === 'staff' ? 'selected' : ''}>Staff</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="input-status-user">
            <option value="aktif" ${user?.status === 'aktif' ? 'selected' : ''}>Aktif</option>
            <option value="tidak_aktif" ${user?.status === 'tidak_aktif' ? 'selected' : ''}>Tidak Aktif</option>
          </select>
        </div>
      </div>`,
      async () => {
        const body = {
          username: document.getElementById('input-username').value,
          role: document.getElementById('input-role').value,
          status: document.getElementById('input-status-user').value
        };
        const pwd = document.getElementById('input-password').value;
        if (pwd) body.password = pwd;

        if (body.username.length < 4) { showToast('Username minimal 4 karakter', 'error'); return; }
        if (!user && !pwd) { showToast('Password wajib diisi', 'error'); return; }

        if (user) await API.put(`user.php?id=${user.id}`, body);
        else await API.post('user.php', body);

        closeModal();
        showToast(user ? 'User diperbarui' : 'User ditambahkan');
        this.load();
      }
    );
  },

  async hapus(id) {
    const user = this.data.find(u => u.id == id);
    showConfirm(
      'Hapus User',
      `Apakah Anda yakin ingin menghapus user <strong>${user?.username || 'ini'}</strong>? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        await API.delete(`user.php?id=${id}`);
        closeModal();
        showToast('User dihapus');
        this.load();
      }
    );
  }
};
