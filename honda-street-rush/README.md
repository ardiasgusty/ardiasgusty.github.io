# Honda Street Rush V2

Prototype browser racing 3D untuk GitHub Pages.

## Yang baru di V2
- Three.js 3D third-person camera.
- 5 model mobil Honda bergaya semi-realistic/procedural dengan siluet berbeda.
- Track Jakarta loop yang dibangun dari spline, bukan jalan lurus acak.
- Monas dan skyline kota sebagai landmark.
- Collision mobil vs mobil yang menurunkan kecepatan.
- Off-road slowdown + bantuan kembali ke area track.
- Mini map real-time dengan posisi player dan AI.
- 5 AI lawan, 3 lap, ranking, boost, speedometer.
- Kontrol PC dan touch/mobile.

## Menjalankan
Game menggunakan Three.js dari CDN. Untuk pengujian lokal, buka folder menggunakan Live Server atau server statis sederhana. Setelah diunggah ke GitHub Pages, game dapat langsung dijalankan dari browser.

## Upload ke GitHub Pages
Upload isi folder ini ke root repository, lalu aktifkan Settings > Pages > Deploy from a branch.

## Catatan model mobil
Model pada V2 dibuat secara procedural agar ringan dan tidak membutuhkan file 3D eksternal. Bentuk tiap tipe sudah dibedakan (hatchback, SUV, sedan, Type R), tetapi ini belum model CAD/GLB resmi Honda. Tahap berikutnya dapat mengganti builder procedural dengan aset GLB/GLTF berlisensi tanpa mengubah game loop utama.

## File utama
- `index.html`
- `style.css`
- `js/main.js`
