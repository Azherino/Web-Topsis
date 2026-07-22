// ═══════════════════════════════════════════
// Reusable UI Components
// ═══════════════════════════════════════════

function Badge(text, type = 'green') {
  return `<span class="badge badge-${type}">${text}</span>`;
}

function Button(text, type = 'primary', icon = '', attrs = '') {
  return `<button class="btn btn-${type}" ${attrs}>${icon ? icon + ' ' : ''}${text}</button>`;
}

function StatCard(label, value, icon, iconColor = 'green') {
  return `
    <div class="stat-card">
      <div class="stat-icon ${iconColor}">${icon}</div>
      <div>
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>
    </div>`;
}

function buildTable(columns, rows, options = {}) {
  if (!rows || rows.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <p>${options.emptyText || 'Tidak ada data'}</p>
    </div>`;
  }

  const thead = `<thead><tr>${
    columns.map(c => `<th class="${c.align ? 'text-' + c.align : ''}">${c.label}</th>`).join('')
  }</tr></thead>`;

  const tbody = `<tbody>${
    rows.map((row, idx) => {
      const rowClass = options.rowClass ? options.rowClass(row, idx) : '';
      return `<tr class="${rowClass}">${
        columns.map(c => {
          const align = c.align ? ` class="text-${c.align}"` : '';
          return `<td${align}>${c.render ? c.render(row, idx) : (row[c.key] ?? '-')}</td>`;
        }).join('')
      }</tr>`;
    }).join('')
  }</tbody>`;

  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

function Pagination(total, perPage, currentPage, onChangeFn) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return '';

  let html = '<div class="pagination">';

  // Prev
  html += `<button class="page-btn ${currentPage <= 1 ? 'disabled' : ''}"
    onclick="${currentPage > 1 ? onChangeFn + '(' + (currentPage - 1) + ')' : ''}"
    ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;

  // Page numbers
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    html += `<button class="page-btn" onclick="${onChangeFn}(1)">1</button>`;
    if (start > 2) html += `<span class="page-btn disabled">…</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}"
      onclick="${onChangeFn}(${i})">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="page-btn disabled">…</span>`;
    html += `<button class="page-btn" onclick="${onChangeFn}(${totalPages})">${totalPages}</button>`;
  }

  // Next
  html += `<button class="page-btn ${currentPage >= totalPages ? 'disabled' : ''}"
    onclick="${currentPage < totalPages ? onChangeFn + '(' + (currentPage + 1) + ')' : ''}"
    ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;

  html += '</div>';
  return html;
}

function showModal(title, bodyHTML, onConfirm, confirmText = 'Simpan') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-confirm').textContent = confirmText;
  document.getElementById('modal-confirm').onclick = onConfirm;
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

function showToast(message, type = 'success') {
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function WinnerCard(karyawan) {
  return `
    <div class="winner-card">
      <div class="winner-trophy">🏆</div>
      <div class="winner-info">
        <p class="winner-subtitle">Karyawan Terbaik</p>
        <h2>${karyawan.nama}</h2>
        <p>
          ${Badge(karyawan.jabatan, 'green')}
          &nbsp;
          ${Badge('ID: ' + karyawan.kode, 'blue')}
        </p>
      </div>
      <div class="winner-score">
        <div class="score-val">${parseFloat(karyawan.preferensi).toFixed(4)}</div>
        <div class="score-label">Nilai Preferensi Tertinggi</div>
      </div>
    </div>`;
}

function RankBadge(rank) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const cls = rank <= 3 ? `rank-${rank}` : 'rank-other';
  return `<div class="rank-badge ${cls}">${medals[rank] || rank}</div>`;
}

function ProgressBar(value, max = 1) {
  const pct = max > 0 ? (value / max * 100) : 0;
  return `
    <div class="rank-row">
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="progress-value">${parseFloat(value).toFixed(4)}</div>
    </div>`;
}

function LoadingSpinner(text = 'Memuat data...') {
  return `<div class="loading-overlay">
    <div class="spinner spinner-dark"></div>
    <span>${text}</span>
  </div>`;
}

function InfoBanner(message, type = 'info') {
  const icons = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
  return `<div class="info-banner ${type}">
    <span>${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  </div>`;
}

function FormulaBox(formula) {
  return `<div class="formula-box">${formula}</div>`;
}

// ── Dynamic Periode Dropdown ──
function PeriodeSelect(currentPeriode, onChangeExpr, id = 'filter-periode') {
  const periodes = (window.__periodes && window.__periodes.length > 0) ? window.__periodes : [currentPeriode];
  const monthNames = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };
  const options = periodes.map(p => {
    const [year, month] = p.split('-');
    const label = `${monthNames[month] || month} ${year}`;
    return `<option value="${p}" ${p === currentPeriode ? 'selected' : ''}>${label}</option>`;
  }).join('');
  return `<select class="filter-select" id="${id}" onchange="${onChangeExpr}">${options}</select>`;
}

// ── Custom Confirm Dialog ──
function showConfirm(title, message, onConfirm, confirmText = 'Hapus', confirmType = 'danger') {
  showModal(
    title,
    `<div style="text-align:center;padding:8px 0">
      <div style="font-size:48px;margin-bottom:16px;opacity:.8">⚠️</div>
      <p style="font-size:14px;color:var(--text-body);line-height:1.6">${message}</p>
    </div>`,
    onConfirm,
    confirmText
  );
  // Style the confirm button based on type
  const confirmBtn = document.getElementById('modal-confirm');
  if (confirmType === 'danger') {
    confirmBtn.className = 'btn btn-danger';
  }
}

