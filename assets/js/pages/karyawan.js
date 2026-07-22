// ═══════════════════════════════════════════
// Kelola Data Karyawan Page
// ═══════════════════════════════════════════

const PageKaryawan = {
  data: [],
  page: 1,
  perPage: 25,
  total: 0,

  async init() {
    await this.load();
  },

  async load() {
    const search = document.getElementById('search-karyawan')?.value ?? '';
    const status = document.getElementById('filter-status-karyawan')?.value ?? '';

    try {
      const res = await API.get('karyawan.php', { search, status, page: this.page, per_page: this.perPage });
      this.data = res.data;
      this.total = res.total;
      this.render();
    } catch (e) { /* toast already shown */ }
  },

  render() {
    const container = document.getElementById('page-karyawan');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Kelola Data Karyawan</h1>
        <p class="page-subtitle">Data 108 karyawan Rumah Pemotongan Hewan</p>
      </div>

      <div class="stat-row">
        ${StatCard('Total Karyawan', this.total, '👥', 'green')}
        ${StatCard('Halaman', this.page + ' / ' + Math.ceil(this.total / this.perPage), '📄', 'blue')}
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-box">
              <input type="text" id="search-karyawan" placeholder="Cari nama, ID, jabatan..." oninput="debounce(() => PageKaryawan.search(), 300)()">
            </div>
            <select class="filter-select" id="filter-status-karyawan" onchange="PageKaryawan.search()">
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="tidak_aktif">Tidak Aktif</option>
            </select>
          </div>
          <div class="table-toolbar-right">
            <button class="btn btn-danger btn-sm" onclick="PageKaryawan.resetDataset()">Kosongkan Dataset</button>
            <button class="btn btn-outline btn-sm" onclick="PageKaryawan.importExcel()">Import Excel</button>
            <button class="btn btn-outline btn-sm" onclick="PageKaryawan.exportExcel()">Export Excel</button>
            <button class="btn btn-primary" onclick="PageKaryawan.showForm()">+ Tambah</button>
          </div>
        </div>
        <div id="tabel-karyawan"></div>
        <div id="pagination-karyawan"></div>
      </div>
      <input type="file" id="import-karyawan-file" accept=".xlsx,.xls" style="display:none" onchange="PageKaryawan.processImport(event)">
    `;

    document.getElementById('tabel-karyawan').innerHTML = buildTable(
      [
        { key: 'no', label: 'No', align: 'center', render: (r, i) => (this.page - 1) * this.perPage + i + 1 },
        { key: 'kode', label: 'ID Karyawan', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama', render: r => `<strong>${r.nama}</strong>` },
        { key: 'jabatan', label: 'Jabatan' },
        { key: 'status', label: 'Status', align: 'center', render: r => Badge(r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif', r.status === 'aktif' ? 'green' : 'red') },
        {
          key: 'aksi', label: 'Aksi', align: 'center', render: r => `
          <div class="action-btns" style="justify-content:center">
            <button class="btn-icon" onclick="PageKaryawan.showForm(${r.id})" title="Edit">✏️</button>
            <button class="btn-icon danger" onclick="PageKaryawan.hapus(${r.id})" title="Hapus">🗑️</button>
          </div>` }
      ],
      this.data
    );

    document.getElementById('pagination-karyawan').innerHTML =
      Pagination(this.total, this.perPage, this.page, 'PageKaryawan.goPage');
  },

  search() {
    this.page = 1;
    this.load();
  },

  goPage(p) {
    PageKaryawan.page = p;
    PageKaryawan.load();
  },

  showForm(id = null) {
    const data = id ? this.data.find(k => k.id == id) : null;
    showModal(
      data ? 'Edit Karyawan' : 'Tambah Karyawan',
      `<div class="form-group">
        <label class="form-label">Nama Lengkap *</label>
        <input class="form-input" id="input-nama-karyawan" value="${data?.nama ?? ''}" placeholder="Masukkan nama lengkap" required>
      </div>
      <div class="form-group">
        <label class="form-label">Jabatan</label>
        <input class="form-input" id="input-jabatan" value="${data?.jabatan ?? 'Karyawan RPH'}" placeholder="Jabatan">
      </div>
      ${data ? `<div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="input-status-karyawan">
          <option value="aktif" ${data.status === 'aktif' ? 'selected' : ''}>Aktif</option>
          <option value="tidak_aktif" ${data.status === 'tidak_aktif' ? 'selected' : ''}>Tidak Aktif</option>
        </select>
      </div>` : ''}`,
      async () => {
        const body = {
          nama: document.getElementById('input-nama-karyawan').value,
          jabatan: document.getElementById('input-jabatan').value
        };
        if (data) body.status = document.getElementById('input-status-karyawan').value;

        if (!body.nama) { showToast('Nama wajib diisi', 'error'); return; }

        if (data) await API.put(`karyawan.php?id=${data.id}`, body);
        else await API.post('karyawan.php', body);

        closeModal();
        showToast(data ? 'Karyawan diperbarui' : 'Karyawan ditambahkan');
        this.load();
      }
    );
  },

  async hapus(id) {
    const karyawan = this.data.find(k => k.id == id);
    showConfirm(
      'Hapus Karyawan',
      `Apakah Anda yakin ingin menghapus karyawan <strong>${karyawan?.nama || 'ini'}</strong> (${karyawan?.kode || ''})? Data penilaian terkait juga akan dihapus.`,
      async () => {
        await API.delete(`karyawan.php?id=${id}`);
        closeModal();
        showToast('Karyawan dihapus');
        this.load();
      }
    );
  },

  importExcel() {
    document.getElementById('import-karyawan-file').click();
  },

  async processImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    // Ambil periode aktif saat ini
    const activePeriode = window.__periodeAktif || new Date().toISOString().slice(0, 7);

    await API.post(`karyawan.php?action=import&periode=${activePeriode}`, rows);
    showToast(`${rows.length} data karyawan dan kriteria berhasil diimport`);
    event.target.value = '';
    this.load();
  },

  exportExcel() {
    const exportData = this.data.map((r, i) => ({
      'No': i + 1,
      'Kode': r.kode,
      'Nama': r.nama,
      'Jabatan': r.jabatan,
      'Status': r.status
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
    XLSX.writeFile(wb, 'Data_Karyawan_RPH.xlsx');
    showToast('Data karyawan berhasil diexport');
  },

  resetDataset() {
    showConfirm(
      'Reset Seluruh Dataset',
      'Apakah Anda yakin ingin mengosongkan seluruh dataset? Tindakan ini akan menghapus semua data karyawan, data penilaian, dan hasil perhitungan TOPSIS.',
      async () => {
        try {
          await API.post('karyawan.php?action=truncate');
          showToast('Seluruh dataset berhasil dikosongkan');
          this.load();
        } catch (err) {
          showToast('Gagal mengosongkan dataset', 'error');
        }
      }
    );
  }
};
