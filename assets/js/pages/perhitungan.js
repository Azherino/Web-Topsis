// ═══════════════════════════════════════════
// Perhitungan TOPSIS Page
// ═══════════════════════════════════════════

const PagePerhitungan = {
  page: 1,
  perPage: 25,
  periode: null,

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    this.render();
  },

  render() {
    const container = document.getElementById('page-perhitungan');
    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Perhitungan TOPSIS</h1>
        <p class="page-subtitle">Matriks terbobot dan solusi ideal positif/negatif</p>
      </div>

      <div class="flex items-center justify-between mb-16" style="gap:12px;flex-wrap:wrap">
        ${PeriodeSelect(this.periode, "PagePerhitungan.periode = this.value; PagePerhitungan.loadHasil();", 'filter-periode-topsis')}
      </div>

      <div id="topsis-result">${LoadingSpinner()}</div>
    `;

    this.loadHasil();
  },

  async loadHasil() {
    const resultDiv = document.getElementById('topsis-result');

    try {
      const krRes = await API.get('kriteria.php');
      const res = await API.get('topsis.php', { action: 'hasil', periode: this.periode, page: this.page, per_page: this.perPage });

      if (!res.data || res.data.length === 0) {
        resultDiv.innerHTML = InfoBanner('Belum ada hasil perhitungan. Lakukan proses di halaman Normalisasi terlebih dahulu.', 'warning');
        return;
      }

      // 1. Bobot grid
      let bobotHTML = '<div class="card mb-24"><div class="card-header"><span class="card-title">📊 Bobot Kriteria (Wj)</span></div><div class="card-body"><div class="bobot-grid">';
      krRes.data.forEach(k => {
        bobotHTML += `<div class="bobot-item"><div class="bobot-kode">${k.kode}</div><div class="bobot-nama">${k.nama}</div><div class="bobot-value">${parseFloat(k.bobot).toFixed(2)}</div></div>`;
      });
      bobotHTML += '</div></div></div>';

      // 2. Weighted matrix table
      const kriteriaCodes = krRes.data.map(k => k.kode);
      const columns = [
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama' }
      ];
      kriteriaCodes.forEach(kode => {
        columns.push({
          key: kode,
          label: kode,
          align: 'center',
          render: r => r.y_bobot ? `<span class="text-mono">${parseFloat(r.y_bobot[kode]).toFixed(4)}</span>` : '-'
        });
      });

      const displayData = res.data;

      // 3. Ideal solutions
      let aPlusHTML = '<table><thead><tr><th>Kode</th><th>Nama Kriteria</th><th>Jenis</th><th class="text-center">Nilai A⁺</th></tr></thead><tbody>';
      let aMinusHTML = '<table><thead><tr><th>Kode</th><th>Nama Kriteria</th><th>Jenis</th><th class="text-center">Nilai A⁻</th></tr></thead><tbody>';

      krRes.data.forEach(k => {
        aPlusHTML += `<tr><td>${Badge(k.kode, 'blue')}</td><td>${k.nama}</td><td>${Badge(k.jenis === 'benefit' ? 'Benefit' : 'Cost', k.jenis === 'benefit' ? 'green' : 'red')}</td><td class="text-center"><strong class="text-green text-mono">${res.aPlus[k.kode] ? parseFloat(res.aPlus[k.kode]).toFixed(6) : '-'}</strong></td></tr>`;
        aMinusHTML += `<tr><td>${Badge(k.kode, 'blue')}</td><td>${k.nama}</td><td>${Badge(k.jenis === 'benefit' ? 'Benefit' : 'Cost', k.jenis === 'benefit' ? 'green' : 'red')}</td><td class="text-center"><strong class="text-red text-mono">${res.aMinus[k.kode] ? parseFloat(res.aMinus[k.kode]).toFixed(6) : '-'}</strong></td></tr>`;
      });

      aPlusHTML += '</tbody></table>';
      aMinusHTML += '</tbody></table>';

      resultDiv.innerHTML = `
        ${FormulaBox('y<sub>ij</sub> = w<sub>j</sub> × r<sub>ij</sub>')}
        ${bobotHTML}

        <div class="table-card mb-24">
          <div class="card-header">
            <span class="card-title">📋 Matriks Ternormalisasi Terbobot (Y)</span>
          </div>
          ${buildTable(columns, displayData)}
          <div id="pagination-topsis"></div>
        </div>

        <div class="dual-table">
          <div class="table-card">
            <div class="card-header">
              <span class="card-title">✅ Solusi Ideal Positif (A⁺)</span>
            </div>
            <div class="table-wrap">${aPlusHTML}</div>
          </div>
          <div class="table-card">
            <div class="card-header">
              <span class="card-title">❌ Solusi Ideal Negatif (A⁻)</span>
            </div>
            <div class="table-wrap">${aMinusHTML}</div>
          </div>
        </div>
      `;

      document.getElementById('pagination-topsis').innerHTML =
        Pagination(res.total, this.perPage, this.page, 'PagePerhitungan.goPage');

    } catch (e) {
      resultDiv.innerHTML = InfoBanner('Gagal memuat data perhitungan.', 'error');
    }
  },

  goPage(p) {
    PagePerhitungan.page = p;
    PagePerhitungan.loadHasil();
  }
};
