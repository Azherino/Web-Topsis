// ═══════════════════════════════════════════
// Hasil Perangkingan Page
// ═══════════════════════════════════════════

const PageRanking = {
  data: [],
  page: 1,
  perPage: 25,
  total: 0,
  periode: null,

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    await this.load();
  },

  async load() {
    const search = document.getElementById('search-ranking')?.value ?? '';

    try {
      const res = await API.get('topsis.php', {
        action: 'hasil',
        periode: this.periode,
        page: this.page,
        per_page: this.perPage,
        search
      });

      this.data = res.data;
      this.total = res.total;
      this.render();
    } catch (e) { /* toast shown */ }
  },

  render() {
    const container = document.getElementById('page-ranking');

    if (!this.data || this.data.length === 0) {
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Hasil Perangkingan</h1>
          <p class="page-subtitle">Ranking karyawan berdasarkan nilai preferensi TOPSIS</p>
        </div>
        <div class="flex items-center mb-16" style="gap:12px">
          ${PeriodeSelect(this.periode, "PageRanking.periode = this.value; PageRanking.page = 1; PageRanking.load();", 'filter-periode-rank')}
        </div>
        ${InfoBanner('Belum ada hasil perangkingan untuk periode ini. Lakukan proses kalkulasi terlebih dahulu.', 'warning')}
      `;
      return;
    }

    const winner = this.data[0] && this.data[0].ranking === 1 ? this.data[0] : null;
    const maxPref = winner ? parseFloat(winner.preferensi) : 1;

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Hasil Perangkingan</h1>
        <p class="page-subtitle">Ranking karyawan berdasarkan nilai preferensi TOPSIS — Periode ${this.periode}</p>
      </div>

      ${winner ? WinnerCard(winner) : ''}

      <div class="table-card">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            <div class="search-box">
              <input type="text" id="search-ranking" placeholder="Cari nama karyawan..." oninput="debounce(() => { PageRanking.page = 1; PageRanking.load(); }, 300)()">
            </div>
            ${PeriodeSelect(this.periode, "PageRanking.periode = this.value; PageRanking.page = 1; PageRanking.load();", 'filter-periode-rank')}
          </div>
          <div class="table-toolbar-right">
            <button class="btn btn-outline btn-sm" onclick="PageRanking.exportExcel()">Export Excel</button>
            <button class="btn btn-primary btn-sm" onclick="showPage('laporan')">Cetak Laporan</button>
          </div>
        </div>

        <div id="tabel-ranking"></div>
        <div id="pagination-ranking"></div>
      </div>

      ${winner ? `<div class="interpretasi">
        <strong>📝 Interpretasi Hasil:</strong><br>
        Berdasarkan perhitungan menggunakan metode TOPSIS,
        <strong>${winner.nama} (${winner.kode})</strong> memperoleh nilai preferensi
        tertinggi sebesar <strong>${parseFloat(winner.preferensi).toFixed(4)}</strong>.
        ${winner.nama} direkomendasikan sebagai karyawan terbaik periode
        <strong>${this.periode}</strong> berdasarkan penilaian terhadap 8 kriteria:
        Ketelitian Pemotongan Hewan, Kepatuhan SOP, K3, Kebersihan Kerja,
        Tanggung Jawab, Kedisiplinan, Kehadiran, dan Kerjasama Tim.
      </div>` : ''}
    `;

    document.getElementById('tabel-ranking').innerHTML = buildTable(
      [
        { key: 'ranking', label: 'Rank', align: 'center', render: r => RankBadge(r.ranking) },
        { key: 'kode', label: 'ID', render: r => Badge(r.kode, 'blue') },
        { key: 'nama', label: 'Nama Karyawan', render: r => `<strong>${r.nama}</strong>` },
        { key: 'jabatan', label: 'Jabatan' },
        { key: 'preferensi', label: 'Nilai Preferensi', render: r => ProgressBar(parseFloat(r.preferensi), maxPref) },
        {
          key: 'status_rank', label: 'Status', align: 'center', render: r => {
            if (r.ranking === 1) return Badge('✓ Terbaik', 'green');
            if (r.ranking <= 3) return Badge('Top 3', 'amber');
            if (r.ranking <= 10) return Badge('Top 10', 'blue');
            return Badge('—', 'gray');
          }
        }
      ],
      this.data,
      { rowClass: r => r.ranking === 1 ? 'rank-1-row' : '' }
    );

    document.getElementById('pagination-ranking').innerHTML =
      Pagination(this.total, this.perPage, this.page, 'PageRanking.goPage');
  },

  goPage(p) {
    PageRanking.page = p;
    PageRanking.load();
  },

  exportExcel() {
    const exportData = this.data.map(r => ({
      'Rank': r.ranking,
      'Kode': r.kode,
      'Nama': r.nama,
      'Jabatan': r.jabatan,
      'D+': parseFloat(r.d_plus).toFixed(6),
      'D-': parseFloat(r.d_minus).toFixed(6),
      'Nilai Preferensi': parseFloat(r.preferensi).toFixed(6)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
    XLSX.writeFile(wb, `Ranking_TOPSIS_${this.periode}.xlsx`);
    showToast('Ranking berhasil diexport');
  }
};
