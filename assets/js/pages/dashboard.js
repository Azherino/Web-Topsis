// ═══════════════════════════════════════════
// Dashboard Page
// ═══════════════════════════════════════════

const PageDashboard = {
  async init() {
    const container = document.getElementById('page-dashboard');
    container.innerHTML = LoadingSpinner();

    try {
      const data = await API.get('dashboard.php');

      // Store periodes globally for other pages
      window.__periodes = (data.periodes && data.periodes.length > 0) ? data.periodes : [data.periodeAktif];
      window.__periodeAktif = data.periodeAktif;

      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Sistem Pendukung Keputusan Karyawan Terbaik — Metode TOPSIS</p>
        </div>

        <div class="stat-row">
          ${StatCard('Total Karyawan Aktif', data.totalKaryawan, '👥', 'green')}
          ${StatCard('Total Kriteria', data.totalKriteria, '📋', 'blue')}
          ${StatCard('Periode Aktif', data.periodeAktif, '📅', 'gold')}
        </div>

        ${data.karyawanTerbaik ? WinnerCard(data.karyawanTerbaik) : ''}

        ${data.totalSudahInput >= data.totalKaryawan
          ? InfoBanner(`Semua ${data.totalKaryawan} karyawan sudah memiliki nilai penilaian pada periode ${data.periodeAktif}. ${data.sudahDihitung ? 'Hasil TOPSIS sudah dihitung.' : 'Silakan lakukan proses perhitungan TOPSIS.'}`, data.sudahDihitung ? 'success' : 'info')
          : InfoBanner(`${data.totalSudahInput} dari ${data.totalKaryawan} karyawan sudah memiliki nilai penilaian pada periode ${data.periodeAktif}. Lengkapi data sebelum melakukan perhitungan.`, 'warning')
        }

        <div class="about-card">
          <h3>📖 Tentang Metode TOPSIS</h3>
          <p style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">
            <strong>TOPSIS</strong> (Technique for Order of Preference by Similarity to Ideal Solution) adalah metode pengambilan keputusan multi-kriteria yang membandingkan setiap alternatif dengan solusi ideal positif dan negatif.
          </p>
          <ol>
            <li><strong>Input Nilai</strong> — Masukkan nilai penilaian 108 karyawan pada 8 kriteria (skala 0–100)</li>
            <li><strong>Normalisasi</strong> — Transformasi matriks keputusan menggunakan normalisasi vektor: r<sub>ij</sub> = x<sub>ij</sub> / √(Σx<sub>ij</sub>²)</li>
            <li><strong>Pembobotan</strong> — Kalikan matriks ternormalisasi dengan bobot kriteria: y<sub>ij</sub> = w<sub>j</sub> × r<sub>ij</sub></li>
            <li><strong>Solusi Ideal</strong> — Tentukan A⁺ (nilai max) dan A⁻ (nilai min) untuk setiap kriteria</li>
            <li><strong>Jarak Euclidean</strong> — Hitung jarak setiap alternatif ke A⁺ (D⁺) dan A⁻ (D⁻)</li>
            <li><strong>Nilai Preferensi</strong> — V<sub>i</sub> = D⁻ / (D⁺ + D⁻), semakin mendekati 1 semakin baik</li>
          </ol>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">⚙️ Kriteria Penilaian RPH</span>
          </div>
          <div class="card-body no-padding" id="dashboard-kriteria-table"></div>
        </div>
      `;

      // Load kriteria table
      const krRes = await API.get('kriteria.php');
      document.getElementById('dashboard-kriteria-table').innerHTML = buildTable(
        [
          { key: 'kode', label: 'Kode', render: r => Badge(r.kode, 'blue') },
          { key: 'nama', label: 'Nama Kriteria' },
          { key: 'bobot', label: 'Bobot', align: 'center', render: r => `<strong>${parseFloat(r.bobot).toFixed(2)}</strong>` },
          { key: 'jenis', label: 'Jenis', align: 'center', render: r => Badge(r.jenis === 'benefit' ? 'Benefit ↑' : 'Cost ↓', r.jenis === 'benefit' ? 'green' : 'red') }
        ],
        krRes.data
      );

    } catch (e) {
      container.innerHTML = InfoBanner('Gagal memuat dashboard: ' + e.message, 'error');
    }
  }
};
