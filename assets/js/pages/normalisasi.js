// ═══════════════════════════════════════════
// Proses Normalisasi Page
// ═══════════════════════════════════════════

const PageNormalisasi = {
  page: 1,
  perPage: 25,
  periode: null,

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    this.render();
  },

  render() {
    const container = document.getElementById('page-normalisasi');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Proses Normalisasi</h1>
        <p class="page-subtitle">Normalisasi matriks keputusan menggunakan metode vektor</p>
      </div>

      ${FormulaBox('r<sub>ij</sub> = x<sub>ij</sub> / √(Σ x<sub>ij</sub>²)')}

      <div class="flex items-center justify-between mb-16" style="gap:12px;flex-wrap:wrap">
        ${PeriodeSelect(this.periode, "PageNormalisasi.periode = this.value; PageNormalisasi.loadHasil();", 'filter-periode-norm')}
        <button class="btn btn-primary" onclick="PageNormalisasi.proses()" id="btn-proses-norm">
          Proses Normalisasi
        </button>
      </div>

      <div id="normalisasi-result"></div>
    `;

    this.loadHasil();
  },

  async loadHasil() {
    const resultDiv = document.getElementById('normalisasi-result');

    try {
      const res = await API.get('topsis.php', { action: 'normalisasi', periode: this.periode, page: this.page, per_page: this.perPage });

      if (!res.data || res.data.length === 0) {
        resultDiv.innerHTML = InfoBanner('Belum ada hasil normalisasi. Klik "Proses Normalisasi" untuk memulai.', 'info');
        return;
      }

      // Pembagi section
      let pembagiHTML = '<div class="card mb-24"><div class="card-header"><span class="card-title">📊 Nilai Pembagi per Kolom (√ΣC²)</span></div><div class="card-body"><div class="bobot-grid">';
      Object.entries(res.pembagi).forEach(([kode, val]) => {
        pembagiHTML += `<div class="bobot-item"><div class="bobot-kode">${kode}</div><div class="bobot-nama">√Σ${kode}²</div><div class="bobot-value" style="font-size:16px">${val.toFixed(4)}</div></div>`;
      });
      pembagiHTML += '</div></div></div>';

      // Normalized matrix table
      const kriteriaCodes = Object.keys(res.pembagi);
      const columns = [
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama' }
      ];
      kriteriaCodes.forEach(kode => {
        columns.push({
          key: kode,
          label: kode,
          align: 'center',
          render: r => r.r_normal ? `<span class="text-mono">${parseFloat(r.r_normal[kode]).toFixed(4)}</span>` : '-'
        });
      });

      const tableHTML = buildTable(columns, res.data);

      resultDiv.innerHTML = `
        ${InfoBanner('Normalisasi berhasil! Berikut matriks ternormalisasi.', 'success')}
        ${pembagiHTML}
        <div class="table-card">
          <div class="card-header">
            <span class="card-title">📋 Matriks Ternormalisasi (R)</span>
          </div>
          ${tableHTML}
          <div id="pagination-normalisasi"></div>
        </div>
      `;

      document.getElementById('pagination-normalisasi').innerHTML =
        Pagination(res.total, this.perPage, this.page, 'PageNormalisasi.goPage');

    } catch (e) {
      resultDiv.innerHTML = InfoBanner('Belum ada data. Proses normalisasi terlebih dahulu.', 'info');
    }
  },

  async proses() {
    const btn = document.getElementById('btn-proses-norm');
    btn.innerHTML = '<span class="spinner"></span> Memproses...';
    btn.disabled = true;

    try {
      const res = await API.post(`topsis.php?action=hitung&periode=${this.periode}`);
      showToast(`Kalkulasi selesai! ${res.total} karyawan diproses`);
      this.loadHasil();
    } catch (e) {
      /* toast shown */
    } finally {
      btn.innerHTML = 'Proses Normalisasi';
      btn.disabled = false;
    }
  },

  goPage(p) {
    PageNormalisasi.page = p;
    PageNormalisasi.loadHasil();
  }
};
