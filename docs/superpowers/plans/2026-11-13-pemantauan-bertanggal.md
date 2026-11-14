# Pemantauan Bertanggal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mendukung pemantauan kapan saja dan task mitigasi otomatis sesudah finalisasi dengan laporan berbasis tanggal.

**Architecture:** Simpan observed_at sebagai tanggal pengamatan terpisah dari audit timestamp. Turunkan assessment_cycle dari tanggal, izinkan banyak final per triwulan, finalisasi dan task tindak lanjut dalam transaksi yang sama. Konsumen laporan memilih hasil final terbaru per risiko pada rentang tanggal.

**Tech Stack:** Go, PostgreSQL, Next.js, React, TypeScript.

### Task 1: Backend pemantauan dan task
- [x] Tambahkan migration 000085, observedAt pada entity/request/response, validasi tanggal WIB, dan ganti constraint satu final per siklus dengan penjagaan draf yang sesuai.
- [x] Ubah start/update/finalize pada monitoring_transaction.go dan risk_monitoring.go; hapus batas window pengisian triwulan dan izinkan final berikutnya dalam triwulan sama.
- [x] Hasil profil efektif pada tanggal pengamatan. Finalisasi membuat task tindak lanjut secara atomik dan mempertahankan status task lama.
- [x] Uji dua pengamatan dalam satu triwulan, validasi tanggal, pengulangan/concurrency finalisasi dan rollback task.

### Task 2: Form dan riwayat
- [x] Ganti pemilih siklus saat mulai dengan field tanggal; tampilkan kelompok triwulan turunan dan tanggal pengamatan pada form/detail/riwayat.
- [x] Sesuaikan API types dan seluruh entry point mulai pemantauan; jangan blokir berdasarkan window triwulan.
- [x] Review finalisasi menampilkan task tindak lanjut yang akan dibuat dan tidak menjanjikan perubahan otomatis status task lama.
- [x] Sinkronkan DESIGN.md, Design System dan dokumentasi pengguna.

### Task 3: Konsumen laporan dan KK
- [x] Audit laporan kuartalan, semester UPR, dashboard, KK dan agregasi progres; hindari duplikasi keluarga risiko akibat banyak pemantauan.
- [x] Pilih latest final berdasarkan observed_at dalam rentang laporan; simpan history dan cutoff tanpa mengubah snapshot final terdahulu.
- [x] Uji Februari/April/lebih dari satu pengamatan Q2, draf terbaru diabaikan, tanggal sama stabil, serta tidak ada pengamatan periode.

### Task 4: Review dan validasi integrasi
- [x] Jalankan tes Go yang relevan dan typecheck frontend; bedakan error baseline dari regresi perubahan ini.
- [x] Review kepatuhan spesifikasi lalu kualitas kode dan integrasi; perbaiki temuan sebelum menyatakan selesai.

Verifikasi: migrasi 000001–000085 dan dua tes integrasi lulus di PostgreSQL sementara. Tes Go terfokus dan 36 tes frontend terkait lulus. Typecheck proyek dan empat pemeriksaan layout Register yang sudah ada masih gagal di luar perubahan ini. Verifikasi melalui browser lokal belum selesai karena server localhost:3000 tidak aktif.
