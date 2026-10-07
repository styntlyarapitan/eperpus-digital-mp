// ============================================================
// KONFIGURASI DATABASE GOOGLE SHEETS
// Isi dengan URL Web App dari Google Apps Script (berakhiran /exec).
// Lihat README.txt untuk langkah pembuatannya.
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwQl1ZGuRSU9ZWMFoydemvqUHzvTufxQLfY8AjIFGb7Yywu-afl9YNED1vIOOQULC2H/exec';

// Interval pengambilan data terbaru dari Google Sheets (milidetik)
const SYNC_INTERVAL = 15000;

// ============================================================
// STATE & PENYIMPANAN
// ============================================================
let bukuData = [];
let siswaData = [];
let transaksiData = [];

const USE_SHEETS = API_URL.trim() !== '';

// Cache lokal hanya untuk tampilan cepat saat dibuka; sumber utama = Google Sheets
function loadCache() {
    try {
        bukuData = JSON.parse(localStorage.getItem('perpus_buku')) || [];
        siswaData = JSON.parse(localStorage.getItem('perpus_siswa')) || [];
        transaksiData = JSON.parse(localStorage.getItem('perpus_transaksi')) || [];
    } catch (e) {
        bukuData = []; siswaData = []; transaksiData = [];
    }
}

function saveCache() {
    localStorage.setItem('perpus_buku', JSON.stringify(bukuData));
    localStorage.setItem('perpus_siswa', JSON.stringify(siswaData));
    localStorage.setItem('perpus_transaksi', JSON.stringify(transaksiData));
}

// Jumlah buku yang sedang dipinjam dihitung dari transaksi,
// supaya selalu konsisten di semua perangkat.
function recomputeDipinjam() {
    bukuData.forEach(b => {
        b.dipinjam = transaksiData.filter(t => t.bukuId === b.id && t.status === 'Dipinjam').length;
    });
}

function esc(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function newId(prefix) {
    return (prefix || '') + Date.now().toString(36).toUpperCase() +
        Math.floor(Math.random() * 1296).toString(36).toUpperCase();
}

// ============================================================
// SINKRONISASI DENGAN GOOGLE SHEETS
// ============================================================
let pendingWrites = 0;
let lastSyncOk = false;

function setSyncStatus(state, text) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.className = 'sync-status sync-' + state;
    el.innerHTML = {
        ok: '<i class="fa-solid fa-circle-check"></i> ',
        loading: '<i class="fa-solid fa-rotate fa-spin"></i> ',
        error: '<i class="fa-solid fa-triangle-exclamation"></i> ',
        local: '<i class="fa-solid fa-hard-drive"></i> '
    }[state] + esc(text);
}

function applyServerData(data) {
    bukuData = data.buku || [];
    siswaData = data.siswa || [];
    transaksiData = (data.transaksi || []).slice().sort((a, b) => {
        // terbaru di atas (tanggal lalu id sebagai pembanding)
        if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? 1 : -1;
        return a.id < b.id ? 1 : -1;
    });
    recomputeDipinjam();
    saveCache();
}

async function fetchFromSheets(showLoading) {
    if (!USE_SHEETS) return false;
    if (showLoading) setSyncStatus('loading', 'Memuat data...');
    try {
        const res = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Gagal membaca data');
        applyServerData(json.data);
        lastSyncOk = true;
        setSyncStatus('ok', 'Tersinkron');
        return true;
    } catch (err) {
        console.error('Sync gagal:', err);
        lastSyncOk = false;
        setSyncStatus('error', 'Offline / gagal sinkron');
        return false;
    }
}

// Kirim satu atau banyak operasi ke Google Sheets
async function sendOps(ops) {
    if (!USE_SHEETS) return true;
    pendingWrites++;
    setSyncStatus('loading', 'Menyimpan...');
    try {
        // text/plain menghindari preflight CORS yang tidak didukung Apps Script
        const res = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ ops })
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Gagal menyimpan');
        pendingWrites--;
        if (pendingWrites === 0) {
            applyServerData(json.data);
            refreshUI();
        }
        setSyncStatus('ok', 'Tersimpan');
        return true;
    } catch (err) {
        pendingWrites--;
        console.error('Simpan gagal:', err);
        setSyncStatus('error', 'Gagal menyimpan');
        alert('Data gagal disimpan ke Google Sheets. Periksa koneksi internet lalu coba lagi.');
        await fetchFromSheets(false); // kembalikan tampilan ke data asli di server
        refreshUI();
        return false;
    }
}

function isModalOpen() {
    return !!document.querySelector('.modal-overlay.active, .modal.active');
}

function startAutoSync() {
    if (!USE_SHEETS) return;
    setInterval(async () => {
        if (document.hidden || pendingWrites > 0 || isModalOpen()) return;
        const ok = await fetchFromSheets(false);
        if (ok) refreshUI();
    }, SYNC_INTERVAL);

    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && pendingWrites === 0) {
            const ok = await fetchFromSheets(false);
            if (ok) refreshUI();
        }
    });
}

// Simpan lokal (mode tanpa Google Sheets)
function persistLocal() {
    recomputeDipinjam();
    saveCache();
    refreshUI();
}

// ============================================================
// NAVIGASI & MODAL
// ============================================================
function switchSection(sectionId, element) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-item button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`sec-${sectionId}`).classList.add('active');
    if (element) element.classList.add('active');

    refreshUI();
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (id === 'modal-buku') document.getElementById('form-buku').reset();
    if (id === 'modal-siswa') document.getElementById('form-siswa').reset();
}

// ============================================================
// CRUD: DATA BUKU
// ============================================================
async function saveBuku(e) {
    e.preventDefault();
    const id = document.getElementById('buku-id').value;
    const kode = document.getElementById('buku-kode').value;
    const judul = document.getElementById('buku-judul').value;
    const penulis = document.getElementById('buku-penulis').value;
    const jumlah = parseInt(document.getElementById('buku-jumlah').value);

    let record;
    if (id) {
        const index = bukuData.findIndex(b => b.id === id);
        if (index === -1) { closeModal('modal-buku'); return; }
        bukuData[index] = { ...bukuData[index], kode, judul, penulis, jumlah };
        record = bukuData[index];
    } else {
        record = { id: newId('B'), kode, judul, penulis, jumlah, dipinjam: 0 };
        bukuData.push(record);
    }

    closeModal('modal-buku');
    persistLocal();
    await sendOps([{ action: 'upsert', sheet: 'buku', record }]);
}

function editBuku(id) {
    const b = bukuData.find(item => item.id === id);
    if (!b) return;
    document.getElementById('buku-id').value = b.id;
    document.getElementById('buku-kode').value = b.kode;
    document.getElementById('buku-judul').value = b.judul;
    document.getElementById('buku-penulis').value = b.penulis;
    document.getElementById('buku-jumlah').value = b.jumlah;
    document.getElementById('modal-buku-title').innerText = 'Edit Data Buku';
    openModal('modal-buku');
}

async function deleteBuku(id) {
    if (confirm('Yakin ingin menghapus buku ini?')) {
        bukuData = bukuData.filter(b => b.id !== id);
        persistLocal();
        await sendOps([{ action: 'delete', sheet: 'buku', id }]);
    }
}

// ============================================================
// CRUD: DATA SISWA
// ============================================================
async function saveSiswa(e) {
    e.preventDefault();
    const id = document.getElementById('siswa-id').value;
    const nis = document.getElementById('siswa-nis').value;
    const nama = document.getElementById('siswa-nama').value;
    const kelas = document.getElementById('siswa-kelas').value;
    const hp = document.getElementById('siswa-hp').value;

    let record;
    if (id) {
        const index = siswaData.findIndex(s => s.id === id);
        if (index === -1) { closeModal('modal-siswa'); return; }
        siswaData[index] = { ...siswaData[index], nis, nama, kelas, hp };
        record = siswaData[index];
    } else {
        record = { id: newId('S'), nis, nama, kelas, hp };
        siswaData.push(record);
    }

    closeModal('modal-siswa');
    persistLocal();
    await sendOps([{ action: 'upsert', sheet: 'siswa', record }]);
}

function editSiswa(id) {
    const s = siswaData.find(item => item.id === id);
    if (!s) return;
    document.getElementById('siswa-id').value = s.id;
    document.getElementById('siswa-nis').value = s.nis;
    document.getElementById('siswa-nama').value = s.nama;
    document.getElementById('siswa-kelas').value = s.kelas;
    document.getElementById('siswa-hp').value = s.hp;
    document.getElementById('modal-siswa-title').innerText = 'Edit Data Siswa';
    openModal('modal-siswa');
}

async function deleteSiswa(id) {
    if (confirm('Yakin ingin menghapus data siswa ini?')) {
        siswaData = siswaData.filter(s => s.id !== id);
        persistLocal();
        await sendOps([{ action: 'delete', sheet: 'siswa', id }]);
    }
}

// ============================================================
// TRANSAKSI: PEMINJAMAN & PENGEMBALIAN
// ============================================================
async function addTransaksi(e) {
    e.preventDefault();
    const siswaId = document.getElementById('peminjam-siswa').value;
    const bukuId = document.getElementById('peminjam-buku').value;
    const tanggal = document.getElementById('peminjam-tanggal').value;

    // Ambil stok terbaru dari server dulu agar tidak bentrok dengan perangkat lain
    if (USE_SHEETS && pendingWrites === 0) {
        await fetchFromSheets(false);
    }

    const buku = bukuData.find(b => b.id === bukuId);
    if (!buku || (buku.jumlah - buku.dipinjam) <= 0) {
        alert('Stok buku tidak tersedia!');
        refreshUI();
        return;
    }

    const record = { id: newId('TRX-'), siswaId, bukuId, tanggal, status: 'Dipinjam' };
    transaksiData.unshift(record);

    document.getElementById('form-peminjaman').reset();
    persistLocal();
    const ok = await sendOps([{ action: 'upsert', sheet: 'transaksi', record }]);
    if (ok) alert('Transaksi peminjaman berhasil ditambahkan!');
}

async function kembalikanBuku(trxId) {
    const trx = transaksiData.find(t => t.id === trxId);
    if (trx && trx.status === 'Dipinjam') {
        trx.status = 'Dikembalikan';
        persistLocal();
        await sendOps([{ action: 'upsert', sheet: 'transaksi', record: trx }]);
    }
}

// ============================================================
// RENDER UI
// ============================================================
function refreshUI() {
    renderDashboard();
    renderBukuTable();
    renderSiswaTable();
    renderFormOptions();
    renderPengembalianTable();
    renderLaporanTable();
}

function statusBadge(status) {
    return `<span class="badge ${status === 'Dipinjam' ? 'badge-warning' : 'badge-success'}">${esc(status)}</span>`;
}

function renderDashboard() {
    document.getElementById('dash-total-buku').innerText = bukuData.reduce((acc, b) => acc + (Number(b.jumlah) || 0), 0);
    document.getElementById('dash-total-siswa').innerText = siswaData.length;

    const activeTrx = transaksiData.filter(t => t.status === 'Dipinjam');
    document.getElementById('dash-total-dipinjam').innerText = activeTrx.length;
    document.getElementById('dash-total-kembali').innerText = transaksiData.filter(t => t.status === 'Dikembalikan').length;

    const recentTbody = document.getElementById('tbl-recent-activity');
    let html = '';
    transaksiData.slice(0, 5).forEach(t => {
        const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Terhapus' };
        const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Terhapus' };
        html += `
            <tr>
                <td>${esc(t.tanggal)}</td>
                <td>${esc(s.nama)}</td>
                <td>${esc(b.judul)}</td>
                <td>${statusBadge(t.status)}</td>
            </tr>
        `;
    });
    recentTbody.innerHTML = html;
}

function renderBukuTable() {
    const tbody = document.getElementById('tbl-buku');
    let html = '';
    bukuData.forEach(b => {
        const sisa = b.jumlah - b.dipinjam;
        const badge = sisa > 0
            ? `<span class="badge badge-success">Tersedia</span>`
            : `<span class="badge badge-danger">Habis</span>`;

        html += `
            <tr>
                <td>${esc(b.kode)}</td>
                <td><strong>${esc(b.judul)}</strong></td>
                <td>${esc(b.penulis)}</td>
                <td>${esc(b.jumlah)}</td>
                <td>${esc(sisa)}</td>
                <td>${badge}</td>
                <td class="no-print">
                    <button class="btn btn-sm btn-primary" onclick="editBuku('${esc(b.id)}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBuku('${esc(b.id)}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderSiswaTable() {
    const tbody = document.getElementById('tbl-siswa');
    let html = '';
    siswaData.forEach(s => {
        html += `
            <tr>
                <td>${esc(s.nis)}</td>
                <td><strong>${esc(s.nama)}</strong></td>
                <td>${esc(s.kelas)}</td>
                <td>${esc(s.hp)}</td>
                <td class="no-print">
                    <button class="btn btn-sm btn-primary" onclick="editSiswa('${esc(s.id)}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSiswa('${esc(s.id)}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderFormOptions() {
    const selectSiswa = document.getElementById('peminjam-siswa');
    const selectBuku = document.getElementById('peminjam-buku');

    // Jangan reset pilihan yang sedang dipilih saat sinkron otomatis
    const prevSiswa = selectSiswa.value;
    const prevBuku = selectBuku.value;

    let optSiswa = '<option value="">-- Pilih Siswa --</option>';
    siswaData.forEach(s => {
        optSiswa += `<option value="${esc(s.id)}">${esc(s.nis)} - ${esc(s.nama)}</option>`;
    });
    selectSiswa.innerHTML = optSiswa;

    let optBuku = '<option value="">-- Pilih Buku --</option>';
    bukuData.forEach(b => {
        const sisa = b.jumlah - b.dipinjam;
        if (sisa > 0) {
            optBuku += `<option value="${esc(b.id)}">${esc(b.kode)} - ${esc(b.judul)} (Tersedia: ${sisa})</option>`;
        }
    });
    selectBuku.innerHTML = optBuku;

    selectSiswa.value = prevSiswa;
    selectBuku.value = prevBuku;

    const tgl = document.getElementById('peminjam-tanggal');
    if (!tgl.value) tgl.value = new Date().toISOString().split('T')[0];
}

function renderPengembalianTable() {
    const tbody = document.getElementById('tbl-pengembalian');
    let html = '';
    transaksiData.forEach(t => {
        const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Siswa Terhapus' };
        const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Buku Terhapus' };

        const btnAction = t.status === 'Dipinjam'
            ? `<button class="btn btn-sm btn-success" onclick="kembalikanBuku('${esc(t.id)}')"><i class="fa-solid fa-arrow-rotate-left"></i> Kembalikan</button>`
            : `<span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-check"></i> Selesai</span>`;

        html += `
            <tr>
                <td>${esc(t.tanggal)}</td>
                <td>${esc(s.nama)}</td>
                <td>${esc(b.judul)}</td>
                <td>${statusBadge(t.status)}</td>
                <td class="no-print">${btnAction}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderLaporanTable() {
    const tbody = document.getElementById('tbl-laporan');
    let html = '';
    transaksiData.forEach(t => {
        const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Siswa Terhapus' };
        const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Buku Terhapus' };

        html += `
            <tr>
                <td>${esc(t.id)}</td>
                <td>${esc(t.tanggal)}</td>
                <td>${esc(s.nama)}</td>
                <td>${esc(b.judul)}</td>
                <td>${statusBadge(t.status)}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ============================================================
// INISIALISASI APLIKASI
// ============================================================
window.onload = async function () {
    loadCache();
    recomputeDipinjam();
    refreshUI();

    if (USE_SHEETS) {
        await fetchFromSheets(true);
        refreshUI();
        startAutoSync();
    } else {
        setSyncStatus('local', 'Mode lokal (belum terhubung Sheets)');
    }
};

// ============================================================
// LOGIN SEDERHANA
// ============================================================
(function () {
    const LOGIN_USERNAME = 'user';
    const LOGIN_PASSWORD = 'user';

    function showApp() {
        document.body.classList.remove('login-locked');
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.style.display = 'none';
    }

    function showLogin() {
        document.body.classList.add('login-locked');
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.style.display = 'flex';
    }

    function handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const error = document.getElementById('login-error');

        if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
            sessionStorage.setItem('perpus_logged_in', '1');
            error.textContent = '';
            showApp();

            if (typeof refreshUI === 'function') {
                refreshUI();
            }
            return;
        }

        error.textContent = 'Username atau password salah.';
    }

    function logout() {
        sessionStorage.removeItem('perpus_logged_in');
        showLogin();
        const form = document.getElementById('login-form');
        if (form) form.reset();
        const error = document.getElementById('login-error');
        if (error) error.textContent = '';
    }

    window.handleLogin = handleLogin;
    window.logout = logout;

    document.addEventListener('DOMContentLoaded', function () {
        const loggedIn = sessionStorage.getItem('perpus_logged_in') === '1';
        if (loggedIn) {
            showApp();
        } else {
            showLogin();
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    });
})();
