// ═══════════════════════════════════════════
// Kelola Data Kriteria Page
// ═══════════════════════════════════════════

const PageKriteria = {
  data: [],
  totalBobot: 0,
  valid: false,

  async init() {
    await this.load();
  },

  async load() {
    try {
      const res = await API.get('kriteria.php');
      this.data = res.data;
      this.totalBobot = res.totalBobot;
      this.valid = res.valid;
      this.render();
    } catch (e) { /* toast shown */ }
  },

  render() {
    const container = document.getElementById('page-kriteria');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Kelola Data Kriteria</h1>
        <p class="page-subtitle">8 kriteria penilaian karyawan RPH — Semua bertipe Benefit</p>
      </div>

      <div class="table-card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <span class="card-title">Daftar Kriteria</span>
          </div>
          <div class="table-toolbar-right">
            <button class="btn btn-primary" onclick="PageKriteria.showForm()">+ Tambah Kriteria</button>
          </div>
        </div>
        <div id="tabel-kriteria"></div>
        <div class="bobot-footer">
          <div>
            Total Bobot: <strong id="total-bobot">${this.totalBobot.toFixed(2)}</strong>
            &nbsp;
            <span id="bobot-status" class="badge ${this.valid ? 'badge-green' : 'badge-red'}">
              ${this.valid ? '✓ Valid' : '✗ Belum Valid (harus = 1.00)'}
            </span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('tabel-kriteria').innerHTML = buildTable(
      [
        { key: 'no', label: 'No', align: 'center', render: (r, i) => i + 1 },
        { key: 'kode', label: 'Kode', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama Kriteria', render: r => `<strong>${r.nama}</strong>` },
        { key: 'bobot', label: 'Bobot', align: 'center', render: r => `<strong>${parseFloat(r.bobot).toFixed(2)}</strong>` },
        { key: 'jenis', label: 'Jenis', align: 'center', render: r => Badge(r.jenis === 'benefit' ? 'Benefit ↑' : 'Cost ↓', r.jenis === 'benefit' ? 'green' : 'red') },
        {
          key: 'aksi', label: 'Aksi', align: 'center', render: r => `
          <div class="action-btns" style="justify-content:center">
            <button class="btn-icon" onclick="PageKriteria.showForm(${r.id})" title="Edit">✏️</button>
            <button class="btn-icon danger" onclick="PageKriteria.hapus(${r.id})" title="Hapus">🗑️</button>
          </div>` }
      ],
      this.data
    );
  },

  showForm(id = null) {
    const data = id ? this.data.find(k => k.id == id) : null;
    showModal(
      data ? 'Edit Kriteria' : 'Tambah Kriteria',
      `<div class="form-row">
        <div class="form-group">
          <label class="form-label">Kode *</label>
          <input class="form-input" id="input-kode-kriteria" value="${data?.kode ?? ''}" placeholder="C9" required>
        </div>
        <div class="form-group">
          <label class="form-label">Bobot *</label>
          <input class="form-input" id="input-bobot" type="number" step="0.01" min="0" max="1" value="${data ? parseFloat(data.bobot).toFixed(2) : ''}" placeholder="0.10" required>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Kriteria *</label>
        <input class="form-input" id="input-nama-kriteria" value="${data?.nama ?? ''}" placeholder="Nama kriteria" required>
      </div>
      <div class="form-group">
        <label class="form-label">Jenis</label>
        <select class="form-select" id="input-jenis">
          <option value="benefit" ${data?.jenis === 'benefit' || !data ? 'selected' : ''}>Benefit (semakin besar semakin baik)</option>
          <option value="cost" ${data?.jenis === 'cost' ? 'selected' : ''}>Cost (semakin kecil semakin baik)</option>
        </select>
      </div>`,
      async () => {
        const body = {
          kode: document.getElementById('input-kode-kriteria').value,
          nama: document.getElementById('input-nama-kriteria').value,
          bobot: parseFloat(document.getElementById('input-bobot').value),
          jenis: document.getElementById('input-jenis').value
        };

        if (!body.kode || !body.nama || isNaN(body.bobot)) {
          showToast('Semua field wajib diisi', 'error'); return;
        }

        if (data) await API.put(`kriteria.php?id=${data.id}`, body);
        else await API.post('kriteria.php', body);

        closeModal();
        showToast(data ? 'Kriteria diperbarui' : 'Kriteria ditambahkan');
        this.load();
      }
    );
  },

  async hapus(id) {
    const kriteria = this.data.find(k => k.id == id);
    showConfirm(
      'Hapus Kriteria',
      `Apakah Anda yakin ingin menghapus kriteria <strong>${kriteria?.nama || 'ini'}</strong> (${kriteria?.kode || ''})? Semua data penilaian terkait juga akan terpengaruh.`,
      async () => {
        await API.delete(`kriteria.php?id=${id}`);
        closeModal();
        showToast('Kriteria dihapus');
        this.load();
      }
    );
  }
};
