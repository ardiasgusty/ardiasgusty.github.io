# Honda Street Rush — Browser Racing MVP

Prototype game balap browser yang dapat di-host di GitHub Pages.

## Yang sudah ada
- Home screen
- 8 pilihan mobil Honda
- 6 map Indonesia
- Solo race playable (keyboard + mobile touch)
- AI rivals
- Lap, posisi, speedometer, boost
- Multiplayer private room via Supabase Realtime
- Create Room / Join Room dengan kode 6 karakter
- Presence player, pilih mobil, ready, pilih map, pilih lap
- Sinkronisasi posisi mobil saat race (prototype)

## Kontrol
Desktop:
- A / Left Arrow: belok kiri
- D / Right Arrow: belok kanan
- S / Down Arrow: rem
- Shift: boost

Mobile:
- Tombol kiri / kanan
- BOOST

## Menjalankan lokal
Karena data dibaca lewat `fetch()`, jalankan dengan local web server.
Contoh bila Python terpasang:

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Upload ke GitHub Pages
1. Buat repository baru.
2. Upload seluruh isi folder ini ke root repository.
3. GitHub > Settings > Pages.
4. Source: `Deploy from a branch`.
5. Pilih branch `main`, folder `/ (root)`.
6. Save.

## Mengaktifkan multiplayer
Game tetap di GitHub Pages. Supabase hanya dipakai untuk Realtime.

1. Buat project di Supabase.
2. Ambil `Project URL`.
3. Ambil `Publishable key` atau `anon key`.
4. Buka game > Multiplayer.
5. Paste kedua data tersebut di panel `Supabase Connection`.
6. Klik `SIMPAN KONFIGURASI`.
7. Buat room.
8. Teman membuka URL game yang sama dan memasukkan kode room.

Konfigurasi disimpan di `localStorage` browser, bukan di source code.

## Catatan MVP
Multiplayer saat ini adalah prototype client-authoritative untuk mabar privat. Ini cocok untuk testing dan permainan santai, tetapi belum anti-cheat / kompetitif. Untuk game publik berskala besar, race authority sebaiknya dipindahkan ke game server khusus.

## Branding dan aset
Prototype ini memakai bentuk vector sederhana dan nama model. Jika dipublikasikan sebagai campaign resmi, gunakan logo, foto kendaraan, audio, dan aset Honda yang memang memiliki izin penggunaan.
