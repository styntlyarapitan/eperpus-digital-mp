// Default Sample Data (Inisialisasi jika LocalStorage kosong)
        const initialBuku = [];

        const initialSiswa = [];

        const initialTransaksi = [];

        // Reset satu kali data transaksi lama agar riwayat pengembalian
        // dan laporan riwayat peminjaman dimulai dalam keadaan kosong.
        const TRANSACTION_HISTORY_RESET_KEY = 'perpus_transaksi_history_reset_v1';
        if (localStorage.getItem(TRANSACTION_HISTORY_RESET_KEY) !== '1') {
            localStorage.removeItem('perpus_transaksi');
            localStorage.setItem(TRANSACTION_HISTORY_RESET_KEY, '1');
        }

        // Global State & Storage Helpers
        let bukuData = JSON.parse(localStorage.getItem('perpus_buku')) || initialBuku;
        let siswaData = JSON.parse(localStorage.getItem('perpus_siswa')) || initialSiswa;
        let transaksiData = JSON.parse(localStorage.getItem('perpus_transaksi')) || initialTransaksi;

        function saveData() {
            localStorage.setItem('perpus_buku', JSON.stringify(bukuData));
            localStorage.setItem('perpus_siswa', JSON.stringify(siswaData));
            localStorage.setItem('perpus_transaksi', JSON.stringify(transaksiData));
            refreshUI();
        }

        // Navigation Management
        function switchSection(sectionId, element) {
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-item button').forEach(btn => btn.classList.remove('active'));
            
            document.getElementById(`sec-${sectionId}`).classList.add('active');
            if(element) element.classList.add('active');
            
            refreshUI();
        }

        // Modal Helpers
        function openModal(id) {
            document.getElementById(id).classList.add('active');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
            if(id === 'modal-buku') document.getElementById('form-buku').reset();
            if(id === 'modal-siswa') document.getElementById('form-siswa').reset();
        }

        // CRUD: Data Buku
        function saveBuku(e) {
            e.preventDefault();
            const id = document.getElementById('buku-id').value;
            const kode = document.getElementById('buku-kode').value;
            const judul = document.getElementById('buku-judul').value;
            const penulis = document.getElementById('buku-penulis').value;
            const jumlah = parseInt(document.getElementById('buku-jumlah').value);

            if (id) {
                const index = bukuData.findIndex(b => b.id === id);
                bukuData[index] = { ...bukuData[index], kode, judul, penulis, jumlah };
            } else {
                bukuData.push({ id: Date.now().toString(), kode, judul, penulis, jumlah, dipinjam: 0 });
            }

            saveData();
            closeModal('modal-buku');
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

        function deleteBuku(id) {
            if (confirm('Yakin ingin menghapus buku ini?')) {
                bukuData = bukuData.filter(b => b.id !== id);
                saveData();
            }
        }

        // CRUD: Data Siswa
        function saveSiswa(e) {
            e.preventDefault();
            const id = document.getElementById('siswa-id').value;
            const nis = document.getElementById('siswa-nis').value;
            const nama = document.getElementById('siswa-nama').value;
            const kelas = document.getElementById('siswa-kelas').value;
            const hp = document.getElementById('siswa-hp').value;

            if (id) {
                const index = siswaData.findIndex(s => s.id === id);
                siswaData[index] = { ...siswaData[index], nis, nama, kelas, hp };
            } else {
                siswaData.push({ id: Date.now().toString(), nis, nama, kelas, hp });
            }

            saveData();
            closeModal('modal-siswa');
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

        function deleteSiswa(id) {
            if (confirm('Yakin ingin menghapus data siswa ini?')) {
                siswaData = siswaData.filter(s => s.id !== id);
                saveData();
            }
        }

        // Transactions: Peminjaman & Pengembalian
        function addTransaksi(e) {
            e.preventDefault();
            const siswaId = document.getElementById('peminjam-siswa').value;
            const bukuId = document.getElementById('peminjam-buku').value;
            const tanggal = document.getElementById('peminjam-tanggal').value;

            const buku = bukuData.find(b => b.id === bukuId);
            if (!buku || (buku.jumlah - buku.dipinjam) <= 0) {
                alert('Stok buku tidak tersedia!');
                return;
            }

            buku.dipinjam += 1;
            transaksiData.unshift({
                id: 'TRX-' + Math.floor(1000 + Math.random() * 9000),
                siswaId,
                bukuId,
                tanggal,
                status: 'Dipinjam'
            });

            saveData();
            document.getElementById('form-peminjaman').reset();
            alert('Transaksi peminjaman berhasil ditambahkan!');
        }

        function kembalikanBuku(trxId) {
            const trx = transaksiData.find(t => t.id === trxId);
            if (trx && trx.status === 'Dipinjam') {
                trx.status = 'Dikembalikan';
                const buku = bukuData.find(b => b.id === trx.bukuId);
                if (buku && buku.dipinjam > 0) {
                    buku.dipinjam -= 1;
                }
                saveData();
            }
        }

        // Render UI Components
        function refreshUI() {
            renderDashboard();
            renderBukuTable();
            renderSiswaTable();
            renderFormOptions();
            renderPengembalianTable();
            renderLaporanTable();
        }

        function renderDashboard() {
            document.getElementById('dash-total-buku').innerText = bukuData.reduce((acc, b) => acc + b.jumlah, 0);
            document.getElementById('dash-total-siswa').innerText = siswaData.length;
            
            const activeTrx = transaksiData.filter(t => t.status === 'Dipinjam');
            document.getElementById('dash-total-dipinjam').innerText = activeTrx.length;
            document.getElementById('dash-total-kembali').innerText = transaksiData.filter(t => t.status === 'Dikembalikan').length;

            const recentTbody = document.getElementById('tbl-recent-activity');
            recentTbody.innerHTML = '';
            transaksiData.slice(0, 5).forEach(t => {
                const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Terhapus' };
                const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Terhapus' };
                recentTbody.innerHTML += `
                    <tr>
                        <td>${t.tanggal}</td>
                        <td>${s.nama}</td>
                        <td>${b.judul}</td>
                        <td>
                            <span class="badge ${t.status === 'Dipinjam' ? 'badge-warning' : 'badge-success'}">
                                ${t.status}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }

        function renderBukuTable() {
            const tbody = document.getElementById('tbl-buku');
            tbody.innerHTML = '';
            bukuData.forEach(b => {
                const sisa = b.jumlah - b.dipinjam;
                const statusBadge = sisa > 0 
                    ? `<span class="badge badge-success">Tersedia</span>`
                    : `<span class="badge badge-danger">Habis</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td>${b.kode}</td>
                        <td><strong>${b.judul}</strong></td>
                        <td>${b.penulis}</td>
                        <td>${b.jumlah}</td>
                        <td>${sisa}</td>
                        <td>${statusBadge}</td>
                        <td class="no-print">
                            <button class="btn btn-sm btn-primary" onclick="editBuku('${b.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteBuku('${b.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderSiswaTable() {
            const tbody = document.getElementById('tbl-siswa');
            tbody.innerHTML = '';
            siswaData.forEach(s => {
                tbody.innerHTML += `
                    <tr>
                        <td>${s.nis}</td>
                        <td><strong>${s.nama}</strong></td>
                        <td>${s.kelas}</td>
                        <td>${s.hp}</td>
                        <td class="no-print">
                            <button class="btn btn-sm btn-primary" onclick="editSiswa('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSiswa('${s.id}')"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderFormOptions() {
            const selectSiswa = document.getElementById('peminjam-siswa');
            const selectBuku = document.getElementById('peminjam-buku');

            selectSiswa.innerHTML = '<option value="">-- Pilih Siswa --</option>';
            siswaData.forEach(s => {
                selectSiswa.innerHTML += `<option value="${s.id}">${s.nis} - ${s.nama}</option>`;
            });

            selectBuku.innerHTML = '<option value="">-- Pilih Buku --</option>';
            bukuData.forEach(b => {
                const sisa = b.jumlah - b.dipinjam;
                if (sisa > 0) {
                    selectBuku.innerHTML += `<option value="${b.id}">${b.kode} - ${b.judul} (Tersedia: ${sisa})</option>`;
                }
            });

            // Auto set default date
            document.getElementById('peminjam-tanggal').value = new Date().toISOString().split('T')[0];
        }

        function renderPengembalianTable() {
            const tbody = document.getElementById('tbl-pengembalian');
            tbody.innerHTML = '';
            transaksiData.forEach(t => {
                const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Siswa Terhapus' };
                const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Buku Terhapus' };

                const btnAction = t.status === 'Dipinjam'
                    ? `<button class="btn btn-sm btn-success" onclick="kembalikanBuku('${t.id}')"><i class="fa-solid fa-arrow-rotate-left"></i> Kembalikan</button>`
                    : `<span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-check"></i> Selesai</span>`;

                tbody.innerHTML += `
                    <tr>
                        <td>${t.tanggal}</td>
                        <td>${s.nama}</td>
                        <td>${b.judul}</td>
                        <td>
                            <span class="badge ${t.status === 'Dipinjam' ? 'badge-warning' : 'badge-success'}">
                                ${t.status}
                            </span>
                        </td>
                        <td class="no-print">${btnAction}</td>
                    </tr>
                `;
            });
        }

        function renderLaporanTable() {
            const tbody = document.getElementById('tbl-laporan');
            tbody.innerHTML = '';
            transaksiData.forEach(t => {
                const s = siswaData.find(x => x.id === t.siswaId) || { nama: 'Siswa Terhapus' };
                const b = bukuData.find(x => x.id === t.bukuId) || { judul: 'Buku Terhapus' };

                tbody.innerHTML += `
                    <tr>
                        <td>${t.id}</td>
                        <td>${t.tanggal}</td>
                        <td>${s.nama}</td>
                        <td>${b.judul}</td>
                        <td>
                            <span class="badge ${t.status === 'Dipinjam' ? 'badge-warning' : 'badge-success'}">
                                ${t.status}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }

        // Initialize App
        window.onload = function() {
            refreshUI();
        };

// Simple HTML login gate
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

            // Keep the original app initialization behavior.
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
