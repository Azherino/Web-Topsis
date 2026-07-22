// ═══════════════════════════════════════════
// Input Nilai Penilaian Page
// ═══════════════════════════════════════════

const PageInputNilai = {
  data: [],
  kriteria: [],
  page: 1,
  perPage: 25,
  total: 0,
  totalLengkap: 0,
  periode: null,

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    await this.load();
  },

  async load() {
    const search = document.getElementById('search-input-nilai')?.value ?? '';

    try {
      const res = await API.get('penilaian.php', {
        periode: this.periode,
        page: this.page,
        per_page: this.perPage,
        search
      });
      this.data = res.data;
      this.kriteria = res.kriteria;
      this.total = res.total;
      this.totalLengkap = res.totalLengkap;
      this.render();
    } catch (e) { /* toast shown */ }
  },

  render() {
    const container = document.getElementById('page-input-nilai');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Input Nilai Penilaian</h1>
        <p class="page-subtitle">Masukkan nilai 0–100 untuk setiap karyawan pada setiap kriteria</p>
      </div>

      <div class="stat-row">
        ${StatCard('Sudah Lengkap', this.totalLengkap + ' / ' + this.total, '✅', 'green')}
        ${StatCard('Belum Lengkap', (this.total - this.totalLengkap) + ' karyawan', '⚠️', this.totalLengkap >= this.total ? 'green' : 'gold')}
        ${StatCard('Periode', this.periode, '📅', 'blue')}
      </div>

      ${this.totalLengkap >= this.total
        ? InfoBanner('Semua karyawan sudah memiliki nilai lengkap. Anda dapat melanjutkan ke proses normalisasi.', 'success')
        : InfoBanner(`${this.total - this.totalLengkap} karyawan belum memiliki nilai lengkap (ditandai merah).`, 'warning')
      }

      <div class="table-card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-box">
              <input type="text" id="search-input-nilai" placeholder="Cari karyawan..." oninput="debounce(() => { PageInputNilai.page = 1; PageInputNilai.load(); }, 300)()">
            </div>
            ${PeriodeSelect(this.periode, "PageInputNilai.periode = this.value; PageInputNilai.page = 1; PageInputNilai.load();", 'filter-periode-input')}
          </div>
          <div class="table-toolbar-right">
            <button class="btn btn-outline btn-sm" onclick="PageInputNilai.importExcel()">Import Excel</button>
          </div>
        </div>
        <div id="tabel-input-nilai" style="overflow-x:auto"></div>
        <div id="pagination-input-nilai"></div>
      </div>
      <input type="file" id="import-nilai-file" accept=".xlsx,.xls" style="display:none" onchange="PageInputNilai.processImport(event)">
    `;

    // Build columns
    const columns = [
      { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
      { key: 'nama', label: 'Nama Karyawan', render: r => `<strong>${r.nama}</strong>` }
    ];

    this.kriteria.forEach(kr => {
      columns.push({
        key: kr.kode,
        label: kr.kode,
        align: 'center',
        render: r => {
          const val = r.nilai[kr.kode];
          if (val === null || val === undefined) {
            return `<span class="text-muted" onclick="PageInputNilai.editCell(this, ${r.id}, ${kr.id}, '')" style="cursor:pointer">—</span>`;
          }
          return `<span onclick="PageInputNilai.editCell(this, ${r.id}, ${kr.id}, ${val})" style="cursor:pointer">${val}</span>`;
        }
      });
    });

    document.getElementById('tabel-input-nilai').innerHTML = buildTable(columns, this.data, {
      rowClass: (row) => row.lengkap ? '' : 'highlight-red'
    });

    document.getElementById('pagination-input-nilai').innerHTML =
      Pagination(this.total, this.perPage, this.page, 'PageInputNilai.goPage');
  },

  goPage(p) {
    PageInputNilai.page = p;
    PageInputNilai.load();
  },

  editCell(el, karyawanId, kriteriaId, currentVal) {
    const td = el.closest('td');
    td.innerHTML = `<input class="inline-input" type="number" min="0" max="100" value="${currentVal}" autofocus>`;
    const input = td.querySelector('input');
    input.focus();
    input.select();

    const save = async () => {
      const newVal = parseFloat(input.value);
      if (isNaN(newVal) || newVal < 0 || newVal > 100) {
        td.innerHTML = `<span onclick="PageInputNilai.editCell(this, ${karyawanId}, ${kriteriaId}, '${currentVal}')" style="cursor:pointer">${currentVal || '—'}</span>`;
        showToast('Nilai harus antara 0-100', 'error');
        return;
      }

      try {
        await API.post('penilaian.php', {
          karyawan_id: karyawanId,
          kriteria_id: kriteriaId,
          nilai: newVal,
          periode: this.periode
        });
        td.innerHTML = `<span onclick="PageInputNilai.editCell(this, ${karyawanId}, ${kriteriaId}, ${newVal})" style="cursor:pointer">${newVal}</span>`;
        showToast('Nilai disimpan');
      } catch (e) {
        td.innerHTML = `<span onclick="PageInputNilai.editCell(this, ${karyawanId}, ${kriteriaId}, '${currentVal}')" style="cursor:pointer">${currentVal || '—'}</span>`;
      }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') {
        td.innerHTML = `<span onclick="PageInputNilai.editCell(this, ${karyawanId}, ${kriteriaId}, '${currentVal}')" style="cursor:pointer">${currentVal || '—'}</span>`;
      }
    });
  },

  importExcel() {
    document.getElementById('import-nilai-file').click();
  },

  async processImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    await API.post('penilaian.php?action=import', { periode: this.periode, data: rows });
    showToast('Nilai penilaian berhasil diimport');
    event.target.value = '';
    this.load();
  }
};
