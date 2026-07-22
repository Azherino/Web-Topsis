// ═══════════════════════════════════════════
// Nilai Preferensi Page
// ═══════════════════════════════════════════

const PagePreferensi = {
  page: 1,
  perPage: 25,
  periode: null,

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    this.render();
  },

  render() {
    const container = document.getElementById('page-preferensi');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Nilai Preferensi</h1>
        <p class="page-subtitle">Jarak D⁺, D⁻, dan Nilai Preferensi (V) setiap karyawan</p>
      </div>

      <div class="flex items-center justify-between mb-16" style="gap:12px;flex-wrap:wrap">
        ${PeriodeSelect(this.periode, "PagePreferensi.periode = this.value; PagePreferensi.loadHasil();", 'filter-periode-pref')}
      </div>

      <div id="preferensi-result">${LoadingSpinner()}</div>
    `;
    this.loadHasil();
  },

  async loadHasil() {
    const resultDiv = document.getElementById('preferensi-result');

    try {
      const res = await API.get('topsis.php', { action: 'hasil', periode: this.periode, page: this.page, per_page: this.perPage });

      if (!res.data || res.data.length === 0) {
        resultDiv.innerHTML = InfoBanner('Belum ada hasil perhitungan. Lakukan proses di halaman Normalisasi terlebih dahulu.', 'warning');
        return;
      }

      const displayData = res.data;

      // D+ and D- side by side
      const dPlusColumns = [
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama' },
        { key: 'd_plus', label: 'D⁺', align: 'center', render: r => `<span class="text-mono">${parseFloat(r.d_plus).toFixed(6)}</span>` }
      ];

      const dMinusColumns = [
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama' },
        { key: 'd_minus', label: 'D⁻', align: 'center', render: r => `<span class="text-mono">${parseFloat(r.d_minus).toFixed(6)}</span>` }
      ];

      // Preferensi table
      const prefColumns = [
        { key: 'ranking', label: 'Rank', align: 'center', render: r => RankBadge(r.ranking) },
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama', render: r => `<strong>${r.nama}</strong>` },
        { key: 'd_plus', label: 'D⁺', align: 'center', render: r => `<span class="text-mono">${parseFloat(r.d_plus).toFixed(6)}</span>` },
        { key: 'd_minus', label: 'D⁻', align: 'center', render: r => `<span class="text-mono">${parseFloat(r.d_minus).toFixed(6)}</span>` },
        { key: 'preferensi', label: 'Nilai V', align: 'center', render: r => `<strong class="text-green text-mono">${parseFloat(r.preferensi).toFixed(6)}</strong>` }
      ];

      resultDiv.innerHTML = `
        ${FormulaBox('D⁺<sub>i</sub> = √(Σ (y<sub>ij</sub> - A⁺<sub>j</sub>)²) &nbsp;&nbsp;|&nbsp;&nbsp; D⁻<sub>i</sub> = √(Σ (y<sub>ij</sub> - A⁻<sub>j</sub>)²) &nbsp;&nbsp;|&nbsp;&nbsp; V<sub>i</sub> = D⁻<sub>i</sub> / (D⁺<sub>i</sub> + D⁻<sub>i</sub>)')}

        <div class="dual-table mb-24">
          <div class="table-card">
            <div class="card-header"><span class="card-title">📏 Jarak D⁺ (ke Solusi Ideal Positif)</span></div>
            ${buildTable(dPlusColumns, displayData)}
          </div>
          <div class="table-card">
            <div class="card-header"><span class="card-title">📏 Jarak D⁻ (ke Solusi Ideal Negatif)</span></div>
            ${buildTable(dMinusColumns, displayData)}
          </div>
        </div>

        <div class="table-card">
          <div class="card-header">
            <span class="card-title">🏅 Tabel Nilai Preferensi — diurutkan Descending</span>
          </div>
          ${buildTable(prefColumns, displayData, {
        rowClass: (r) => r.ranking === 1 ? 'rank-1-row' : ''
      })}
          <div id="pagination-preferensi"></div>
        </div>
      `;

      document.getElementById('pagination-preferensi').innerHTML =
        Pagination(res.total, this.perPage, this.page, 'PagePreferensi.goPage');

    } catch (e) {
      resultDiv.innerHTML = InfoBanner('Gagal memuat data preferensi.', 'error');
    }
  },

  goPage(p) {
    PagePreferensi.page = p;
    PagePreferensi.loadHasil();
  }
};
