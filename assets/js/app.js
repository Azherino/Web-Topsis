// ═══════════════════════════════════════════
// App.js — Entry Point, Routing, Global Events
// ═══════════════════════════════════════════

// Page modules registry
const pages = {
  dashboard:    PageDashboard,
  user:         PageUser,
  karyawan:     PageKaryawan,
  kriteria:     PageKriteria,
  'input-nilai': PageInputNilai,
  normalisasi:  PageNormalisasi,
  perhitungan:  PagePerhitungan,
  preferensi:   PagePreferensi,
  ranking:      PageRanking,
  laporan:      PageLaporan
};

// Current active page
let currentPage = 'dashboard';

// Show page and init module
function showPage(pageId, navEl) {
  if (!window.__isAuthenticated) return;

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById('page-' + pageId);
  if (pageEl) {
    pageEl.classList.add('active');
  }

  // Highlight nav item
  if (navEl) {
    navEl.classList.add('active');
  } else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('data-page') === pageId) {
        n.classList.add('active');
      }
    });
  }

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard',
    user: 'Kelola Data User',
    karyawan: 'Kelola Data Karyawan',
    kriteria: 'Kelola Data Kriteria',
    'input-nilai': 'Input Nilai Penilaian',
    normalisasi: 'Proses Normalisasi',
    perhitungan: 'Perhitungan TOPSIS',
    preferensi: 'Nilai Preferensi',
    ranking: 'Hasil Perangkingan',
    laporan: 'Cetak Laporan'
  };
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) topbarTitle.textContent = titles[pageId] || pageId;

  // Init page module
  currentPage = pageId;
  if (pages[pageId]) {
    pages[pageId].init();
  }

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Update hash
  location.hash = pageId;
}

// Debounce utility
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ── Auth Handling UI functions ──
function showApp() {
  document.getElementById('login-wrapper').style.display = 'none';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('main').style.display = 'block';
}

function showLogin() {
  document.getElementById('login-wrapper').style.display = 'flex';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('main').style.display = 'none';
}

// ── Auth Actions ──
async function handleLogin(event) {
  event.preventDefault();
  const usernameEl = document.getElementById('login-username');
  const passwordEl = document.getElementById('login-password');
  const btn = document.getElementById('login-btn');

  btn.innerHTML = '<span class="spinner"></span> Memproses...';
  btn.disabled = true;

  try {
    const res = await API.post('auth.php?action=login', {
      username: usernameEl.value,
      password: passwordEl.value
    });

    showToast(res.message || 'Login berhasil');
    window.__isAuthenticated = true;

    // Load period data
    await loadPeriodData();

    // Show app and direct to initial page
    showApp();
    const hash = location.hash.replace('#', '') || 'dashboard';
    showPage(hash);

    // Reset form
    usernameEl.value = '';
    passwordEl.value = '';
  } catch (e) {
    // API class already handles showToast on throw, no need to showToast again
  } finally {
    btn.innerHTML = 'Masuk ke Sistem';
    btn.disabled = false;
  }
}

async function handleLogout() {
  showConfirm(
    'Keluar Sistem',
    'Apakah Anda yakin ingin keluar dari sistem SPK?',
    async () => {
      try {
        await API.post('auth.php?action=logout');
        window.__isAuthenticated = false;
        closeModal();
        showToast('Anda telah keluar dari sistem');
        showLogin();
        location.hash = '';
      } catch (e) {}
    },
    'Keluar',
    'danger'
  );
}

async function loadPeriodData() {
  try {
    const data = await API.get('dashboard.php');
    window.__periodes = (data.periodes && data.periodes.length > 0) ? data.periodes : [data.periodeAktif];
    window.__periodeAktif = data.periodeAktif;
  } catch (e) {
    window.__periodes = [new Date().toISOString().slice(0, 7)];
    window.__periodeAktif = window.__periodes[0];
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  // Sidebar nav click events
  document.querySelectorAll('.nav-item').forEach(item => {
    // Avoid double trigger on logout
    if (item.id === 'nav-logout') return;
    
    item.addEventListener('click', function () {
      const page = this.getAttribute('data-page');
      if (page) showPage(page, this);
    });
  });

  // Logout listener
  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  // Close modal on overlay click
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Check Session on Page Load
  try {
    const session = await API.get('auth.php?action=check');
    if (session.authenticated) {
      window.__isAuthenticated = true;
      await loadPeriodData();
      showApp();
      const hash = location.hash.replace('#', '') || 'dashboard';
      showPage(hash);
    } else {
      window.__isAuthenticated = false;
      showLogin();
    }
  } catch (e) {
    window.__isAuthenticated = false;
    showLogin();
  }
});

// Listen for hash changes
window.addEventListener('hashchange', () => {
  if (!window.__isAuthenticated) return;
  const hash = location.hash.replace('#', '') || 'dashboard';
  if (hash !== currentPage) {
    showPage(hash);
  }
});
