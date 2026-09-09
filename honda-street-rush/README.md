# Honda Street Rush V2.1 — Vehicle Fidelity Upgrade

Versi ini merupakan upgrade dari V2 dengan fokus utama pada kemiripan kendaraan Honda di dalam game.

## Mobil 3D yang mendapatkan model khusus

### Honda Brio RS
- Proporsi hatchback lebih pendek dan tinggi
- Wajah depan khusus Brio RS
- Dark-style grille dan RS plate
- Headlamp, fog lamp, rear combi lamp
- Black roof / sporty cue
- Tailgate spoiler
- Dark sporty wheels

### Honda HR-V e:HEV
- Proporsi compact crossover HR-V
- Slim LED-style headlights
- Wide grille dengan horizontal detail
- Black lower cladding
- Full-width style rear lamp strip
- e:HEV plate
- SUV wheel sizing

### Honda Civic Type R
- Proporsi dibuat mengikuti generasi Type R modern yang dijual Honda Indonesia
- Low/wide body
- Slim front lights + large grille
- Hood vent
- Side skirts
- Large rear wing
- Performance wheels + red brake cue
- Triple center exhaust
- Red Honda badge cue + Type R plate

Honda WR-V RS dan Civic RS masih memakai model generik yang sudah ditingkatkan. Keduanya dapat dibuat model khusus pada tahap berikutnya.

## Penting

Reference concept images di folder `assets/reference/` hanya menjadi acuan visual pengembangan. Mobil yang muncul saat race adalah mesh 3D yang dibuat oleh JavaScript di `js/cars3d.js`, jadi tetap dapat dilihat dari berbagai sudut kamera dan ikut collision seperti kendaraan lain.

## Menjalankan game

Game adalah static site. Tidak membutuhkan Node.js untuk hosting.

Untuk GitHub Pages:
1. Backup versi lama jika ingin menyimpannya.
2. Ganti isi repository dengan seluruh isi folder V2.1 ini.
3. Commit dan push.
4. Pastikan GitHub Pages tetap menunjuk branch/folder yang sama.

Three.js masih dimuat dari CDN melalui import map di `index.html`, jadi browser perlu koneksi internet saat pertama memuat library tersebut.

## Kontrol

- W / Arrow Up: gas
- S / Arrow Down: rem
- A / D atau Arrow Left / Right: belok
- Shift: boost
- Mobile: tombol layar

## Fitur gameplay dari V2 yang tetap ada

- 3D third-person racing
- Jakarta — Monas Sprint
- AI racers
- Collision mobil vs mobil
- Benturan menurunkan kecepatan
- Off-road slowdown
- Mini map
- Lap & ranking
- Boost
- Touch controls
