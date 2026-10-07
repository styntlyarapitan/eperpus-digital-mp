E-Perpus Digital

Penggunaan File

1. HTML

File "index.html" digunakan untuk membuat struktur dan isi halaman aplikasi.

Contohnya:

- Menu
- Tombol
- Form
- Tabel buku
- Halaman login

2. CSS

File "assets/style.css" digunakan untuk mengatur tampilan aplikasi.

Contohnya:

- Warna
- Ukuran tulisan
- Ukuran tombol
- Jarak dan posisi
- Tampilan tabel
- Tampilan di HP dan komputer

3. JavaScript

File "assets/script.js" digunakan untuk membuat aplikasi dapat berfungsi dan interaktif.

Contohnya:

- Login
- Tombol dan menu
- Menambah data buku
- Peminjaman buku
- Pengembalian buku
- Menampilkan riwayat
- Menyimpan data di browser

Kesimpulan

- HTML = Struktur/isi aplikasi
- CSS = Tampilan/desain aplikasi
- JavaScript = Fungsi dan interaksi aplikasi

Untuk menjalankan aplikasi, cukup buka file "index.html" menggunakan browser seperti Chrome, Edge, atau Firefox.

==================================================
DATABASE BERSAMA (GOOGLE SHEETS)
==================================================

Supaya data yang diinput terbaca di semua perangkat (HP lain, komputer lain),
data disimpan di Google Sheets lewat Google Apps Script.

LANGKAH SETUP (cukup sekali)

1. Buat Google Sheets baru di https://sheets.google.com (nama bebas,
   misalnya "E-Perpus Database"). Tidak perlu membuat kolom/tab manual:
   tab "buku", "siswa", dan "transaksi" dibuat otomatis.

2. Di Google Sheets: menu Ekstensi > Apps Script.

3. Hapus isi kode bawaan, lalu tempel seluruh isi file
   "backend/Code.gs" dari folder ini. Klik Simpan.

4. Klik Deploy > Deployment baru > ikon roda gigi > pilih "Aplikasi web".
   - Jalankan sebagai (Execute as)  : Saya (Me)
   - Siapa yang memiliki akses      : Siapa saja (Anyone)
   Klik Deploy, lalu izinkan akses (Authorize) saat diminta.
   (Jika muncul "Google hasn't verified this app", klik Advanced >
   Go to ... (unsafe), ini aman karena script milik Anda sendiri.)

5. Salin "URL aplikasi web" (berakhiran /exec).

6. Buka "assets/script.js", isi baris paling atas:
       const API_URL = 'https://script.google.com/macros/s/XXXX/exec';

7. Upload ulang semua file ke GitHub (commit & push). Tunggu GitHub Pages
   selesai deploy, lalu buka di HP dan refresh (jika perlu hapus cache).

CATATAN PENTING

- Jika kode Code.gs diubah di kemudian hari, buat deployment BARU
  (Deploy > Kelola deployment > Edit > Versi baru > Deploy).
  URL /exec tetap sama.
- Data otomatis diperbarui di setiap perangkat tiap 15 detik dan saat
  halaman dibuka kembali. Pojok kiri atas menu menampilkan status sinkron.
- Data lama yang sebelumnya hanya tersimpan di browser (localStorage)
  TIDAK otomatis pindah ke Google Sheets. Input ulang, atau isi langsung
  di sheet (kolom id harus unik, misalnya B1, B2 / S1, S2).
- Login "user/user" hanya pengaman tampilan di sisi browser. Karena URL
  Web App ditulis di file publik GitHub, siapa pun yang tahu URL tersebut
  bisa membaca/menulis data. Jangan simpan data yang sangat sensitif.
