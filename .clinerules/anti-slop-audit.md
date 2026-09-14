# Aturan Audit Anti-Slop

Ketika diminta untuk mengaudit kode, gunakan aturan berikut:

## Mode Audit
- **Selalu mulai dalam Plan Mode**. Laporkan temuan dalam daftar bernomor.
- **Jangan ubah file apa pun** sampai pengguna memberikan persetujuan.
- Untuk setiap temuan, sebutkan:
    1. **Tipe**: (Decorative Separator / Restating the Obvious / Workflow Narration / Empty Label)
    2. **Lokasi**: File dan baris
    3. **Masalah**: Penjelasan singkat
    4. **Saran**: Apa yang harus dilakukan

## Kategori Slop yang Harus Diperiksa
1. **Decorative Separator**: Baris seperti `# ====================` atau `# ----------` yang hanya dekorasi.
2. **Restating the Obvious**: Komentar yang mengulang nama fungsi atau variabel di bawahnya, misalnya `# Inisialisasi variabel` di atas `count = 0`.
3. **Workflow Narration**: Komentar bernomor seperti `# Step 1: ...`, `# Step 2: ...` yang membuat kode terasa seperti checklist.
4. **Empty Label**: Label kategori tanpa nilai informatif, misalnya `# Main logic` atau `# Helper function`.

## Komentar yang Layak Dipertahankan
- Komentar yang menjelaskan **WHY** (alasan keputusan teknis).
- Komentar yang memberi konteks tidak jelas dari kode (misalnya workaround untuk bug library).
- Docstring yang menjelaskan **perilaku** fungsi, bukan hanya mengulang namanya.