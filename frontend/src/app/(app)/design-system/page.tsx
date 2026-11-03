"use client";
import { RiskCommentsExample } from "@/components/shared/design-system/examples/risk-comments-example";
import { DetailSidePanelExample } from "@/components/shared/design-system/examples/detail-side-panel-example";
import { EmptyStateSpacingExample } from "@/components/shared/design-system/examples/empty-state-spacing-example";
import { RiskDetailTabsExample } from "@/components/shared/design-system/examples/risk-detail-tabs-example";

import { RiskConditionReportExample } from "@/components/shared/design-system/examples/risk-condition-report-example";
import { AgentSystemExample } from "@/components/agent/agent-system-example";

import { TableExample } from "@/components/shared/design-system/examples/table-example";
import { MarketingSystemExample } from "@/components/marketing/marketing-primitives";
import { LogoCarousel } from "@/components/marketing/logo-carousel";

import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DitherAvatar } from "@/components/dither-kit/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/animated-tabs";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, Search } from "@/components/shared/icons";
import {
  getRiskLevelDisplayLabel,
  getRiskLevelFromNilai,
  levelToColor,
} from "@/lib/risk";
import { AccentButton } from "@/components/shared/design-system/actions/accent-button";
import { ActionButton } from "@/components/shared/design-system/actions/action-button";
import { SidebarMotionExample } from "@/components/shared/design-system/examples/sidebar-motion-example";
import { DashboardKpiCard } from "@/components/shared/design-system/layout/dashboard-kpi-card";
import { QuarterlyReportExample } from "@/components/shared/design-system/examples/quarterly-report-example";
import { CardPatternsExample } from "@/components/shared/design-system/examples/card-patterns-example";
import { MitigationPlanListExample } from "@/components/shared/design-system/examples/mitigation-plan-list-example";
import { RiskEventExtractionExample } from "@/components/shared/design-system/examples/risk-event-extraction-example";
import { IncidentFormModalExample } from "@/components/shared/design-system/examples/incident-form-modal-example";
import { MitigationProgressFormExample } from "@/components/shared/design-system/examples/mitigation-progress-form-example";
import { OperatorWorkExample } from "@/components/shared/design-system/examples/operator-work-example";
import { MonitoringEvidenceExample } from "@/components/shared/design-system/examples/monitoring-evidence-example";
import { MonitoringInsightCard } from "@/components/shared/design-system/domain/monitoring-insight-card";
import { MonitoringCycleSelectExample } from "@/components/shared/design-system/examples/monitoring-cycle-select-example";
import {
  CollectionEmptyState,
  ExternalAIProcessingNotice,
  RiskCategoryIndicator,
} from "@/components/shared/design-system";
import {
  BadgeSystemExample,
  CollectionLayoutExample,
  CollectionPageHeaderExample,
  CollapsibleCardExample,
  FilterPopoverExample,
  IconographyExample,
  OverviewDashboardExample,
  RiskDetailDrawerExample,
} from "@/components/shared/design-system/examples";

import { SettingsModalExample } from "@/components/shared/design-system/examples/settings-modal-example";
import { RiskScoreCardExample } from "@/components/shared/design-system/examples/risk-score-card-example";
import { ToastExample } from "@/components/shared/design-system/examples/toast-example";
import { DocumentationExample } from "@/components/shared/design-system/examples/documentation-example";

import { GlobalMotionExample } from "@/components/shared/design-system/examples/global-motion-example";
import { RegisterMotionExample } from "@/components/shared/design-system/examples/register-motion-example";

export default function DesignSystemPage() {
  return (
    <main className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">Seluruh teks seksi To-Do memakai 14px, termasuk judul, metadata, badge, dan jadwal pemantauan. Rentang tanggal memakai label Periode. Jadwal tampil di paling atas dalam banner Alert info: latar biru lembut, border dan teks biru, serta ikon lingkaran seru di kiri.</p>
      <OperatorWorkExample />
      <MonitoringEvidenceExample />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
        <p className="text-muted-foreground">
          Manrisk menggunakan komponen shadcn/ui radix-nova, tema dasar neutral, palet grafik untuk data, dan font Geist. Variant default Button memakai token primary neutral; Badge memakai palet netral bersama dengan teks 12px, latar lembut, dan border pastel. Shell memakai token background; area konten halaman menerapkan `text-wrap: pretty` lewat SidebarInset, sedangkan komponen dengan kebutuhan khusus dapat menetapkan perilaku bungkus lokal. Navigasi dan aksi akun memakai komposisi Sidebar bawaan. Variasi tampilan
          memakai prop resmi komponen; kelas halaman mengatur tata letak. Desktop shell tidak memakai topbar global. Header judul bersama mengambil judul dan deskripsi sesuai rute; baris judul pertama sejajar secara vertikal dengan wordmark sidebar, dan tepi awalnya sejajar dengan konten. Halaman dengan alur khusus dapat menampilkan header sendiri. Navigasi mobile mempertahankan bar 56px dengan pemicu menu dan wordmark Manrisk, tanpa breadcrumb. App shell dan `SidebarInset` memakai `bg-sidebar` agar area utama sewarna dengan sidebar pada tema terang dan gelap. Header tabel memakai `table-header` (`#f7f7f7` pada tema terang), sedangkan footer memakai `table-footer` (`#fcfcfc`). Sidebar dan header logo desktop juga memakai `sidebar` (`#f6f6f6` pada tema terang). Konten inset di dalam Card memakai token `card-subtle-surface` (`#f6f6f6`); isi Card dan panel utama tetap putih, border Card dan panel memakai `border` (`#ececec`), termasuk ring Card bawaan. Row separator tabel memakai `table-divider` (`#ececec`); Divider dan garis pemisah shell memakai `separator` / `sidebar-border` (`#f6f6f6`). Area sunken memakai `sunken` (`#efefef`). Warna risiko hanya
          digunakan untuk menyampaikan data. Hirarki teks memakai foreground (#202020) untuk konten utama, secondary-foreground / muted-foreground (#636363) untuk dukungan, tertiary-foreground (#8b8b8b) untuk microcopy termasuk catatan nilai awal serta target pada form Register Risiko, serta disabled-foreground (#b9b9b9) untuk teks nonaktif. Hover memakai sidebar-accent (#e5e5e5) dan active memakai active (#dddddd). Sel data pendukung pada tabel seperti kategori memakai muted-foreground, sedangkan link utama, metrik, status, dan skor mempertahankan hierarki semantiknya. Animasi tab, tombol, overlay, input, animasi buka-tutup Sidebar, dan Drawer mengikuti token transitions-dev bersama; pergantian menu aktif di Sidebar langsung tanpa animasi slide.
        </p>
        <p className="text-muted-foreground">Tombol outline, ghost, dan secondary memakai hover #e5e5e5 serta active #dddddd, termasuk saat kontrol terbuka. Tombol primary disabled memakai latar disabled-surface (muted), dengan teks dan ikon disabled-foreground tanpa pengurangan opacity pada kedua tema.</p>
      </header>

      <GlobalMotionExample />
      <RegisterMotionExample />
      <section id="agent" className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Manris Agent</h2>
        <p className="text-sm text-muted-foreground">Narasi Agent langsung ke hasil utama: biasanya 1–3 kalimat, cukup satu kalimat bila komponen hasil sudah menjawab. Hindari pengulangan tabel/grafik dan metadata; rincian diberikan saat diminta. Peringatan penting dan kebutuhan persetujuan tetap disampaikan.</p>
        <p className="text-sm text-muted-foreground">Klarifikasi hanya menampilkan pertanyaan dan pilihan jawaban, tanpa deskripsi atau petunjuk balasan yang berulang. Klik pilihan langsung mengirim jawaban untuk diproses, tanpa memasukkannya ke composer; draf dan lampiran tetap tersimpan.</p>
        <p className="text-sm text-muted-foreground">Semua permukaan hasil chat, bubble, dan paket tinjauan memakai elevasi kartu laporan: satu outline lembut dan shadow tipis pada latar card. Metrik, grafik, dan klarifikasi memakai inset 16px. Composer mempertahankan ring fokus/validasi; isi kartu tetap datar agar shadow tidak bertumpuk. Contoh Hasil dan tinjauan memakai komponen produksi yang sama.</p>
        <p className="text-sm text-muted-foreground">Percakapan disederhanakan: satu aksi percakapan baru di toolbar, satu menu unduh per jawaban, dan tindakan risiko sekunder di menu lainnya. Aktivitas yang selesai hanya menampilkan jumlah langkah jika tersedia. Error, peringatan, dan panel tinjauan tetap terlihat.</p>
        <p className="text-sm text-muted-foreground">Percakapan memakai toolbar, isi, dan composer yang sejajar. Antar giliran berjarak 48px, pesan ke jawaban 24px, dan isi jawaban dikelompokkan lebih rapat. Teks dibatasi untuk dibaca, tabel tetap lebar, dan composer balasan memakai dua baris. Lihat Hasil dan tinjauan untuk contoh dua giliran.</p>
        <p className="text-sm text-muted-foreground">Riwayat desktop memakai padding vertikal 6px dan tinggi minimal 36px; target sentuh tetap 44px. Tombol kirim bulat dan ikon lampiran memakai SVG paperclip khusus sesuai referensi.</p>
        <p className="text-sm text-muted-foreground">Composer tanpa catatan persetujuan generik. Riwayat tanpa judul, ikon, atau divider; baris memakai latar hover/fokus dan waktu singkat seperti 7h, 1d, 6w. Tanggal lengkap tersedia saat hover dan untuk pembaca layar.</p>
        <p className="text-sm text-muted-foreground">Halaman awal memakai satu garis kiri untuk judul, composer, dan riwayat. Kolom dibatasi 54rem; saran menjadi satu kolom dan tanggal riwayat turun ke baris berikutnya saat ruang menyempit. Pilih Riwayat terisi untuk membandingkan kedua keadaan.</p>
        <p className="text-sm text-muted-foreground">Hasil dan tinjauan mencakup kartu risiko ringkas, prioritas per risiko, dan perbandingan kuartal. Tombol tindak lanjut melanjutkan chat; perubahan data tetap melalui tinjauan.</p>
        <p className="text-sm text-muted-foreground">Agent memakai canvas dan gutter halaman standar, dengan workspace transparan tanpa panel luar. Halaman awal hanya menampilkan judul, deskripsi, composer multiline, Skills otomatis, lampiran, catatan persetujuan, dan riwayat/saran. Menu Agent berada tepat di bawah Dashboard. Toolbar percakapan hanya tampil saat membuka percakapan yang sudah berisi pesan. Pesan pengguna memakai bubble putih dengan border lembut; tautan kode pada tabel tanpa underline. Composer percakapan berjarak 24px dari bawah viewport dengan penyesuaian safe area mobile. Waktu mulai percakapan tampil sekali di atas tengah; waktu per pesan dan footer metadata hasil dihapus. Unduhan hanya menampilkan tombol Excel/PDF tanpa label pengantar. Aksi paket memakai label Batal dan Terapkan; tanpa subjudul revisi/jumlah usulan dan tanpa keterangan jumlah perubahan di atas tombol. Rincian usulan tidak menampilkan blok referensi teknis atau petunjuk format JSON. Aktivitas, snapshot, serta paket tinjauan tetap memakai komponen hasil yang sama. Contoh berikut memakai komponen produksi dengan data ilustratif; tidak mengubah data bisnis.</p>
        <p className="text-sm text-muted-foreground">Editor usulan memakai isian biasa dan daftar yang dapat ditambah: penyebab, dampak, mitigasi, serta rincian profil. Tidak ada editor JSON. Fokus pengetikan bertahan saat mengirim. Membuka rincian menghentikan scroll otomatis; Ke pesan terbaru melanjutkannya. Disclosure pada layar sentuh memiliki area minimum 44px.</p>
        <AgentSystemExample />
        <p className="text-sm text-muted-foreground">Usulan laporan mitigasi memakai form Penanganan yang sama: Catatan Pelaksanaan wajib 10–1000 karakter dan Link Bukti opsional berupa satu URL HTTP/HTTPS. Tidak ada field Hasil, Hambatan, atau pilihan Status. Setelah ditinjau dan diterapkan, laporan ditandai sudah dilaporkan.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Detail risiko · Tab pill</h2>
        <p className="text-sm text-muted-foreground">Ringkasan, Pemantauan, dan Penanganan memakai pill terpisah seperti referensi Linear: 32px di desktop, target sentuh 44px, border tipis dan surface netral. Tab aktif memakai latar muted; fokus keyboard tetap terlihat. Isian tidak hilang saat pindah tab. Pemantauan menampilkan periode, status, skor final dan tanggal pembaruan, dengan tautan ke detail pemantauan serta kondisi loading/error/retry/kosong. Data dibatasi risiko atau grup versinya dan dimuat lengkap saat tab dibuka. Penanganan memakai komposisi tabel yang sama dengan halaman daftar: CollectionToolbar, filter dinamis, CollectionTableCard, dan MitigationCollectionTable bersama. Kolom Penanganan mengikuti Rencana/PIC/Periode/Deadline/Status melalui MitigationTaskTable yang sama dengan halaman daftar, termasuk menu Isi laporan/Lapor terlambat dan form pelaporan. Tab Mitigasi dihapus; rencana tetap tersedia di Ringkasan. Contoh pelaporan hanya memperbarui data ilustrasi lokal. Header, inset sel, tinggi baris, hover, dan akses/periode tetap konsisten. Mode tambah risiko tetap memakai form tunggal. Transisi warna 150ms memberi feedback segera tanpa menunda pemilihan; reduced motion menonaktifkan gerakan.</p>
        <p className="text-sm text-muted-foreground">Semua section panel kanan detail risiko (Properti, Penanganan, Kejadian, Catatan, Riwayat Versi) memakai judul 14px semibold, capitalize dan text-primary. Isi section, label, nilai, penghitung, tanggal, pesan status dan riwayat versi memakai 14px; badge status tetap mengikuti ukuran badge bersama 12px. Judul Riwayat versi dan Catatan tidak menampilkan penghitung; metadata versi hanya memuat tanggal dan periode tanpa kode risiko.</p>
        <RiskDetailTabsExample />
        <p className="text-sm text-muted-foreground">Panel kanan detail Risiko dan Kertas Kerja memakai DetailSidePanel yang sama: inset Card standar, judul 14px semibold tanpa uppercase, label dan nilai 14px. Semua properti panel kanan memakai PropertyList: ikon 16px dan label muted di kolom kiri, nilai rata kiri sejajar dalam kolom kanan dengan gap 16px dan tanpa garis antarbaris; nilai panjang membungkus. Jarak seksi 16px, serta pemisah putus-putus dengan padding atas 20px. Badge mempertahankan ukuran bersama. Histori tanda tangan Kertas Kerja tidak menampilkan paragraf deskripsi tahap; nama, jabatan, status, dan waktu tanda tangan tetap terlihat.</p>
        <DetailSidePanelExample />
        <p className="text-sm text-muted-foreground">Panel kanan detail Risiko selebar 420px mulai xl dan menumpuk di layar sempit. Empty state dan pesan prasyarat di seluruh section panel kanan Risiko tidak memakai background warna, rounded box, atau inset horizontal tambahan; tampil sebagai teks muted dengan padding vertikal. Pesan kosong “Belum ada catatan.” memakai 12px muted. Catatan berada paling bawah di dalam DetailSidePanel, dengan chatbox Pihak terkait dan isi catatan di bawah thread. Chatbox mengikuti referensi editor post: shell abu-abu lembut, label Komentar, editor putih membulat dengan satu border, field pihak terkait di atas divider, area tulis tanpa border terpisah, dan tombol Kirim di kanan bawah. Catatan hanya memiliki Pihak terkait dan Isi catatan; tanggal dan metode dihapus dari API serta database. Tidak ada modal tambah/detail; daftar lengkap dibuka inline. Pengiriman mengikuti izin, menampilkan status proses/error, dan mempertahankan isian jika gagal.</p>
        <RiskCommentsExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Public homepage</h2>
        <p className="text-sm text-muted-foreground">Homepage memakai komposisi editorial dengan judul rata kiri, preview produk berlapis, grid fitur terbuka, dan alur kerja berselang-seling. Surface marketing tetap terang, dengan Geist dan palet netral aplikasi. MarketingActions menggunakan Button resmi dengan presentasi pill 40px, atau 32px di navigasi. Screenshot adalah preview statis tanpa badge atau caption; angka preview bukan data pengguna. Section fitur memakai MarketingFeatures yang sama dengan homepage: register risiko dan AI Agent. Panel AI Agent menggantikan ekstraksi dokumen, dengan contoh percakapan statis, ikon Agent, dan tautan Buka AI Agent ke /agent. Teks preview tetap terbaca dan panel bertambah tinggi di mobile. Baris tiga fitur kecil dihapus; screenshot notulen dipakai pada langkah pertama alur kerja, menggantikan preview ekstraksi risiko dari dokumen yang berulang. Preview lain menampilkan dashboard, penanganan, pemantauan, dan kertas kerja, dengan rasio mengikuti sumber. Frame memakai komposisi preview yang diperbesar. Seluruh latar preview memakai gradasi abu-abu kabur dan tekstur grain halus seperti referensi, melalui previewBackdrop bersama tanpa foto landscape; screenshot produk tetap sama. Hero memakai panel ringkasan berlapis. Section panduan membagi kolom pengantar dan daftar panduan sama lebar (50/50 setelah gap), lalu menumpuk menjadi satu kolom di bawah 760px. Grid dan navigasi beradaptasi di mobile, dengan fokus keyboard dan reduced motion. Aset logo memakai PNG transparan; Kemenkes memakai versi 1792×500px dari pedoman identitas resmi, bukan gambar header 150×36px. PNG logo disajikan langsung tanpa kompresi ulang lossy. Logo memakai warna asli tanpa grayscale, perubahan opacity, blending, atau fade tepi. Setiap gambar memakai area 200×56px dengan object-fit contain, terpusat dalam slot 200×64px yang konsisten. Dekorasi hero tetap berada dalam gutter pada tablet agar halaman tidak melebar. Carousel logo lima instansi berada di bawah hero dan bergerak dari kiri ke kanan dalam loop 45 detik, tanpa tombol jeda, dengan jeda saat hover dan versi statis untuk reduced motion. Navigasi desktop terpusat dengan kolom samping sama lebar. Footer hanya memakai wordmark, tautan, dan copyright tanpa slogan. CTA Semua panduan dan Kenali register risiko dihapus; seluruh artikel alur kerja tidak memakai nomor langkah maupun tautan CTA Jelajahi. Contoh di bawah memakai komponen produksi yang sama dengan homepage.</p>
        <p className="text-sm text-muted-foreground">Skala tipografi homepage: hero 36–58px, judul section 28–40px, judul alur 24–28px, judul kartu 20px, body 16px, lead 18px, navigasi dan tombol 14px, caption 13px, microcopy minimal 12px. Judul memakai balance, deskripsi memakai pretty dengan panjang baris terbatas, dan line-height body 1.6. Panel asisten mempertahankan ukuran teks di mobile; heading panjang memakai line-height minimal 1.4. Navigasi dilipat hingga 900px agar label tidak bertabrakan dengan aksi akun. Footer menjadi dua kolom pada layar hingga 400px agar tautan tetap terpisah. Specimen berikut memakai token CSS produksi yang sama.</p>
        <p className="text-sm text-muted-foreground">Animasi homepage memakai transitions-dev: hero masuk bertahap dengan pergeseran 8px; fitur, alur kerja, dan kelompok konten muncul sekali saat masuk viewport melalui MarketingReveal. Menu mobile memakai card resize 300ms, panel reveal, dan icon swap 200ms. Konten tetap terlihat tanpa JavaScript dan pada reduced motion; menu tertutup memakai inert. Contoh produksi di bawah memperlihatkan reveal saat masuk viewport.</p>
        <p className="text-sm text-muted-foreground">Copy homepage memakai bahasa Indonesia yang langsung, sentence case, dan istilah aplikasi yang konsisten: profil risiko, penanganan, mitigasi, pemantauan, kertas kerja, dan penanggung jawab. Jelaskan tindakan yang dapat dilakukan tim; hasil AI berupa kandidat yang perlu ditinjau sebelum dibuat menjadi draf. CTA memakai Daftar akun dan Baca panduan. Bagian penutup menjelaskan bahwa akun memerlukan persetujuan admin. Label navigasi dan tautan menyebut tujuan: Fitur, Cara kerja, Kontrol akses, Panduan, serta panduan ekstraksi risiko dari dokumen dan penanganan. Grup organisasi menjelaskan cakupan laporan; API key menjelaskan akses peta risiko dari aplikasi lain. Specimen dan contoh di bawah mengikuti copy produksi.</p>
        <MarketingSystemExample />
        <LogoCarousel />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Ikonografi</h2>
        <p className="text-sm text-muted-foreground">
          Ikon aplikasi menggunakan Hugeicons melalui shared icon layer, kecuali
          chevron dari Lucide serta ikon Agent dan lampiran berupa SVG khusus sesuai referensi.
        </p>
        <IconographyExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Settings modal</h2>
        <p className="text-sm text-muted-foreground">Dialog dua kolom dengan navigasi dan pencarian di kiri, serta konten yang dapat digulir di kanan. Lebar maksimal 1100px, tinggi 82svh, dan navigasi 240px. Pada layar kecil, menu berada di atas konten. Item menu aktif memakai teks dan ikon `primary`, sedangkan item inactive memakai `secondary-foreground`. Account memakai baris label dan isian responsif; Keamanan menjadi menu tersendiri untuk password dan perangkat aktif dalam satu Card dengan separator seperti Account, menggunakan mockup perangkat lokal; helper password memakai `text-tertiary-foreground`; Preferences menyimpan pilihan tema.</p>
        <SettingsModalExample />
        <p className="text-sm text-muted-foreground">Menu API key mengikuti pola list pada Account: satu Card dengan baris API key dan action, waktu pembaruan, serta penggunaan terakhir; separator memisahkan tiap baris, dan label serta nilai berada di sisi berlawanan. Baris dapat membungkus pada layar sempit. Super admin memilih organisasi di atas Card. Satu key dikelola bersama per organisasi. Generate menampilkan key lengkap sekali dalam Dialog. Regenerate memakai Dialog yang sama untuk konfirmasi dan key baru, lalu permukaan yang sama tumbuh atau menyusut mengikuti tinggi konten terukur dengan continuity transition 300ms, dibatasi viewport dan menghormati reduced motion; ikon Salin di dalam kolom key menyalin ke clipboard. Konfirmasi menjelaskan bahwa key lama langsung tidak berlaku. Footer Batal dan Tutup memakai outline. Key lengkap hanya disimpan dalam memori selama modal terbuka.</p>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Grafik dan visualisasi risiko</h2>
        <p className="text-sm text-muted-foreground">Semua grafik data memakai ChartContainer shadcn dengan ChartConfig untuk label dan warna seri serta ChartTooltip bawaan. Legenda di dalam plot memakai ChartLegend; legenda kontekstual di luar plot tetap menjadi komposisi halaman. Tinggi grafik ditetapkan oleh layout halaman. Recharts adalah renderer di dalam komponen Chart shadcn; tidak ada library grafik atau kerangka chart custom kedua. Progres pemantauan Kertas Kerja memakai RadialBarChart ringkas dengan persentase di tengah, jumlah risiko sebagai teks `text-secondary-foreground` di samping tanpa badge, track muted, dan arc primary hingga semua monitoring selesai lalu memakai success. Heatmap risiko 5×5 tetap berupa matriks domain dengan label sumbu dan legenda yang terbaca.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Kartu skor risiko</h2>
        <p className="text-sm text-muted-foreground">Skor risiko dan target penurunan pada form risiko, serta skor risiko observasi pada form detail pemantauan, memakai satu tile berwarna penuh tanpa bayangan, selebar maksimal 280px dan setinggi minimal 256px, dengan sudut 24px serta inset 20px. Warna mengikuti form: sangat tinggi red-500, tinggi orange-500, sedang yellow-400, rendah green-500, dan sangat rendah green-400. Skor 48px berada di kiri atas di bawah label Skor 12px, dengan chevron di kanan atas. Nama level berada di bagian bawah, diikuti probabilitas dan dampak dalam dua kolom dengan label 12px serta nilai tabular 24px. Teks neutral-950 menjaga kontras pada permukaan terang di kedua tema. Klik seluruh tile membuka heatmap; perilaku fokus, nonaktif, dan validasi tetap tersedia.</p>
        <RiskScoreCardExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Navigasi sidebar</h2>
        <p className="text-sm text-muted-foreground">Item dalam satu grup berjarak 4px; ruang antarseksi lebih besar. Label grup memakai text-tertiary-foreground, item navigasi yang tidak aktif memakai text-muted-foreground untuk label dan ikon, item aktif memakai text-sidebar-accent-foreground, dan hover memakai sidebar-accent (#e5e5e5), sedangkan item aktif memakai active (#dddddd). Pergantian menu aktif berlangsung langsung tanpa animasi slide. Sidebar desktop memakai border kanan 1px dengan token border untuk memisahkan area utama, baik saat terbuka maupun diciutkan; warna mengikuti tema terang dan gelap, tanpa shadow. Logo Manrisk memakai aset pengguna Cascading Black Rounded Panels.png melalui ManriskMark, menggantikan simbol sebelumnya. PNG asli 1312×1199px dipertahankan dalam viewport SVG sesuai batas transparansinya: ukuran 24px di kiri wordmark dengan jarak 8px, serta 20px pada sidebar mobile. Simbol asli transparan dipertahankan dan dibalik menjadi putih pada permukaan gelap. Favicon memakai simbol yang sama dengan latar putih permanen. Wordmark Manrisk lowercase berada pada SidebarHeader desktop dengan ukuran 24px, bobot semibold, dan tracking -0,4px; posisinya sejajar dengan tepi kiri ikon navigasi dan tersembunyi saat sidebar diciutkan. Bar mobile memakai wordmark 24px; sidebar mobile tetap memasangkan ikon dengan label 18px. Di footer, avatar 24px dan ikon bantuan 16px berada di tengah kontrol masing-masing; label akun 14px memakai line-height 20px dan bergeser 1px ke bawah untuk keseimbangan optis. Menu pengguna membuka popover di atas tombol pengguna dengan sisi awal sejajar; isinya hanya Pengaturan dan Logout, tanpa nama maupun unit kerja di header dan tanpa menu Settings. Item Pengaturan memakai ikon Settings2 dengan ukuran 16px, selaras dengan ikon Logout. Untuk operator unit, urutan menu utama adalah Dashboard, To-Do, lalu Agent; To-Do memakai BriefcaseIcon dari lapisan ikon bersama Hugeicons. Bar navigasi mobile memakai divider bawah `sidebar-border` (#f6f6f6) dan tidak menampilkan breadcrumb.</p>
        <SidebarMotionExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Dokumentasi pengguna</h2>
        <p className="text-sm text-muted-foreground">Workspace publik tanpa topbar aplikasi, dengan Sidebar dan SidebarNavItem yang memakai surface, tipografi, dan perilaku seleksi yang sama seperti MANRISK. Tautan topik dan footer Kembali ke aplikasi tidak memakai ikon awal agar teks mulai pada inset standar item; tombol tutup Sheet mobile tetap memakai ikon fungsional. Artikel maksimal 48rem; daftar bagian 13rem menempel di kanan pada layar besar. Body artikel 16px dengan line-height 1.6, H1 32px/1.1, H2 20px/1.2, dan microcopy 14px atau 12px dengan line-height yang lebih rapat. Batasi blok prosa panjang sekitar 72 karakter per baris, sementara screenshot dan tabel kolom tetap menggunakan lebar artikel. Terapkan text-wrap: pretty ke seluruh area dokumentasi, termasuk sidebar, daftar bagian, artikel, tabel, caption, dan navigasi. Artikel memiliki bagian datar, pemisah struktural, langkah bernomor, referensi kolom, diagram responsif, serta screenshot asli aplikasi berbingkai putih di atas foto lanskap yang konsisten, dengan tepi putih halus dan bayangan lembut tanpa outline gelap di sekitar tangkapan layar. Gunakan tangkapan dari layar aplikasi yang relevan; jangan buat komponen mockup khusus untuk dokumentasi. Secara default hindari identitas pengguna dan catatan operasional pada aset publik. Jika pengguna secara eksplisit menyediakan screenshot berisi data untuk dokumentasi, gunakan screenshot terpilih dan beri caption bahwa nilainya merupakan snapshot yang dapat berubah menurut akun, organisasi, atau periode. Pada mobile, gambar dan frame tetap memenuhi lebar artikel tanpa overflow; menu memakai Sheet dan daftar isi menjadi disclosure. Tidak ada pencarian atau administrasi. Tautan artikel, anchor bagian, serta navigasi sebelumnya/berikutnya tetap tersedia.</p>
        <DocumentationExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Aksi dan status</h2>
        <Card>
          <CardHeader>
            <CardTitle>Button dan Badge</CardTitle>
            <CardDescription>Button pada semua ukuran memakai radius 6px melalui token rounded-control. Varian bawaan untuk aksi dan penanda status, termasuk alur panduan publik, persetujuan, laporan, kertas kerja, dan ringkasan kejadian. Status Digantikan memakai Badge sekunder yang netral dan tetap tampak di riwayat audit, bukan sebagai data lifecycle aktif. Tombol outline memakai surface putih di light mode dengan border terlihat; pada dark mode memakai surface gelap. Tombol aksi login dan registrasi memakai tinggi 44px, lebar penuh, bentuk pill, dan jarak vertikal 4px; aksi sekunder memakai Button outline. Trigger menu dan aksi sekunder seperti Import memakai outline dengan satu ikon konteks tanpa chevron trailing. Menu aksi memakai satu surface popover dengan row DropdownMenuItem native, tanpa Card bersarang.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button>Utama</Button>
            <Button disabled>Utama nonaktif</Button>
            <Button variant="secondary">Sekunder</Button>
            <Button variant="outline">Outline</Button>
            <div className="flex w-full flex-col gap-1">
              <Button className="h-11 w-full rounded-full">Masuk (login)</Button>
              <Button asChild variant="outline" className="h-11 w-full rounded-full"><Link href="/register">Daftar akun (login)</Link></Button>
            </div>
            <Button><Plus data-icon="inline-start" />Dengan ikon</Button>
            <AccentButton icon={<Plus />}>Aksi aplikasi</AccentButton>
            <ActionButton icon={<Plus />}>Aksi sekunder</ActionButton>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destruktif</Button>
            <Button disabled><Spinner data-icon="inline-start" aria-hidden="true" />Memproses</Button>
            <Badge>Default</Badge>
            <Badge variant="secondary">Sekunder</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Perlu perhatian</Badge>
            <Badge variant="secondary">Draf</Badge>
            <Badge variant="secondary">Digantikan</Badge>
            <Badge variant="default" className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Final</Badge>
            <Badge variant="default" className="border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Menunggu</Badge>
            <Badge variant="default" className="border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Sedang</Badge>
          </CardContent>
        </Card>
        <BadgeSystemExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Toast (Sonner)</h2>
        <p className="text-sm text-muted-foreground">Semua toast memakai Sonner melalui satu Toaster global di root layout, mengikuti tema aplikasi dengan surface neutral dan ikon status Hugeicons di kanan bawah. Pilih pesan, berhasil, gagal, informasi, atau peringatan sesuai hasil aksi. Proses async memakai toast.promise agar status memproses berakhir dengan berhasil atau gagal; validasi field wajib tetap inline.</p>
        <ToastExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Formulir</h2>
        <p className="text-sm text-muted-foreground">Error validasi diteruskan ke kontrol melalui aria-invalid atau prop invalid agar border merah terlihat. List dan tabel menampilkan border pada kotak kontennya saja, termasuk border merah saat invalid; tombol tambah memakai variant ghost tanpa border terlihat. Input baris tetap memakai tampilan standar, dengan pesan error pada baris terkait.</p>
        <p className="text-sm text-muted-foreground">Header login menampilkan wordmark Manrisk berukuran 24px dengan teks `text-tertiary-foreground` dan underline putus-putus 2px ber-offset 4px, di atas judul “Masuk untuk melanjutkan” berukuran 16px. Jarak di antara keduanya adalah 16px (`gap-4`); jarak dari grup kredensial ke tombol aksi juga 16px (`gap-4`). Autofill NIP dan password mempertahankan surface putih dan teks neutral gelap agar warna bawaan browser tidak membuat kedua field tampak berbeda.</p>
        <p className="text-sm text-muted-foreground">Bagian formulir memakai jarak dan inset Card bawaan; judul dan deskripsi berada di CardHeader, diikuti isian dalam CardContent. Panel Properti di sisi kanan form risiko baru menampilkan Status, Kode risiko, Versi, dan Periode untuk nilai siklus asesmen.</p>
        <p className="text-sm text-muted-foreground">Halaman detail formulir dokumen memakai kontainer `w-full max-w-6xl mx-auto`: konten bertambah mengikuti ruang shell sampai batas 1152px, lalu tetap terpusat. Pada viewport sempit kontainer menyusut tanpa lebar tetap; margin internal bagian menjaga bidang isian dan teks tetap sejajar.</p>
        <p className="text-sm text-muted-foreground">Form registrasi publik memakai shell autentikasi yang sama dengan login: tanpa Card, kolom tengah `max-w-3xl`, latar dan wordmark yang sama, serta judul 16px. Header dan deskripsi registrasi rata kiri, sejajar dengan label field. Semua field tetap berlabel terlihat, tersusun dua kolom pada layar medium ke atas dan satu kolom pada layar sempit, dengan jarak kolom 8px dan jarak baris 16px. Input, InputGroup, dan combobox setinggi 44px bersurface putih; teks isian berwarna neutral gelap dan placeholder muted agar tetap terbaca pada kedua tema. Alert berada di urutan awal form dan membentang pada kedua kolom. Tombol Daftar sekarang dan tautan “Sudah punya akun? Masuk” memakai tinggi 44px, lebar penuh, bentuk pill, dan jarak 4px; action sekunder memakai outline. Deskripsi persetujuan admin tetap ditampilkan.</p>
        <p className="text-sm text-muted-foreground">Aksi formulir mengonfirmasi data yang berhasil disimpan dan menampilkan pesan kegagalan yang bisa ditindaklanjuti. Isian wajib memberi pesan inline pada kontrol terkait. Skor risiko yang terisi otomatis ditandai sebagai nilai awal dan menjelaskan apa yang perlu dipastikan sebelum finalisasi.</p>
        <p className="text-sm text-muted-foreground">Pemilih periode pemantauan menampilkan status tiap kuartal sebagai Badge: Belum dipantau, Sedang dipantau, Selesai, Kuartal berjalan, atau Tidak berlaku. Kuartal sebelumnya menjadi pilihan awal; opsi kuartal berjalan baru muncul pada bulan ketiga kuartal tersebut. Modal menjelaskan periode yang masih berlangsung, dan meminta kuartal sebelumnya diselesaikan bila masih menjadi kewajiban. Pemilih periode Kertas Kerja hanya menampilkan kuartal sebelumnya dan kuartal berjalan mulai bulan ketiganya, menandai kuartal berjalan, dan meminta konfirmasi sebelum melanjutkan.</p>
        <MonitoringCycleSelectExample />
        <Card>
          <CardHeader>
            <CardTitle>Kontrol bawaan</CardTitle>
            <CardDescription>Input, textarea, input group beserta tombolnya, trigger select, field combobox, dan checkbox memakai radius 6px (rounded-control), sama dengan Button. Radio dan switch mempertahankan bentuk bulat/pill. Label, input, textarea, checkbox, dan switch memakai komposisi bawaan shadcn. Semua input teks, textarea, input group, select, dan combobox nonaktif memakai surface `disabled-input-surface` (#f4f4f6 pada tema terang), border #dedee4, serta teks #30303a pada opacity penuh agar nilai tetap terbaca seperti referensi. Tema gelap memakai surface muted, border input, dan teks foreground. Token field terpisah dari teks/tombol nonaktif. Form Piagam Manrisk memberi input, textarea, dan select latar putih pada kedua tema agar isian tampak berbeda dari latar halaman. Field NIP dan Password pada login juga memakai tinggi 44px dan surface putih tanpa label terlihat di atas input; autofill menjaga surface putih dan teks neutral gelap agar pewarnaan otomatis browser tetap serasi. Placeholder muted pada kedua tema agar kontrasnya terjaga. Jarak antarfield memakai `gap-2`, sementara jarak dari grup field ke tombol aksi memakai `gap-4`. FieldLabel tetap tersedia sebagai nama aksesibel yang hanya dibaca screen reader. Tombol visibilitas password pada login dan registrasi setinggi 44px tanpa perubahan warna atau latar saat hover pada kedua tema. Petunjuk reset password berada di bawah input dengan teks 12px `text-tertiary-foreground`.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
            <Field>
              <FieldLabel htmlFor="design-system-name">Nama risiko</FieldLabel>
              <Input id="design-system-name" placeholder="Masukkan nama risiko" />
            </Field>
            <FieldGroup className="grid gap-x-2 gap-y-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="design-system-register-name">Nama lengkap</FieldLabel>
                <Input id="design-system-register-name" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-system-register-email">Email</FieldLabel>
                <Input id="design-system-register-email" type="email" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" placeholder="nama@kemenkes.go.id" />
              </Field>
            </FieldGroup>
            <FieldGroup className="gap-2">
              <Field>
                <FieldLabel htmlFor="design-system-login-nip" className="sr-only">NIP (login)</FieldLabel>
                <Input id="design-system-login-nip" data-autofill-surface="white" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" placeholder="Masukkan NIP" />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-system-login-password" className="sr-only">Password (login)</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white">
                  <InputGroupInput id="design-system-login-password" type="password" data-autofill-surface="white" className="h-auto self-stretch bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" placeholder="Masukkan password" />
                  <InputGroupAddon align="inline-end" className="py-0">
                    <InputGroupButton size="icon-xs" className="h-11 w-11 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!" aria-label="Tampilkan password"><Eye aria-hidden="true" /></InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription className="text-xs text-tertiary-foreground">Hubungi administrator jika perlu reset</FieldDescription>
                <p className="text-xs text-muted-foreground">Input password memakai h-auto self-stretch agar permukaan autofill tetap di dalam border InputGroup.</p>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="design-system-description">Deskripsi</FieldLabel>
              <Textarea id="design-system-description" placeholder="Jelaskan risiko" />
            </Field>
            <FieldGroup className="gap-3 rounded-xl border border-border/70 bg-background p-4">
              <Field>
                <FieldLabel htmlFor="design-system-charter-title">Judul Piagam</FieldLabel>
                <Input
                  id="design-system-charter-title"
                  className="bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500"
                  placeholder="Piagam Manajemen Risiko 2026"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="design-system-charter-scope">Ruang lingkup</FieldLabel>
                <Textarea
                  id="design-system-charter-scope"
                  className="bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500"
                  placeholder="Tuliskan ruang lingkup penerapan manajemen risiko."
                />
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="design-system-disabled-input">Input nonaktif</FieldLabel>
              <Input id="design-system-disabled-input" disabled defaultValue="Risiko sudah terkunci" />
            </Field>
            <Field><FieldLabel htmlFor="design-system-disabled-textarea">Textarea nonaktif</FieldLabel><Textarea id="design-system-disabled-textarea" disabled defaultValue="Rencana mitigasi telah difinalisasi dan tetap dapat dibaca." /></Field>
            <Field><FieldLabel htmlFor="design-system-disabled-group">Input group nonaktif</FieldLabel><InputGroup><InputGroupInput id="design-system-disabled-group" disabled defaultValue="webcredentials:manrisk.example" /><InputGroupAddon align="inline-end"><span className="text-xs" aria-hidden="true">ID</span></InputGroupAddon></InputGroup></Field>
            <Field>
              <FieldLabel htmlFor="design-system-search">Pencarian dengan aksi</FieldLabel>
              <InputGroup>
                <InputGroupInput id="design-system-search" placeholder="Cari..." />
                <InputGroupAddon align="inline-end"><InputGroupButton>Cari</InputGroupButton></InputGroupAddon>
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="design-system-risk-search">Pencarian risiko</FieldLabel>
              <InputGroup>
                <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                <InputGroupInput id="design-system-risk-search" className="placeholder:text-tertiary-foreground" placeholder="Cari kode atau nama risiko" />
              </InputGroup>
            </Field>
            <FieldLabel>
              <Field orientation="horizontal" className="items-start">
                <Checkbox id="design-system-linked-risk" />
                <span className="min-w-0">
                  <span className="block font-mono text-xs leading-4 text-muted-foreground">R-238</span>
                  <span className="mt-0.5 block text-sm text-foreground">Risiko dengan nama yang lebih panjang</span>
                </span>
              </Field>
            </FieldLabel>
            <Field orientation="horizontal">
              <Checkbox id="design-system-confirm" />
              <FieldLabel htmlFor="design-system-confirm">Sudah diperiksa</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch id="design-system-active" />
              <FieldLabel htmlFor="design-system-active">Aktif</FieldLabel>
            </Field>
            </FieldGroup>
            <Alert className="mt-4"><AlertDescription>Pesan formulir memakai Alert bawaan.</AlertDescription></Alert>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Impor dokumen dengan AI eksternal menampilkan pemberitahuan ini sebelum area unggah. Pemberitahuan tetap terlihat setelah file dipilih, tanpa dialog atau checkbox tambahan.</p>
              <ExternalAIProcessingNotice />
              <p className="text-sm text-muted-foreground">Impor laporan mitigasi mengikuti organisasi akun dan profil risiko final yang masih aktif. Organisasi, periode, dan kode risiko tidak ditampilkan sebagai kontrol cakupan. Maksimal 50 tugas terbuka dikirim; jika kandidat terlalu banyak, proses berhenti dengan pesan untuk memakai pelaporan manual.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button>Simpan</Button>
          </CardFooter>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Laporan progres penanganan</h2>
        <p className="text-sm text-muted-foreground">
          Link bukti memakai satu input teks biasa dan menerima satu URL per laporan.
        </p>
        <Card>
          <CardContent>
            <MitigationProgressFormExample />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Kategori risiko</h2>
        <p className="text-sm text-muted-foreground">
          Indikator kategori memakai titik warna dan label yang selalu terlihat. Donut kategori risiko di overview memakai token warna yang sama, termasuk fallback muted untuk kategori tanpa pemetaan. Tidak ada border atau background tambahan; warna hanya menjadi penanda visual pendamping teks.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>RiskCategoryIndicator</CardTitle>
            <CardDescription>Warna kategori memakai token Tailwind 400: Kebijakan blue-400, Operasional emerald-400, Kepatuhan yellow-400, Fraud–Korupsi red-400, Reputasi fuchsia-400, dan Legal indigo-400.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-x-6 gap-y-3">
            {[
              "kebijakan",
              "operasional",
              "kepatuhan",
              "fraud_korupsi",
              "reputasi",
              "legal",
            ].map((category) => (
              <RiskCategoryIndicator key={category} category={category} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-medium">Modal formulir bertahap</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Modal terpusat memakai inset 8px, lebar maksimal 3xl, sudut rounded-2xl, dan batas tinggi viewport.
          Judul, isian, serta aksi sejajar dalam inset yang sama. Header dan footer
          dipisahkan dari area isian yang dapat digulir; field memakai komposisi Field bawaan.
          Aksi berlabel Batal, Cancel, atau Tutup di footer dialog berada di sisi kanan dan memakai outline; kontrol tutup berbasis ikon tetap memakai hit area ringkas.
          Semua subtitle atau deskripsi pada modal memakai komposisi Description dengan
          text-secondary-foreground untuk menjelaskan tujuan atau konsekuensi tindakan.
          Modal konfirmasi finalisasi pemantauan memakai scrim redup tanpa blur agar panel ringkasan yang sticky tetap stabil saat modal dibuka.
          Jika modal memerlukan pemeriksaan awal, tampilkan modal segera. Teks dan ikon tombol di section serta modal tetap sama; nonaktifkan aksi konfirmasi sampai pemeriksaan selesai.
          Catat Kejadian hanya meminta tanggal melalui Calendar shadcn di dalam Popover;
          input jam tidak ditampilkan.
          Saat isi langkah berubah, tinggi modal mengikuti konten dengan transisi grow/shrink
          300ms dan berhenti pada batas viewport. Alur Detail Laporan Penanganan memakai satu
          Dialog yang sama: klik Isi laporan memakai continuity transition/layout animation
          untuk mengubah detail menjadi form, lalu Batal kembali ke detail tanpa membuka modal kedua.
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Dialog tambah/edit grup memakai lebar maksimal 2xl dan batas tinggi viewport. Header serta footer tetap terlihat, sementara isi formulir dapat digulir. Isian nama dan deskripsi memakai Field; helper nama memakai FieldDescription 12px. Pilihan anggota memakai Combobox multi-select: organisasi terpilih tampil sebagai chip yang bisa dihapus, sedangkan popover mencari turunan owner di server berdasarkan nama, lokasi, dan level dengan debounce 250ms serta maksimal enam hasil teratas. Popup anggota menerima hover dan klik; interaksi di dalam popup tidak menutup Dialog, sementara area halaman di belakang modal tetap nonaktif. Tombol pilih semua dan pilih hasil pencarian memuat seluruh organisasi yang cocok secara paginasi; kosongkan pilihan tetap tersedia. Pada header koleksi grup, tombol Tambah Grup dan CollectionSearchField sama-sama setinggi 32px. Konfirmasi hapus tetap ringkas dengan aksi destruktif di sisi kanan footer.
        </p>
        <IncidentFormModalExample />
        <h3 className="text-base font-medium">Ekstraksi risiko dari dokumen</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Gunakan label Ekstrak risiko dari dokumen. Unggah satu PDF atau XLSX maksimal 1 MB, seperti laporan, kebijakan, rencana kerja, kontrak, notulen, atau SOP. AI menemukan kandidat risiko beserta kutipan sumber untuk ditinjau sebelum dibuat menjadi draf. Temuan dikelompokkan menurut bagian atau topik dokumen; dokumen tidak harus memiliki tahapan proses.
          Modal Buat draf risiko memakai lebar maksimal 768px (sm:max-w-3xl) untuk judul dan deskripsi panjang, dengan sumber serta tiga isian tetap satu kolom. Pada layar kecil, sisakan jarak 16px dari setiap sisi viewport.
        </p>
        <h3 className="text-base font-medium">Ekstraksi dokumen menjadi kejadian</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">Gunakan workspace dokumen bersama untuk satu PDF atau XLSX maksimal 1 MB. Hanya kejadian yang sudah terjadi menjadi kandidat. Tinjau satu kandidat melalui form Kejadian; tanggal dan tingkat yang tidak tertulis tetap kosong, risiko dipilih manual, dan seluruh kutipan sumber ditampilkan. Nama dokumen dan kutipan ikut tersimpan pada detail Kejadian. Kandidat tersimpan ditandai Sudah disimpan. Contoh ini memakai panel tinjauan dan form produksi; penyimpanan dinonaktifkan pada contoh.</p>
        <RiskEventExtractionExample />
        <h3 className="text-sm font-medium">Daftar rencana mitigasi</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">Rencana Penanganan di tab Ringkasan detail risiko memakai varian tabel datar MitigationPlanList: tanpa pencarian, filter, atau label Rencana Mitigasi tambahan; tombol Minta rekomendasi mitigasi sejajar kiri di atas tabel; tombol Tambah Rencana Penanganan di bawah tabel sejajar kiri dengan jarak 12px, header putih 12px dan divider tipis tanpa bingkai atau shadow. Empty state memakai ikon berpusat dengan tinggi minimum 320px. Aksi edit/hapus dan validasi tetap mengikuti form; risiko terkunci tetap baca-saja. Tab Pemantauan menggantikan tab Mitigasi untuk melihat riwayat pemantauan. Pemakaian lain dapat mempertahankan varian daftar. Daftar hanya menampilkan isian langkah pertama; rincian langkah kedua tetap di modal. PIC memakai shadcn DropdownMenu dengan ukuran dan layout bawaan serta trigger outline yang sama seperti tipe mitigasi, ditambah kolom pencarian tanpa ikon, inset horizontal sejajar dengan opsi, dan tanpa padding vertikal tambahan; tombol clear Hugeicons X muncul saat pencarian berisi teks. Pencarian user berjalan ke server setelah jeda 300ms, dan input tetap bisa diketik tanpa tertangkap navigasi menu. Avatar Dither Kit berukuran 18px dan polanya dihasilkan dari nama PIC; PIC wajib dipilih sebelum lanjut atau simpan. Pada langkah pertama, rencana penanganan selebar penuh, sedangkan PIC dan tipe mitigasi berdampingan mulai breakpoint sm dan menumpuk di layar kecil. Klik baris untuk edit, atau gunakan menu aksi untuk edit dan hapus. Pilihan tipe memakai dropdown radio bersama. Tambah atau edit membuka modal dua langkah seperti Catat Kejadian: rencana, PIC, dan tipe pada langkah pertama; seluruh rincian pada langkah kedua. Kembali mempertahankan isian, Batal atau menutup modal membuang perubahan, dan Simpan memperbarui daftar.</p>
        <p className="text-sm text-muted-foreground">Tabel Rencana Penanganan memakai header abu-abu muda 40px dengan teks reguler 12px, sudut luar radius control, tanpa border bawah header, baris putih minimal 48px, padding horizontal 12px dan vertikal sel isi 8px, dan garis pemisah tipis. Baris dan judul rencana tidak berubah warna saat hover; indikator fokus keyboard dan aksi edit/menu tetap tersedia.</p>
        <MitigationPlanListExample />
        <p className="max-w-2xl text-sm text-muted-foreground">
          Risiko utama (skor risiko minimal 10) dengan pilihan Mitigasi wajib memiliki minimal satu rencana mitigasi baru sebelum diajukan atau difinalisasi. Pengendalian yang sudah ada saja belum memenuhi persyaratan ini. Draft tetap dapat disimpan tanpa rencana mitigasi. Form menampilkan ketentuan pada bagian Rencana Penanganan dan pesan validasi berbahasa Indonesia di bawah daftar sebelum mengirim permintaan.
        </p>
      </section>

      <section className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-medium">Drawer detail</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Drawer detail dibuka dari sisi kanan dengan inset 8px agar tetap terasa sebagai panel yang melayang di atas workspace. Lebarnya tetap ringkas, header dan body punya batas yang jelas, skor menjadi fokus pertama, lalu properti sumber—termasuk status, kode, kategori, dan versi—tersusun dalam baris dua kolom yang aman untuk teks panjang. Nama risiko memakai bobot normal agar skor tetap menjadi fokus.
        </p>
        <RiskDetailDrawerExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Koleksi dan toolbar</h2>
        <p className="max-w-[75ch] text-sm text-muted-foreground">
          Layout laporan memakai jarak 24px dari filter ke laporan, 32px antarbagian, dan 24px antarkartu ringkasan. Konteks periode dan tindak lanjut sejajar dalam dua kolom mulai xl, lalu bertumpuk pada layar lebih kecil. Filter Grup selebar 16rem di desktop; Unit mengisi ruang tersisa. Pemisah tipis dengan jarak 12px mengelompokkan ringkasan scope dan aksi di footer filter. Contoh laporan memakai komponen produksi yang sama.
        </p>
        <p className="text-sm text-muted-foreground">
          Aksi Simpan draft, Finalisasi, kembali, dan pemantauan pada form Register Risiko memakai slot <code>CollectionPageHeader actionsPlacement=&quot;title&quot;</code>: sejajar vertikal dengan judul di desktop, lalu membungkus di bawah judul pada layar kecil. CollectionToolbar tepat sebelum CollectionTableCard dalam satu wrapper menyatu sebagai satu panel tanpa gap, dengan inset toolbar 12px; PageStack memberi jarak 24px untuk bagian utama. Tombol aksi kanan sejajar dengan baris search di desktop (items-start), termasuk ketika chip filter muncul atau membungkus di bawahnya. Toolbar memakai filter di kiri dan action di
          kanan. Card tabel koleksi dan panel gabungan toolbar–tabel memakai border CSS 1px table-divider dan box-shadow: none pada Card maupun pembungkus gabungannya. Footer tabel dan pagination memakai token `table-footer` (#fcfcfc); footer pagination memakai padding horizontal 20px dan vertikal 12px secara eksplisit, sejajar dengan sel tabel, tanpa bergantung pada variabel Card. CollectionTableCard memakai gap nol dan konten tanpa padding atau margin negatif agar footer langsung menempel ke baris terakhir; tinggi mengikuti konten dan kontrol membungkus pada layar sempit, sementara tombol angka dan panahnya setinggi 32px. Label informasi di footer memakai `text-secondary-foreground`. Empty state koleksi dan hasil filter memakai ilustrasi transparan di atas judul 14px normal-weight dan subtitle 12px muted, tanpa frame tambahan; lebar ilustrasi maksimal 256px, dengan ukuran 112px untuk picker dan area ringkas. Search koleksi yang persisten memakai CollectionSearchField
          yang selalu terlihat dengan tinggi compact 32px; aksi yang sejajar dengannya juga memakai tinggi 32px. ExpandableSearchField
          hanya dipakai saat ruang memang terbatas. Judul dan kode pada kolom pertama Register Risiko memakai jarak vertikal 2px (gap-0.5), sama seperti deskripsi dan kode pada tabel Kejadian Risiko. Kolom pencarian koleksi mengikuti border-input bawaan: #ececec pada tema terang dan putih 10% pada tema gelap. Semua tabel daftar utama menampilkan kolom Dibuat dari created_at/createdAt dan default Dibuat descending (terbaru dahulu), sebelum pagination di API maupun client. Pemantauan memakai created_at, bukan started_at; Organisasi juga memakai waktu dibuat, bukan nama. Kolom tanggal baru memakai CreatedAtHead/CreatedAtCell dengan format tanggal dan waktu WIB; nilai kosong berupa —. Urutan eksplisit pengguna tetap dihormati. Seluruh filter tabel daftar memakai DynamicTableFilters: search dan tombol Filter membuka pilihan field, lalu chip field/nilai aktif muncul pada baris berikutnya. Popover pilihan field dan nilai memakai layout yang sama: lebar 240px, padding 4px, baris opsi 32px dengan inset horizontal 10px, pencarian seragam, dan area scroll maksimal 256px. Editor nilai mempertahankan footer Batal/Terapkan yang ringkas dengan pemisah atas. Kedua popover langsung menampilkan kontrol tanpa judul “Filter berdasarkan”; nama aksesibel tetap tersedia. Klik chip untuk mengedit draft melalui Batal/Terapkan; ikon hapus mengembalikan default field dan Hapus semua filter mempertahankan pencarian serta scope/periode wajib. Chip baru memakai border putus-putus, chip aktif memakai border solid; seluruh kontrol, opsi, dan popover memakai radius 6px. Pilihan panjang dapat dicari, teks dan tanggal memakai editor sesuai jenisnya. Filter dari URL langsung terlihat; perubahan filter mereset pagination dan hasil dihitung dari seluruh data yang diizinkan. Register Risiko menyediakan Status, Pemantauan, Periode, Kategori, Arsip, dan Tanggal dibuat. Kertas Kerja menyediakan Status, Periode, dan Tanggal dibuat; Penanganan dan Pemantauan mempertahankan filter dan scope aslinya. Pengguna, Organisasi, Grup, Piagam, TMPMR, Perencanaan, Evaluasi, Inbox, Notulen, Eskalasi, Kejadian, serta tabel laporan memakai komponen yang sama. Filter periode mempertahankan opsi kuartal historis; periode laporan wajib tetap berupa chip yang tidak dapat dihapus. Tabel input/edit dan snapshot audit tidak diberi filter yang menyembunyikan data saat diedit atau mengubah makna snapshot. Table shell dan pagination memakai komponen shared. Empty state hasil pencarian atau filter selalu
          menjelaskan kondisinya dengan judul 14px medium, subtitle 12px muted,
          jarak 4px, dan langkah berikutnya.
          Filter Ringkasan Risiko memakai ReportFilterPanel produksi: satu periode laporan, Grup, Unit, Muat ulang data, dan Atur ulang filter. Menu Opsi laporan menyediakan Laporan lengkap Excel serta Data laporan Excel sesuai periode dan scope aktif. Data laporan Excel mengikuti file referensi: lima sheet yang sama, dengan sheet Risiko berupa tabel datar 27 kolom, header satu baris, auto-filter, dan nilai profil/observasi/target terpisah; ekspor PDF tetap dihapus. Opsi laporan sejajar dengan filter, tanpa footer atau divider tambahan. Jumlah unit terpilih diumumkan melalui live status pembaca layar; tombol Tinjau unit tetap tersedia. Filter langsung diterapkan dengan validasi akses dan preferensi per akun.

        </p>
        <CollectionPageHeaderExample />
        <TableExample />
        <p className="text-sm text-muted-foreground">Empty state koleksi memiliki padding vertikal 24px dan horizontal 16px (24px dari sm), termasuk dalam kartu tabel tanpa data. Varian laporan, inline, dan picker mempertahankan inset dari kontainer atau override ringkasnya.</p>
        <EmptyStateSpacingExample />
        <p className="text-sm text-muted-foreground">Register Risiko memakai tombol outline Ekspor Excel di toolbar. Ekspor mencakup semua hasil filter aktif dan urutan yang dipilih, termasuk halaman pagination lain. Tombol menampilkan Menyiapkan Excel... dan aria-busy selama proses, nonaktif saat data belum tersedia, serta memberikan feedback keberhasilan atau kegagalan. File hanya berisi tabel Profil Risiko: 18 kolom, header bertingkat abu-abu, Bookman Old Style 11pt, border tipis, teks wrap, dan warna target risiko yang sama dengan ekspor Kertas Kerja, tanpa identitas dokumen atau tanda tangan.</p>
        <CollectionLayoutExample />
        <FilterPopoverExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Komposisi Card</h2>
        <p className="text-sm text-muted-foreground">Judul dan subtitle kartu tanpa gap vertikal tambahan. Semua subtitle kartu memakai 12px dengan line-height 20px melalui slot card-description, termasuk CardDescription pada seluruh bagian formulir risiko, CollapsibleCard.Description, dan subtitle header kustom.</p>
        <p className="text-sm text-muted-foreground">Panel dashboard dan formulir memakai radius, jarak antarbagian, serta inset Card bawaan. Tabel atau grafik boleh mengatur ruang kontennya tanpa mengubah source Card. Kartu pengelolaan grup menempatkan jumlah di samping judul, deskripsi di bawahnya, lalu pencarian 32px dan aksi buat pada sisi trailing; tabel memiliki border atas, mencapai tepi Card di sisi inline dan bawah agar tidak menyisakan celah, lalu pagination menjadi CardFooter, sementara aksi baris berkumpul di menu ellipsis dengan hapus sebagai tindakan destruktif. Detail kejadian risiko memakai pembagian desktop 50/50; judul Card memakai ukuran 14px, row label–value memakai gap 32px, kartu Ringkasan tetap mengikuti tinggi kontennya, label Risiko terkait memakai 12px medium, judul risiko terkait memakai 12px, dan setiap row memakai surface `card-subtle-surface` dengan radius tanpa border, sementara Informasi utama menampilkan tingkat kejadian, pencatat, dan detail lainnya tanpa tanggal kejadian. Deskripsi WarningCard memakai ukuran 12px dan `text-muted-foreground` agar judul peringatan tetap menjadi fokus.</p>
        <CardPatternsExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Data dan progres</h2>
        <p className="text-sm text-muted-foreground">Semua badge memakai teks 12px, latar sangat lembut, border pastel 1px, dan teks pekat sesuai referensi. Hijau memakai #f3fdf9 / #a4f4d0 / #007a56, merah #fef7f7 / #ffccd3 / #c70036, biru #f4fbff / #b8e6ff / #0069a8, dan netral #fafafa / #e4e4e7 / #71717b (latar / border / teks). Warna kuning, amber, oranye, ungu, pink, dan cyan mengikuti intensitas yang sama. Status Draf memakai variant secondary abu-abu; pending/progress dan tingkat kejadian Sedang memakai biru, final/success/done hijau, dan cancel merah. Widget Dashboard utama memakai judul 14px tanpa subtitle; KPI mempertahankan angka 24px dan keterangan 12px agar angka tetap menjadi fokus utama. Empty state data memakai ilustrasi transparan di atas judul normal-weight dan deskripsi 12px muted; ukuran standar maksimal 256px dan konteks picker maksimal 112px. Jika tabel tetap menampilkan header dalam keadaan kosong, letakkan ilustrasi dalam satu baris `TableBody` dengan `TableCell` yang membentang ke semua kolom; pusatkan konten dengan tinggi minimum 96px dan padding vertikal 24px seperti Register Risiko dan Inbox. Editor Sebab, Dampak, dan Mitigasi pada form risiko baru memakai surface `bg-sunken` dengan bayangan inset lembut dan highlight bawah. Saat risiko terkunci, tombol tambah sebab, dampak, dan rencana penanganan serta seluruh tombol AI untuk risiko, sebab, dampak, dan penanganan disembunyikan; item yang sudah ada tetap terlihat dalam keadaan baca-saja. Kolom Progres Penanganan pada tabel Pemantauan memakai ring 18×18px dengan label persentase 14px di sampingnya; arc selalu violet-400, termasuk saat progress 100%, dengan track muted. Tabel progress terbaru Kertas Kerja memakai indikator hijau dengan tinggi 12px (`h-3`) di atas track muted. Error dan loading memakai alert serta spinner.</p>
        <p className="text-sm text-muted-foreground">Judul empty state ringkas di panel risiko dan linimasa aktivitas memakai `text-secondary-foreground` agar tetap berada di bawah judul bagian.</p>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <DashboardKpiCard title="Risiko Prioritas" value="13" detail="risiko tinggi & ekstrem" trend="up" />
          <DashboardKpiCard title="Mitigasi belum terlapor" value="2" detail="tugas tanpa laporan" trend="down" />
          <DashboardKpiCard title="Mitigasi overdue" value="5" detail="tugas melewati tenggat" trend="up" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar risiko</CardTitle>
              <CardAction><Badge variant="secondary">2 risiko</Badge></CardAction>
              <CardDescription>
                Semua tabel mengikuti referensi daftar produk pada skala aplikasi 14px: panel putih bersudut 12px, outline netral dan shadow tipis, header abu-abu setinggi 36px dengan teks `text-tertiary-foreground`, baris minimal 56px, serta inset sel 20px horizontal dan 12px vertikal. Tidak ada inset tambahan pada judul atau divider vertikal. Badge memakai sudut 8px dan teks normal 12px; angka memakai tabular-nums. Lebar kolom, metadata, warna risiko, validasi, dan aksi tetap mengikuti konteks data. Aturan surface bersama berada di globals.css dan komponen registry tetap utuh.

              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="-mx-(--card-spacing) -mb-(--card-spacing) border-t border-border/60">
              <Table>
                <TableHeader>
                <TableRow><TableHead className="">Risiko</TableHead><TableHead className="text-right">Skor</TableHead><TableHead className="pl-6">Level</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Jumlah risiko</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell className=""><span className="block text-sm text-foreground">Keterlambatan pelaporan</span><span className="block font-sans text-sm leading-5 text-muted-foreground">R-239</span></TableCell><TableCell className="text-right font-medium tabular-nums">22</TableCell><TableCell className="pl-6"><Badge variant="outline" className={levelToColor(getRiskLevelFromNilai(22))}>{getRiskLevelDisplayLabel(getRiskLevelFromNilai(22))}</Badge></TableCell><TableCell><Badge variant="secondary">Draf</Badge></TableCell><TableCell className="text-right tabular-nums">4</TableCell></TableRow>
                  <TableRow><TableCell className="">Kapasitas layanan</TableCell><TableCell className="text-right font-medium tabular-nums">12</TableCell><TableCell className="pl-6"><Badge variant="outline" className={levelToColor(getRiskLevelFromNilai(12))}>{getRiskLevelDisplayLabel(getRiskLevelFromNilai(12))}</Badge></TableCell><TableCell><Badge variant="default" className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Aktif</Badge></TableCell><TableCell className="text-right tabular-nums">7</TableCell></TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Progres dan identitas</CardTitle>
              <CardDescription>Avatar Dither Kit menghasilkan pola deterministik dari nama yang ditampilkan dan memakai border tipis berwarna netral.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3"><DitherAvatar name="Pengelola risiko" size={32} className="overflow-hidden rounded-full" /><span>Pengelola risiko</span></div>
              <Progress
                value={65}
                className="h-3 [&_[data-slot=progress-indicator]]:bg-violet-400"
                aria-label="Progres pelaporan mitigasi 65 persen"
              />
              <p className="text-muted-foreground">Progres pelaporan mitigasi memakai track muted setinggi 12px dan indikator violet-400. Linimasa aktivitas dan tugas dokumen memakai Card serta Badge; gerak indikator progres tetap dipertahankan.</p>
              <Skeleton className="h-8 w-full" />
              <CollectionEmptyState
                align="center"
                title="Belum ada risiko"
                description="Tambahkan risiko baru untuk memulai daftar risiko."
              />
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground">Tabel monitoring pada detail Kertas Kerja memakai inset sel standar tanpa inset tambahan di kolom Risiko, agar judul risiko sejajar dengan data pada kolom lain.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Narrative Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview menyusun tren jumlah risiko dengan total saat ini di bawah header kartu, distribusi kategori saat ini, komposisi tingkat risiko lintas empat kuartal, lalu heatmap kuartal berjalan. Semua widget memakai judul 14px tanpa subtitle; angka total memakai 30px semibold diikuti label Risiko 14px, misalnya 4 Risiko. Label sumbu X pada kedua grafik tren memakai 14px, sedangkan label sumbu Y memakai 12px. Area plot tren jumlah risiko dibatasi 24rem pada xl agar sumbu X tetap di dalam kartu 32rem, termasuk header dan ringkasan total. Sumbu kategori memiliki inset 32px di kedua ujung serta mempertahankan label kuartal pertama dan terakhir agar tidak terpotong. Pada layar lebar, tren risiko dan distribusi kategori berbagi satu baris dengan porsi lebar sekitar 2:1; pada layar sempit keduanya bertumpuk. Kartu distribusi tidak menampilkan Badge periode di header, menempatkan donut di tengah, menonjolkan sektor terpilih, dan memakai tooltip standar `ChartTooltipContent`. Tombol kategori di bagian bawah menunjukkan persentase, menandai pilihan aktif, dan membungkus saat ruang tidak cukup; titik warna tampil langsung di samping label tanpa wadah. Tren jumlah risiko memakai satu garis total empat kuartal tanpa marker dan tanpa legenda. Kartu “Komposisi Level Risiko per Kuartal” memakai batang bertumpuk untuk empat kuartal, lima tingkat risiko dalam urutan dari sangat rendah hingga sangat tinggi, skala jumlah dengan baseline nol, legenda titik warna, dan tooltip yang memuat total risiko per kuartal. Warna level mengikuti tile pemilih skor risiko: green-400, green-500, yellow-400, orange-500, dan red-500. Kartu komposisi menggantikan daftar risiko perhatian di Dashboard; daftar tindak lanjut tetap berada di Ringkasan Risiko. Di baris bawah, komposisi dan heatmap berbagi porsi lebar sekitar 2:1. Angka heatmap memakai `text-secondary-foreground`, setiap sel memakai border 0,5px dengan token `border-border`, dan aksi perbandingan multi-fase berada di header Card.
        </p>
        <OverviewDashboardExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Kondisi Pengelolaan Risiko</h2>
        <p className="text-sm text-muted-foreground">Kondisi Pengelolaan Risiko menampilkan Ringkasan berisi lima metrik, tanpa blok narasi status, penjelasan, populasi, atau daftar warning di atasnya. Loading, error/retry, dan data kosong tetap tersedia. Analisis tampil sebagai tiga StandardCard terpisah: Komposisi, Perubahan, dan Indikator; ketiganya sejajar pada xl dan menumpuk di layar lebih kecil, tanpa tab. Ketiga grafik tidak menampilkan disclosure data; tabel ekuivalen tetap tersedia bagi pembaca layar. Penjelasan masing-masing grafik berada dalam tooltip ikon info di samping judul kartu, dapat diakses dengan hover atau fokus keyboard. Filter Ringkasan Risiko dan Kondisi Pengelolaan Risiko memakai ReportFilterRow bersama: gap 16px, field dan aksi rata bawah, tinggi kontrol Periode/Grup/Unit 32px, lebar Periode dan Grup 12rem, Unit fleksibel. Filter tahun dan kuartal setinggi 32px; Muat ulang berupa tombol ikon 32×32 dengan nama aksesibel, sejajar dengan field. Keterangan cakupan unit di bawah filter dihapus. Skala, perhitungan, warna semantik, tooltip, dan interaksi keyboard tetap mengikuti komponen produksi.</p>
        <RiskConditionReportExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Evaluasi kuartalan · Ringkasan Risiko</h2>
        <p className="text-sm text-muted-foreground">
          Jumlah utama memakai satu profil Final yang sudah efektif per risiko. Periode selesai menampilkan Risiko aktif akhir periode · Final, dengan acuan penutupan kuartal dalam zona waktu Asia/Jakarta. Kuartal berjalan memakai populasi Risiko aktif saat ini · Final; ringkasan tren Dashboard menampilkan angka diikuti Risiko. Draft dan versi yang belum efektif tidak dihitung. Arsip dan pemulihan berlaku sesuai tanggalnya; perubahan hari ini tidak menghapus histori periode sebelumnya. Bukti pelaporan mitigasi dan kejadian tetap mengikuti periode asalnya.
        </p>
        <p className="text-sm text-muted-foreground">
          Empat section ditampilkan per baris: Profil risiko dengan tiga metrik sejajar mulai lg (dua kolom di layar sempit), Distribusi tingkat risiko, Peringkat risiko per unit, dan Pelaporan mitigasi. Kartu memakai radius 12px, inset 24px (16px mobile), ring border semantik dan shadow 0 2px 3px foreground 5%. Distribusi memakai lima tingkat profil risiko; ranking menghitung jumlah risiko tinggi dan sangat tinggi, bukan skor rata-rata. Meter memakai label dan angka yang tetap terbaca. Laporan mitigasi mengukur kelengkapan pelaporan, bukan penyelesaian kegiatan. Header Profil risiko tidak menampilkan subtitle periode/populasi; hanya badge kuartal berjalan yang dipertahankan jika berlaku, tanpa nama scope atau footer populasi berulang. Pelaporan menampilkan satu pasangan persentase dan rasio, status tersisa yang tidak nol, tanpa kalimat penjelasan tambahan di bawah meter. Kondisi tanpa kewajiban laporan cukup satu pesan, tanpa 0/0. Persentase pelaporan ditampilkan sekali pada Pelaporan mitigasi. Peringkat menampilkan lima unit teratas; disclosure Unit lainnya membuka seluruh sisanya dengan skala meter yang sama. Judul peringkat menyebut risiko tinggi dan sangat tinggi tanpa subtitle berulang. Disclosure Tentang data/Keterbatasan data beserta waktu pembaruan dan pengambilan tidak ditampilkan pada widget ringkasan. Komponen produksi yang sama dirender di bawah; tabel, drawer, dan kontrol perbandingan lama dihapus. Menu Opsi laporan menyediakan Laporan lengkap Excel dengan lima sheet: Ringkasan, Perbandingan unit, Risiko, Tugas mitigasi, dan Kejadian. Sheet Risiko memakai tabel 25 kolom yang sama dengan KK Penilaian Risiko pada Kertas Kerja: empat baris header bertingkat, font Bookman Old Style 11pt, border tipis, lebar kolom dan warna tingkat risiko yang sama. Tabel mulai B1, data mulai B5, tanpa identitas atau tanda tangan. Skor berasal dari profil periode terpilih. Ekspor memvalidasi ulang akses dan snapshot, menonaktifkan kontrol saat memproses, serta menampilkan feedback keberhasilan atau error.
        </p>
        <p className="text-sm text-muted-foreground">Rekap per Organisasi berada di Ringkasan Risiko, mengikuti periode dan unit laporan. Panel memuat Total, Draf, dan Final transaksi pemantauan saat dibuka, dengan status loading, error/retry, serta organisasi tanpa data. Rekap tidak lagi ditampilkan pada halaman Pemantauan.</p>
        <QuarterlyReportExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Ringkasan pemantauan kuartalan</h2>
        <p className="text-pretty text-sm text-muted-foreground">Ring utama dan keterangan angka berada di kiri; sorotan prioritas dan insight lain berada di kanan dengan surface `bg-card-subtle-surface`. Kartu menampilkan kuartal sebelum kuartal aktif; badge menunjukkan periode yang diringkas. Label “Prioritas pemantauan” memakai 12px medium dengan warna muted. Ikon info menempel dekat dengan label, dengan target klik tetap 40px. Pada layar kecil kolom bertumpuk. Ring menunjukkan penyelesaian pemantauan final, bukan kesehatan risiko. Angka memakai tabular-nums, tanpa animasi masuk. Contoh berikut memakai data ilustrasi.</p>
        <MonitoringInsightCard cycle="2026-Q3" total={50} finalized={40} highPending={3} increased={2} overdue={5} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Pengelompokan</h2>
        <Card>
          <CardHeader><CardTitle>Tabs dan Accordion</CardTitle><CardDescription>Tabs tetap memakai primitive shadcn asli, dengan continuity transition 300ms dengan resize-ease pada indikator aktif agar perpindahan antar-tab terasa halus.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs defaultValue="overview">
              <TabsList><TabsTrigger value="overview">Ringkasan</TabsTrigger><TabsTrigger value="history">Riwayat</TabsTrigger></TabsList>
              <TabsContent value="overview">Informasi ringkasan risiko.</TabsContent>
              <TabsContent value="history">Riwayat perubahan risiko.</TabsContent>
            </Tabs>
            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger>Detail tambahan</AccordionTrigger>
                <AccordionContent>Konten rinci tetap berada dalam struktur bawaan. Bagian formulir mengikuti state Accordion yang sama.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">Collapsible card menghapus inset vertikal root agar spacing header dimiliki trigger dan isi tabel dapat full-bleed; tabel memakai <code>CollapsibleCard.Body className=&quot;px-0&quot;</code> di pemanggil. Section form, termasuk asesmen dan pemantauan risiko, memakai CardContent stok langsung di dalam CollapsibleCard.Content dengan inset dan spacing yang sama seperti form Risiko; ini menghilangkan divider tambahan pada body bersama. Ringkasan dapat mempertahankan inset CardContent standar. Beri konten jarak atas 16px dari header saat dimulai dengan toolbar atau kontrol. Biarkan tinggi body mengikuti isi dan hindari margin bawah negatif, terutama saat footer pagination tidak ditampilkan.</p>
        <CollapsibleCardExample />
        <p className="text-sm text-muted-foreground">Ikon CollapsibleCard memakai permukaan sunken dengan bayangan inset di atas dan highlight di bawah agar terlihat masuk ke dalam header. Bayangan dan highlight menyesuaikan mode gelap.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Workspace monitoring</h2>
        <Card>
          <CardHeader>
            <CardTitle>Rail simpulan yang stabil</CardTitle>
            <CardDescription>
              Form utama dan rail simpulan memakai grid dua kolom dengan alignment ke awal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Saat card perubahan substansi risiko dibuka, tinggi kolom utama boleh bertambah tanpa mendorong atau menurunkan posisi simpulan pemantauan. Rail tetap menempel pada awal workspace dan hanya memakai offset sticky yang aman dari app chrome. Pada tabel transaksi pemantauan, kode risiko berada di bawah judul dalam kolom Risiko selebar `33%`; kolom Perubahan Skor tetap mendapat `15%` dan lebar kolom lainnya tidak berubah. Badge level pada Perubahan Skor memakai palet `levelToColor` yang sama dengan badge level di field Skor form risiko. Workspace monitoring read-only menampilkan KPI Draf/Final di atas tabel transaksi tanpa kartu Progress keseluruhan terpisah. Backend mengecualikan pemantauan superseded dari daftar dan total pagination, termasuk Semua status; filter daftar hanya Semua status, Draf, dan Final. Detail historis tetap tersedia untuk audit dan memakai label Digantikan dengan Badge secondary netral, tanpa dihitung sebagai Draf atau Final.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Indikator Pemantauan pada Register Risiko membuka tooltip riwayat Q1–Q4 untuk tahun berjalan dengan lebar 256px dan batas aman terhadap lebar viewport. Panel memakai token `sidebar` (#f6f6f6) tanpa panah diamond, dengan border lembut dan bayangan; daftar berada pada token `card` (putih). Panel memakai padding luar 4px. Header memakai 8px horizontal, 8px di atas, 8px di bawah, dengan judul “RIWAYAT PEMANTAUAN” uppercase 12px berwarna tertiary dan tahun di ujung kanan. Setiap baris memakai padding horizontal dan vertikal 4px, hanya menampilkan label kuartal dan skor 14px rata kanan dengan warna sesuai level tanpa badge. Periode tanpa skor tetap terlihat dengan tanda strip.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Semantik laporan risiko kuartalan</h2>
        <Card>
          <CardHeader>
            <CardTitle>Profil efektif dan hasil pemantauan</CardTitle>
            <CardDescription>Jangan gabungkan dua skor yang memiliki makna waktu berbeda.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Profil Q1 menampilkan skor awal Q1. Hasil pemantauan Q1 ditampilkan terpisah dan menjadi dasar profil Q2. Tren, dashboard, dan ekspor memakai skor profil efektif pada kuartal yang dipilih. Tabel profil dan pemantauan memakai <code>ReportPanel contentClassName=&quot;px-0&quot;</code> agar konten membentang ke tepi Card tanpa paragraf penjelas di atasnya. Kolom Risiko memakai lebar 38% dan inset bersama 20px seperti Register Risiko; judul risiko dipotong satu baris sementara kodenya tetap tampil di bawah, dan kepala tabel memiliki garis atas tipis.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Pilihan yang dapat dicari</h2>
        <Card>
          <CardHeader><CardTitle>Command</CardTitle><CardDescription>Daftar pilihan berada di dalam CommandGroup.</CardDescription></CardHeader>
          <CardContent>
            <Command>
              <CommandInput placeholder="Cari unit kerja..." />
              <CommandList><CommandGroup heading="Unit kerja"><CommandItem>Unit A</CommandItem><CommandItem>Unit B</CommandItem></CommandGroup></CommandList>
            </Command>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
