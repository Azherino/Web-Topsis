// ═══════════════════════════════════════════
// Cetak Laporan Page — Multi-Type Reports
// ═══════════════════════════════════════════

const PageLaporan = {
  // State
  reportType: 'ranking',   // 'karyawan' | 'kriteria' | 'penilaian' | 'ranking'
  periode: null,
  range: 'all',

  // Cached data
  dataRanking: [],
  dataKaryawan: [],
  dataKriteria: [],
  dataPenilaian: [],
  penilaianKriteria: [],

  async init() {
    if (!this.periode) this.periode = window.__periodeAktif || new Date().toISOString().slice(0, 7);
    await this.loadAll();
  },

  async loadAll() {
    try {
      // Load all data sources in parallel
      const [rankRes, karyawanRes, kriteriaRes, penilaianRes] = await Promise.all([
        API.get('topsis.php', { action: 'hasil', periode: this.periode, page: 1, per_page: 200 }).catch(() => ({ data: [] })),
        API.get('karyawan.php', { page: 1, per_page: 200 }).catch(() => ({ data: [] })),
        API.get('kriteria.php').catch(() => ({ data: [] })),
        API.get('penilaian.php', { periode: this.periode, page: 1, per_page: 200 }).catch(() => ({ data: [], kriteria: [] }))
      ]);

      this.dataRanking = rankRes.data || [];
      this.dataKaryawan = karyawanRes.data || [];
      this.dataKriteria = kriteriaRes.data || [];
      this.dataPenilaian = penilaianRes.data || [];
      this.penilaianKriteria = penilaianRes.kriteria || kriteriaRes.data || [];
      this.render();
    } catch (e) { /* toast shown */ }
  },

  // ═══════════ MAIN RENDER ═══════════
  render() {
    const container = document.getElementById('page-laporan');

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Cetak Laporan</h1>
        <p class="page-subtitle">Pilih jenis laporan, preview, dan generate PDF</p>
      </div>

      <div class="laporan-layout">
        <div class="laporan-preview" id="laporan-preview">
          ${this.renderPreview()}
        </div>

        <div>
          <div class="card mb-24">
            <div class="card-header"><span class="card-title">📄 Jenis Laporan</span></div>
            <div class="card-body">
              <div class="laporan-type-grid">
                ${this.renderTypeBtn('karyawan', '👥', 'Data Karyawan')}
                ${this.renderTypeBtn('kriteria', '📋', 'Kriteria & Bobot')}
                ${this.renderTypeBtn('penilaian', '✏️', 'Matriks Penilaian')}
                ${this.renderTypeBtn('ranking', '🏆', 'Hasil Perankingan')}
              </div>
            </div>
          </div>

          <div class="card mb-24">
            <div class="card-header"><span class="card-title">⚙️ Pengaturan Laporan</span></div>
            <div class="card-body">
              ${this.reportType !== 'kriteria' ? `
              <div class="form-group">
                <label class="form-label">Periode</label>
                ${PeriodeSelect(this.periode, "PageLaporan.periode = this.value; PageLaporan.loadAll()", 'filter-periode-laporan')}
              </div>` : ''}

              ${this.reportType === 'ranking' ? `
              <div class="form-group">
                <label class="form-label">Tampilkan</label>
                <select class="form-select" onchange="PageLaporan.range = this.value; PageLaporan.render()">
                  <option value="all" ${this.range === 'all' ? 'selected' : ''}>Semua Karyawan</option>
                  <option value="10" ${this.range === '10' ? 'selected' : ''}>Top 10</option>
                  <option value="20" ${this.range === '20' ? 'selected' : ''}>Top 20</option>
                  <option value="50" ${this.range === '50' ? 'selected' : ''}>Top 50</option>
                </select>
              </div>` : ''}

              <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="PageLaporan.cetakPDF()">
                Generate PDF
              </button>
            </div>
          </div>

          <div class="info-banner info">
            <span>ℹ</span>
            <span>File PDF akan diunduh otomatis setelah klik Generate</span>
          </div>
        </div>
      </div>
    `;
  },

  renderTypeBtn(type, icon, label) {
    return `<div class="laporan-type-btn ${this.reportType === type ? 'active' : ''}"
      onclick="PageLaporan.reportType='${type}'; PageLaporan.render()">
      <span class="type-icon">${icon}</span>
      <span class="type-label">${label}</span>
    </div>`;
  },

  // ═══════════ PREVIEW RENDERERS ═══════════
  renderPreview() {
    switch (this.reportType) {
      case 'karyawan': return this.previewKaryawan();
      case 'kriteria': return this.previewKriteria();
      case 'penilaian': return this.previewPenilaian();
      case 'ranking': return this.previewRanking();
      default: return this.previewRanking();
    }
  },

  // ── Preview: Data Karyawan ──
  previewKaryawan() {
    if (!this.dataKaryawan.length) return InfoBanner('Belum ada data karyawan.', 'warning');

    return `
      <div class="report-preview-header">
        <img src="assets/logo.png" alt="Logo RPH" class="report-logo">
        <div class="report-header-text">
          <h2>LAPORAN DATA KARYAWAN</h2>
          <p class="subtitle">Rumah Pemotongan Hewan (RPH)</p>
        </div>
      </div>
      <table style="width:100%;margin:16px 0;font-size:13px">
        <tr><td style="width:120px"><strong>Tanggal Cetak</strong></td><td>: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td><strong>Total Karyawan</strong></td><td>: ${this.dataKaryawan.length} Orang</td></tr>
      </table>
      <hr>
      ${buildTable([
      { key: 'no', label: 'No', align: 'center', render: (r, i) => i + 1 },
      { key: 'kode', label: 'ID Karyawan', render: r => r.kode },
      { key: 'nama', label: 'Nama Karyawan', render: r => r.nama },
      { key: 'jabatan', label: 'Jabatan', render: r => r.jabatan || '-' },
      { key: 'status', label: 'Status', align: 'center', render: r => r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif' }
    ], this.dataKaryawan)}
      ${this.renderSignatures()}
    `;
  },

  // ── Preview: Kriteria & Bobot ──
  previewKriteria() {
    if (!this.dataKriteria.length) return InfoBanner('Belum ada data kriteria.', 'warning');

    const totalBobot = this.dataKriteria.reduce((s, k) => s + parseFloat(k.bobot), 0);

    return `
      <div class="report-preview-header">
        <img src="assets/logo.png" alt="Logo RPH" class="report-logo">
        <div class="report-header-text">
          <h2>LAPORAN DATA KRITERIA DAN BOBOT</h2>
          <p class="subtitle">Rumah Pemotongan Hewan (RPH)</p>
        </div>
      </div>
      <table style="width:100%;margin:16px 0;font-size:13px">
        <tr><td style="width:120px"><strong>Tanggal Cetak</strong></td><td>: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td><strong>Metode</strong></td><td>: TOPSIS</td></tr>
        <tr><td><strong>Total Kriteria</strong></td><td>: ${this.dataKriteria.length}</td></tr>
        <tr><td><strong>Total Bobot</strong></td><td>: ${totalBobot.toFixed(2)}</td></tr>
      </table>
      <hr>
      ${buildTable([
      { key: 'no', label: 'No', align: 'center', render: (r, i) => i + 1 },
      { key: 'kode', label: 'Kode Kriteria', render: r => r.kode },
      { key: 'nama', label: 'Nama Kriteria', render: r => r.nama },
      { key: 'bobot', label: 'Bobot', align: 'center', render: r => parseFloat(r.bobot).toFixed(2) },
      { key: 'jenis', label: 'Jenis', align: 'center', render: r => r.jenis === 'benefit' ? 'Benefit' : 'Cost' }
    ], this.dataKriteria)}
      <div style="margin-top:16px;font-size:13px;line-height:1.8">
        <strong>Keterangan:</strong><br>
        • <strong>Benefit</strong>: Semakin besar nilai, semakin baik.<br>
        • <strong>Cost</strong>: Semakin kecil nilai, semakin baik.<br>
        • Total bobot seluruh kriteria harus sama dengan <strong>1.00</strong>.
      </div>
      ${this.renderSignatures()}
    `;
  },

  // ── Preview: Matriks Penilaian Awal ──
  previewPenilaian() {
    if (!this.dataPenilaian.length) return InfoBanner('Belum ada data penilaian untuk periode ini.', 'warning');

    const columns = [
      { key: 'no', label: 'No', align: 'center', render: (r, i) => i + 1 },
      { key: 'kode', label: 'ID', render: r => r.kode },
      { key: 'nama', label: 'Nama Karyawan', render: r => r.nama }
    ];
    this.penilaianKriteria.forEach(kr => {
      columns.push({
        key: kr.kode,
        label: kr.kode,
        align: 'center',
        render: r => r.nilai[kr.kode] !== null && r.nilai[kr.kode] !== undefined ? r.nilai[kr.kode] : '—'
      });
    });

    return `
      <div class="report-preview-header">
        <img src="assets/logo.png" alt="Logo RPH" class="report-logo">
        <div class="report-header-text">
          <h2>LAPORAN MATRIKS PENILAIAN KARYAWAN</h2>
          <p class="subtitle">Rumah Pemotongan Hewan (RPH)</p>
        </div>
      </div>
      <table style="width:100%;margin:16px 0;font-size:13px">
        <tr><td style="width:120px"><strong>Periode</strong></td><td>: ${this.periode}</td></tr>
        <tr><td><strong>Skala Nilai</strong></td><td>: 0 – 100</td></tr>
        <tr><td><strong>Total Karyawan</strong></td><td>: ${this.dataPenilaian.length} Orang</td></tr>
        <tr><td><strong>Total Kriteria</strong></td><td>: ${this.penilaianKriteria.length}</td></tr>
      </table>
      <hr>
      ${buildTable(columns, this.dataPenilaian)}
      <div style="margin-top:16px;font-size:13px;line-height:1.8">
        <strong>Keterangan Kriteria:</strong><br>
        ${this.penilaianKriteria.map(kr => `• <strong>${kr.kode}</strong>: ${kr.nama}`).join('<br>')}
      </div>
      ${this.renderSignatures()}
    `;
  },

  // ── Preview: Hasil Perankingan (original) ──
  previewRanking() {
    if (!this.dataRanking.length) return InfoBanner('Belum ada data hasil. Lakukan proses kalkulasi terlebih dahulu.', 'warning');

    const filteredData = this.range === 'all' ? this.dataRanking : this.dataRanking.slice(0, parseInt(this.range));
    const winner = this.dataRanking[0];

    return `
      <div class="report-preview-header">
        <img src="assets/logo.png" alt="Logo RPH" class="report-logo">
        <div class="report-header-text">
          <h2>LAPORAN HASIL PENILAIAN KARYAWAN</h2>
          <p class="subtitle">Rumah Pemotongan Hewan (RPH)</p>
        </div>
      </div>
      <table style="width:100%;margin:16px 0;font-size:13px">
        <tr><td style="width:120px"><strong>Periode</strong></td><td>: ${this.periode}</td></tr>
        <tr><td><strong>Metode</strong></td><td>: TOPSIS</td></tr>
        <tr><td><strong>Total Data</strong></td><td>: ${this.dataRanking.length} Karyawan</td></tr>
        <tr><td><strong>Tampilkan</strong></td><td>: ${this.range === 'all' ? 'Semua' : 'Top ' + this.range}</td></tr>
      </table>
      <hr>
      ${buildTable([
      { key: 'ranking', label: 'Rank', align: 'center', render: r => r.ranking },
      { key: 'kode', label: 'ID', render: r => r.kode },
      { key: 'nama', label: 'Nama Karyawan', render: r => r.nama },
      { key: 'jabatan', label: 'Jabatan', render: r => r.jabatan },
      { key: 'preferensi', label: 'Nilai Preferensi', align: 'center', render: r => parseFloat(r.preferensi).toFixed(4) }
    ], filteredData)}
      <div style="margin-top:24px;font-size:13px;line-height:1.8">
        <strong>Kesimpulan:</strong><br>
        ${winner.nama} (${winner.kode}) memperoleh nilai preferensi tertinggi sebesar
        ${parseFloat(winner.preferensi).toFixed(4)} dan direkomendasikan sebagai
        karyawan terbaik periode ${this.periode}.
      </div>
      ${this.renderSignatures()}
    `;
  },

  renderSignatures() {
    return `
      <div style="display:flex;justify-content:space-between;margin-top:60px;font-size:12px;text-align:center">
        <div>
          <p>Mengetahui,</p>
          <p style="margin-top:60px"><strong>________________</strong></p>
          <p>Manager RPH</p>
        </div>
        <div>
          <p>Dibuat oleh,</p>
          <p style="margin-top:60px"><strong>________________</strong></p>
          <p>Administrator</p>
        </div>
      </div>
    `;
  },

  loadLogo() {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'assets/logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error('Failed to load logo');
        resolve(null);
      };
    });
  },

  // ═══════════ PDF GENERATORS ═══════════
  async cetakPDF() {
    const logoImg = await this.loadLogo();
    this.logoImg = logoImg;
    switch (this.reportType) {
      case 'karyawan': return this.pdfKaryawan();
      case 'kriteria': return this.pdfKriteria();
      case 'penilaian': return this.pdfPenilaian();
      case 'ranking': return this.pdfRanking();
    }
  },

  getJsPDF() {
    let jsPDFClass = null;
    if (window.jspdf && window.jspdf.jsPDF) {
      jsPDFClass = window.jspdf.jsPDF;
    } else if (window.jsPDF) {
      jsPDFClass = window.jsPDF;
    }
    if (!jsPDFClass) {
      showToast('Gagal memuat library PDF (jsPDF). Periksa koneksi internet Anda.', 'error');
      return null;
    }
    return jsPDFClass;
  },

  downloadPDF(doc, filename) {
    try {
      const dataUri = doc.output('datauristring');
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUri;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
      showToast('PDF berhasil digenerate');
    } catch (err) {
      doc.save(filename);
      showToast('PDF berhasil digenerate');
    }
  },

  addPDFHeader(doc, title) {
    if (this.logoImg) {
      try {
        doc.addImage(this.logoImg, 'PNG', 15, 9, 16, 16);
      } catch (e) {
        console.error('Error drawing logo to PDF', e);
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 35, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Rumah Pemotongan Hewan (RPH)', 35, 24);
      doc.setDrawColor(45, 106, 79);
      doc.setLineWidth(0.5);
      doc.line(15, 28, 195, 28);
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Rumah Pemotongan Hewan (RPH)', 105, 28, { align: 'center' });
      doc.setDrawColor(45, 106, 79);
      doc.setLineWidth(0.5);
      doc.line(15, 32, 195, 32);
    }
  },

  addPDFSignatures(doc, startY) {
    const sigY = startY;
    doc.setFontSize(9);
    doc.text('Mengetahui,', 40, sigY, { align: 'center' });
    doc.text('________________', 40, sigY + 30, { align: 'center' });
    doc.text('Manager RPH', 40, sigY + 36, { align: 'center' });
    doc.text('Dibuat oleh,', 160, sigY, { align: 'center' });
    doc.text('________________', 160, sigY + 30, { align: 'center' });
    doc.text('Administrator', 160, sigY + 36, { align: 'center' });
  },

  // ── PDF: Data Karyawan ──
  pdfKaryawan() {
    const JsPDF = this.getJsPDF();
    if (!JsPDF) return;
    if (!this.dataKaryawan.length) { showToast('Tidak ada data karyawan', 'error'); return; }

    const doc = new JsPDF();
    this.addPDFHeader(doc, 'LAPORAN DATA KARYAWAN');

    const isLogo = !!this.logoImg;
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 15, isLogo ? 36 : 40);
    doc.text(`Total Karyawan: ${this.dataKaryawan.length} Orang`, 15, isLogo ? 42 : 46);

    doc.autoTable({
      startY: isLogo ? 50 : 54,
      head: [['No', 'ID Karyawan', 'Nama Karyawan', 'Jabatan', 'Status']],
      body: this.dataKaryawan.map((r, i) => [
        i + 1, r.kode, r.nama, r.jabatan || '-', r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [45, 106, 79] },
      styles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 } }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 20 : 120;
    this.addPDFSignatures(doc, finalY);
    this.downloadPDF(doc, `Laporan_Data_Karyawan.pdf`);
  },

  // ── PDF: Kriteria & Bobot ──
  pdfKriteria() {
    const JsPDF = this.getJsPDF();
    if (!JsPDF) return;
    if (!this.dataKriteria.length) { showToast('Tidak ada data kriteria', 'error'); return; }

    const doc = new JsPDF();
    const totalBobot = this.dataKriteria.reduce((s, k) => s + parseFloat(k.bobot), 0);

    this.addPDFHeader(doc, 'LAPORAN DATA KRITERIA DAN BOBOT');

    const isLogo = !!this.logoImg;
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak  : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 15, isLogo ? 36 : 40);
    doc.text(`Metode         : TOPSIS`, 15, isLogo ? 42 : 46);
    doc.text(`Total Kriteria : ${this.dataKriteria.length}`, 15, isLogo ? 48 : 52);
    doc.text(`Total Bobot    : ${totalBobot.toFixed(2)}`, 15, isLogo ? 54 : 58);

    doc.autoTable({
      startY: isLogo ? 60 : 66,
      head: [['No', 'Kode', 'Nama Kriteria', 'Bobot', 'Jenis']],
      body: this.dataKriteria.map((r, i) => [
        i + 1, r.kode, r.nama, parseFloat(r.bobot).toFixed(2), r.jenis === 'benefit' ? 'Benefit' : 'Cost'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [45, 106, 79] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 20 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'center', cellWidth: 22 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 120;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Keterangan:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text('• Benefit: Semakin besar nilai, semakin baik.', 15, finalY + 6);
    doc.text('• Cost: Semakin kecil nilai, semakin baik.', 15, finalY + 12);
    doc.text('• Total bobot seluruh kriteria harus sama dengan 1.00.', 15, finalY + 18);

    this.addPDFSignatures(doc, finalY + 34);
    this.downloadPDF(doc, `Laporan_Kriteria_Bobot.pdf`);
  },

  // ── PDF: Matriks Penilaian Awal ──
  pdfPenilaian() {
    const JsPDF = this.getJsPDF();
    if (!JsPDF) return;
    if (!this.dataPenilaian.length) { showToast('Tidak ada data penilaian untuk periode ini', 'error'); return; }

    const doc = new JsPDF('l'); // landscape for wide matrix table

    const isLogo = !!this.logoImg;
    if (isLogo) {
      try {
        doc.addImage(this.logoImg, 'PNG', 15, 9, 16, 16);
      } catch (e) {
        console.error('Error drawing logo to PDF', e);
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN MATRIKS PENILAIAN KARYAWAN', 35, 17);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Rumah Pemotongan Hewan (RPH)', 35, 24);
      doc.setDrawColor(45, 106, 79);
      doc.setLineWidth(0.5);
      doc.line(15, 28, 282, 28);
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN MATRIKS PENILAIAN KARYAWAN', 148, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Rumah Pemotongan Hewan (RPH)', 148, 26, { align: 'center' });
      doc.setDrawColor(45, 106, 79);
      doc.setLineWidth(0.5);
      doc.line(15, 30, 282, 30);
    }

    const startTextY = isLogo ? 34 : 38;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode         : ${this.periode}`, 15, startTextY);
    doc.text(`Skala Nilai     : 0 – 100`, 15, startTextY + 6);
    doc.text(`Total Karyawan  : ${this.dataPenilaian.length} Orang`, 15, startTextY + 12);
    doc.text(`Total Kriteria  : ${this.penilaianKriteria.length}`, 15, startTextY + 18);

    const kriteriaKodes = this.penilaianKriteria.map(kr => kr.kode);
    const head = ['No', 'ID', 'Nama Karyawan', ...kriteriaKodes];

    doc.autoTable({
      startY: isLogo ? 60 : 64,
      head: [head],
      body: this.dataPenilaian.map((r, i) => {
        const row = [i + 1, r.kode, r.nama];
        kriteriaKodes.forEach(kode => {
          row.push(r.nilai[kode] !== null && r.nilai[kode] !== undefined ? r.nilai[kode] : '—');
        });
        return row;
      }),
      theme: 'striped',
      headStyles: { fillColor: [45, 106, 79], fontSize: 7 },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 18 }
      }
    });

    // Keterangan kriteria
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 120;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Keterangan Kriteria:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    this.penilaianKriteria.forEach((kr, i) => {
      doc.text(`• ${kr.kode}: ${kr.nama}`, 15, finalY + 5 + (i * 5));
    });

    const sigY = finalY + 5 + (this.penilaianKriteria.length * 5) + 16;
    doc.setFontSize(9);
    doc.text('Mengetahui,', 60, sigY, { align: 'center' });
    doc.text('________________', 60, sigY + 30, { align: 'center' });
    doc.text('Manager RPH', 60, sigY + 36, { align: 'center' });
    doc.text('Dibuat oleh,', 230, sigY, { align: 'center' });
    doc.text('________________', 230, sigY + 30, { align: 'center' });
    doc.text('Administrator', 230, sigY + 36, { align: 'center' });

    this.downloadPDF(doc, `Laporan_Penilaian_${this.periode}.pdf`);
  },

  // ── PDF: Hasil Perankingan (preserved original) ──
  pdfRanking() {
    const JsPDF = this.getJsPDF();
    if (!JsPDF) return;
    if (!this.dataRanking.length) { showToast('Tidak ada data hasil perankingan', 'error'); return; }

    const doc = new JsPDF();
    const filteredData = this.range === 'all' ? this.dataRanking : this.dataRanking.slice(0, parseInt(this.range));
    const winner = this.dataRanking[0];

    this.addPDFHeader(doc, 'LAPORAN HASIL PENILAIAN KARYAWAN');

    const isLogo = !!this.logoImg;
    doc.setFontSize(10);
    doc.text(`Periode    : ${this.periode}`, 15, isLogo ? 36 : 40);
    doc.text(`Metode     : TOPSIS`, 15, isLogo ? 42 : 46);
    doc.text(`Total Data : ${this.dataRanking.length} Karyawan`, 15, isLogo ? 48 : 52);

    doc.autoTable({
      startY: isLogo ? 54 : 60,
      head: [['Rank', 'ID', 'Nama Karyawan', 'Jabatan', 'Nilai Preferensi']],
      body: filteredData.map(r => [
        r.ranking, r.kode, r.nama, r.jabatan, parseFloat(r.preferensi).toFixed(4)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [45, 106, 79] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 20 },
        4: { halign: 'center', cellWidth: 30 }
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 12 : 120;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Kesimpulan:', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${winner.nama} (${winner.kode}) memperoleh nilai preferensi tertinggi`, 15, finalY + 8);
    doc.text(`sebesar ${parseFloat(winner.preferensi).toFixed(4)} dan direkomendasikan sebagai`, 15, finalY + 14);
    doc.text(`karyawan terbaik periode ${this.periode}.`, 15, finalY + 20);

    this.addPDFSignatures(doc, finalY + 40);
    this.downloadPDF(doc, `Laporan_SPK_${this.periode}.pdf`);
  }
};
