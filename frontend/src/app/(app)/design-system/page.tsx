"use client";

import { TableExample } from "@/components/shared/design-system/examples/table-example";

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
import { MonitoringInsightCard } from "@/components/shared/design-system/domain/monitoring-insight-card";
import { MonitoringCycleSelectExample } from "@/components/shared/design-system/examples/monitoring-cycle-select-example";
import {
  CollectionEmptyState,
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
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
        <p className="text-muted-foreground">
          Manrisk menggunakan komponen shadcn/ui radix-nova, tema dasar neutral, palet grafik untuk data, dan font Inter. Variant default Button memakai token primary neutral; Badge memakai palet netral bersama dengan teks 12px, latar lembut, dan border pastel. Shell memakai token background; area konten halaman menerapkan `text-wrap: pretty` lewat SidebarInset, sedangkan komponen dengan kebutuhan khusus dapat menetapkan perilaku bungkus lokal. Navigasi dan aksi akun memakai komposisi Sidebar bawaan. Variasi tampilan
          memakai prop resmi komponen; kelas halaman mengatur tata letak. Desktop shell tidak memakai topbar global. Header judul bersama mengambil judul dan deskripsi sesuai rute; baris judul pertama sejajar secara vertikal dengan wordmark sidebar, dan tepi awalnya sejajar dengan konten. Halaman dengan alur khusus dapat menampilkan header sendiri. Navigasi mobile mempertahankan bar 56px dengan pemicu menu dan wordmark Manrisk, tanpa breadcrumb. App shell dan `SidebarInset` memakai `bg-sidebar` agar area utama sewarna dengan sidebar pada tema terang dan gelap. Header tabel memakai `table-header` (`#f7f7f7` pada tema terang), sedangkan footer memakai `table-footer` (`#fcfcfc`). Sidebar dan header logo desktop juga memakai `sidebar` (`#f6f6f6` pada tema terang). Konten inset di dalam Card memakai token `card-subtle-surface` (`#f6f6f6`); isi Card dan panel utama tetap putih, border Card dan panel memakai `border` (`#ececec`), termasuk ring Card bawaan. Row separator tabel memakai `table-divider` (`#e5e5e5`); Divider dan garis pemisah shell memakai `separator` / `sidebar-border` (`#f6f6f6`). Area sunken memakai `sunken` (`#efefef`). Warna risiko hanya
          digunakan untuk menyampaikan data. Hirarki teks memakai foreground (#202020) untuk konten utama, secondary-foreground / muted-foreground (#636363) untuk dukungan, tertiary-foreground (#8b8b8b) untuk microcopy termasuk deskripsi langkah pada timeline tanda tangan kertas kerja dan catatan nilai awal serta target pada form Register Risiko, serta disabled-foreground (#b9b9b9) untuk teks nonaktif. Hover memakai sidebar-accent (#e5e5e5) dan active memakai active (#dddddd). Sel data pendukung pada tabel seperti kategori memakai muted-foreground, sedangkan link utama, metrik, status, dan skor mempertahankan hierarki semantiknya. Animasi tab, tombol, overlay, input, animasi buka-tutup Sidebar, dan Drawer mengikuti token transitions-dev bersama; pergantian menu aktif di Sidebar langsung tanpa animasi slide.
        </p>
        <p className="text-muted-foreground">Tombol outline, ghost, dan secondary memakai hover #e5e5e5 serta active #dddddd, termasuk saat kontrol terbuka. Tombol primary disabled memakai latar disabled-surface (muted), dengan teks dan ikon disabled-foreground tanpa pengurangan opacity pada kedua tema.</p>
      </header>

      <GlobalMotionExample />
      <RegisterMotionExample />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Ikonografi</h2>
        <p className="text-sm text-muted-foreground">
          Semua ikon aplikasi menggunakan Hugeicons melalui shared icon layer,
          kecuali ikon chevron yang tetap memakai Lucide.
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
        <p className="text-sm text-muted-foreground">Item dalam satu grup berjarak 4px; ruang antarseksi lebih besar. Label grup memakai text-tertiary-foreground, item navigasi yang tidak aktif memakai text-muted-foreground untuk label dan ikon, item aktif memakai text-sidebar-accent-foreground, dan hover memakai sidebar-accent (#e5e5e5), sedangkan item aktif memakai active (#dddddd). Pergantian menu aktif berlangsung langsung tanpa animasi slide. Sidebar desktop tidak memakai border kanan dan menyatu langsung dengan area utama. Logo Manrisk memakai simbol layered slanted panels dari aset pengguna melalui ManriskMark: ukuran 24px di kiri wordmark dengan jarak 8px, serta 20px pada sidebar mobile. Simbol asli transparan dipertahankan dan dibalik menjadi putih pada permukaan gelap. Favicon memakai simbol yang sama dengan latar putih permanen. Wordmark Manrisk lowercase berada pada SidebarHeader desktop dengan ukuran 24px, bobot semibold, dan tracking -0,4px; posisinya sejajar dengan tepi kiri ikon navigasi dan tersembunyi saat sidebar diciutkan. Bar mobile memakai wordmark 24px; sidebar mobile tetap memasangkan ikon dengan label 18px. Di footer, avatar 24px dan ikon bantuan 16px berada di tengah kontrol masing-masing; label akun 14px memakai line-height 20px dan bergeser 1px ke bawah untuk keseimbangan optis. Menu pengguna membuka popover di atas tombol pengguna dengan sisi awal sejajar; isinya hanya Pengaturan dan Logout, tanpa nama maupun unit kerja di header dan tanpa menu Settings. Item Pengaturan memakai ikon Settings2 dengan ukuran 16px, selaras dengan ikon Logout. Bar navigasi mobile memakai divider bawah `sidebar-border` (#f6f6f6) dan tidak menampilkan breadcrumb.</p>
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
            <CardDescription>Varian bawaan untuk aksi dan penanda status, termasuk alur panduan publik, persetujuan, laporan, kertas kerja, dan ringkasan kejadian. Status Digantikan memakai Badge sekunder yang netral dan tetap tampak di riwayat audit, bukan sebagai data lifecycle aktif. Tombol outline memakai surface putih di light mode dengan border terlihat; pada dark mode memakai surface gelap. Tombol aksi login dan registrasi memakai tinggi 44px, lebar penuh, bentuk pill, dan jarak vertikal 4px; aksi sekunder memakai Button outline. Trigger menu dan aksi sekunder seperti Import memakai outline dengan satu ikon konteks tanpa chevron trailing. Menu aksi memakai satu surface popover dengan row DropdownMenuItem native, tanpa Card bersarang.</CardDescription>
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
            <CardDescription>Label, input, textarea, checkbox, dan switch memakai komposisi bawaan shadcn. Semua input teks, textarea, input group, select, dan combobox nonaktif memakai surface `disabled-input-surface` (#fafafa pada tema terang); tema gelap memakai surface muted yang sesuai. Form Piagam Manrisk memberi input, textarea, dan select latar putih pada kedua tema agar isian tampak berbeda dari latar halaman. Field NIP dan Password pada login juga memakai tinggi 44px dan surface putih tanpa label terlihat di atas input; autofill menjaga surface putih dan teks neutral gelap agar pewarnaan otomatis browser tetap serasi. Placeholder muted pada kedua tema agar kontrasnya terjaga. Jarak antarfield memakai `gap-2`, sementara jarak dari grup field ke tombol aksi memakai `gap-4`. FieldLabel tetap tersedia sebagai nama aksesibel yang hanya dibaca screen reader. Tombol visibilitas password pada login dan registrasi setinggi 44px tanpa perubahan warna atau latar saat hover pada kedua tema. Petunjuk reset password berada di bawah input dengan teks 12px `text-tertiary-foreground`.</CardDescription>
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
          Dialog yang sama: klik Lapor Progress memakai continuity transition/layout animation
          untuk mengubah detail menjadi form, lalu Batal kembali ke detail tanpa membuka modal kedua.
        </p>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Dialog tambah/edit grup memakai lebar maksimal 2xl dan batas tinggi viewport. Header serta footer tetap terlihat, sementara isi formulir dapat digulir. Isian nama dan deskripsi memakai Field; helper nama memakai FieldDescription 12px. Pilihan anggota memakai Combobox multi-select: organisasi terpilih tampil sebagai chip yang bisa dihapus, sedangkan popover mencari turunan owner di server berdasarkan nama, lokasi, dan level dengan debounce 250ms serta maksimal enam hasil teratas. Popup anggota menerima hover dan klik; interaksi di dalam popup tidak menutup Dialog, sementara area halaman di belakang modal tetap nonaktif. Tombol pilih semua dan pilih hasil pencarian memuat seluruh organisasi yang cocok secara paginasi; kosongkan pilihan tetap tersedia. Pada header koleksi grup, tombol Tambah Grup dan CollectionSearchField sama-sama setinggi 32px. Konfirmasi hapus tetap ringkas dengan aksi destruktif di sisi kanan footer.
        </p>
        <IncidentFormModalExample />
        <h3 className="text-base font-medium">Ekstraksi dokumen menjadi kejadian</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">Gunakan workspace dokumen bersama untuk satu PDF atau XLSX maksimal 1 MB. Hanya kejadian yang sudah terjadi menjadi kandidat. Tinjau satu kandidat melalui form Kejadian; tanggal dan tingkat yang tidak tertulis tetap kosong, risiko dipilih manual, dan seluruh kutipan sumber ditampilkan. Nama dokumen dan kutipan ikut tersimpan pada detail Kejadian. Kandidat tersimpan ditandai Sudah disimpan. Contoh ini memakai panel tinjauan dan form produksi; penyimpanan dinonaktifkan pada contoh.</p>
        <RiskEventExtractionExample />
        <h3 className="text-sm font-medium">Daftar rencana mitigasi</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">Rencana mitigasi pada form Risiko dan bagian substansi Risiko Pemantauan memakai komponen MitigationPlanList yang sama, dengan baris abu-abu membulat, ikon di kiri, rencana dan PIC, serta badge tipe netral dengan palet lembut di kanan. Daftar hanya menampilkan isian langkah pertama; rincian langkah kedua tetap di modal. PIC memakai shadcn DropdownMenu dengan ukuran dan layout bawaan serta trigger outline yang sama seperti tipe mitigasi, ditambah kolom pencarian tanpa ikon, inset horizontal sejajar dengan opsi, dan tanpa padding vertikal tambahan; tombol clear Hugeicons X muncul saat pencarian berisi teks. Pencarian user berjalan ke server setelah jeda 300ms, dan input tetap bisa diketik tanpa tertangkap navigasi menu. Avatar Dither Kit berukuran 18px dan polanya dihasilkan dari nama PIC; PIC wajib dipilih sebelum lanjut atau simpan. Pada langkah pertama, rencana penanganan selebar penuh, sedangkan PIC dan tipe mitigasi berdampingan mulai breakpoint sm dan menumpuk di layar kecil. Klik baris untuk edit, atau gunakan menu aksi untuk edit dan hapus. Pilihan tipe memakai dropdown radio bersama. Tambah atau edit membuka modal dua langkah seperti Catat Kejadian: rencana, PIC, dan tipe pada langkah pertama; seluruh rincian pada langkah kedua. Kembali mempertahankan isian, Batal atau menutup modal membuang perubahan, dan Simpan memperbarui daftar.</p>
        <MitigationPlanListExample />
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
          Aksi Simpan draft, Finalisasi, kembali, dan pemantauan pada form Register Risiko memakai slot <code>CollectionPageHeader actionsPlacement=&quot;title&quot;</code>: sejajar vertikal dengan judul di desktop, lalu membungkus di bawah judul pada layar kecil. CollectionToolbar tepat sebelum CollectionTableCard dalam satu wrapper menyatu sebagai satu panel tanpa gap, dengan inset toolbar 12px; PageStack memberi jarak 24px untuk bagian utama. Toolbar memakai filter di kiri dan action di
          kanan. Footer tabel dan pagination memakai token `table-footer` (#fcfcfc); footer pagination mempertahankan spacing bawaan CardFooter dan mengikuti tinggi kontennya di semua breakpoint, sementara tombol angka dan panahnya setinggi 32px. Label informasi di footer memakai `text-secondary-foreground`. Empty state koleksi dan hasil filter memakai ilustrasi transparan di atas judul 14px normal-weight dan subtitle 12px muted, tanpa frame tambahan; lebar ilustrasi maksimal 256px, dengan ukuran 112px untuk picker dan area ringkas. Search koleksi yang persisten memakai CollectionSearchField
          yang selalu terlihat dengan tinggi compact 32px; aksi yang sejajar dengannya juga memakai tinggi 32px. ExpandableSearchField
          hanya dipakai saat ruang memang terbatas. Register Risiko menampilkan field Status, Periode, dan Kategori secara inline di samping search; filter Periode memakai PopoverSelectField dengan opsi Semua Periode dan kuartal YYYY-QN berurutan mulai dari 2026-Q2 sampai periode berjalan. Menu periode membuka ke bawah. Risk Events menambahkan field Tingkat, dan Penanganan menambahkan Status serta Periode. Panel Penanganan menyatukan toolbar dan tabel seperti Register Risiko: pencarian, Status, dan Periode di kiri, Import di kanan; loading dan empty state tetap di dalam panel, dengan pagination menempel di bawah tabel. Kertas Kerja dan Pemantauan menampilkan search, Status, serta Periode langsung di toolbar; filter Tanggal Dibuat Kertas Kerja memakai trigger outline berikon kalender dan Calendar shadcn di dalam Popover. Dropdown filter ringkas menggunakan opsi terpanjang untuk menentukan lebar, lalu menjaga label satu baris tanpa pemotongan; menu dibatasi lebar viewport meskipun label opsi panjang, lalu dapat digulir horizontal agar seluruh label tetap terbaca. Pada PopoverSelectField dengan lebar trigger tetap, label terpilih yang terlalu panjang dipotong di trigger dan label opsi membungkus di dalam menu. Toolbar membungkus filter saat ruang terbatas. Semua filter periode memakai dropdown Semua Periode, opsi YYYY-QN yang tersedia, dan label periode historis unik yang ada pada data koleksi; pengguna tidak diminta mengetik periode. Filter tanggal memakai Calendar shadcn di dalam Popover. Halaman koleksi lain dapat memakai CollectionFilterPopover untuk filter yang memerlukan ruang tambahan. Table shell dan pagination memakai komponen shared. Empty state hasil pencarian atau filter selalu
          menjelaskan kondisinya dengan judul 14px medium, subtitle 12px muted,
          jarak 4px, dan langkah berikutnya.
          Filter laporan memakai ReportFilterPanel produksi tanpa judul filter yang berulang. Periode laporan, Pembanding, Grup, dan Unit tetap terlihat dengan label muted 12px, jarak label 6px, serta kontrol 36px. Pasangan periode selebar 11rem di desktop; pemilih scope memakai ruang sisanya. Ringkasan unit dan Ekspor berada di baris bawah; menu ekspor memakai label Ringkasan PDF dan Laporan lengkap Excel. Muat ulang data dan Atur ulang filter tersedia dalam menu Opsi laporan di samping Ekspor. Filter diterapkan langsung, penanda kuartal berjalan tetap terlihat, dan isian nonaktif selama pemulihan preferensi atau ekspor. Grup dan PIC memakai SearchableDropdownPicker yang sama; daftar grup hanya menampilkan nama. Contoh laporan di bawah memakai panel yang sama.
        </p>
        <CollectionPageHeaderExample />
        <TableExample />
        <p className="text-sm text-muted-foreground">Register Risiko memakai tombol outline Ekspor Excel di toolbar. Ekspor mencakup semua hasil filter aktif dan urutan yang dipilih, termasuk halaman pagination lain. Tombol menampilkan Menyiapkan Excel... dan aria-busy selama proses, nonaktif saat data belum tersedia, serta memberikan feedback keberhasilan atau kegagalan. File hanya berisi tabel Profil Risiko: 18 kolom, header bertingkat abu-abu, Bookman Old Style 11pt, border tipis, teks wrap, dan warna target risiko yang sama dengan ekspor Kertas Kerja, tanpa identitas dokumen atau tanda tangan.</p>
        <CollectionLayoutExample />
        <FilterPopoverExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Komposisi Card</h2>
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
          Overview menyusun tren jumlah risiko dengan total saat ini di bawah header kartu, distribusi kategori saat ini, komposisi tingkat risiko lintas empat kuartal, lalu heatmap kuartal berjalan. Semua widget memakai judul 14px tanpa subtitle; angka total memakai 30px semibold dengan keterangan 14px. Label sumbu X pada kedua grafik tren memakai 14px, sedangkan label sumbu Y memakai 12px. Pada layar lebar, tren risiko dan distribusi kategori berbagi satu baris dengan porsi lebar sekitar 2:1; pada layar sempit keduanya bertumpuk. Kartu distribusi tidak menampilkan Badge periode di header, menempatkan donut di tengah, menonjolkan sektor terpilih, dan memakai tooltip standar `ChartTooltipContent`. Tombol kategori di bagian bawah menunjukkan persentase, menandai pilihan aktif, dan membungkus saat ruang tidak cukup; titik warna tampil langsung di samping label tanpa wadah. Tren jumlah risiko memakai satu garis total empat kuartal tanpa marker dan tanpa legenda. Kartu “Komposisi Jumlah Risiko per Kuartal” memakai batang bertumpuk untuk empat kuartal, lima tingkat risiko dalam urutan dari sangat rendah hingga sangat tinggi, skala jumlah dengan baseline nol, legenda titik warna, dan tooltip yang memuat total risiko per kuartal. Warna level mengikuti tile pemilih skor risiko: green-400, green-500, yellow-400, orange-500, dan red-500. Kartu komposisi menggantikan daftar risiko perhatian di Dashboard; daftar tindak lanjut tetap berada di Ringkasan Risiko. Di baris bawah, komposisi dan heatmap berbagi porsi lebar sekitar 2:1. Angka heatmap memakai `text-secondary-foreground`, setiap sel memakai border 0,5px dengan token `border-border`, dan aksi perbandingan multi-fase berada di header Card.
        </p>
        <OverviewDashboardExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Evaluasi kuartalan · Ringkasan Risiko</h2>
        <p className="text-sm text-muted-foreground">
          Komposisi mengikuti referensi Mercury: Profil risiko dan Pencapaian target di baris atas,
          Pelaporan mitigasi dan Pemantauan final di bawahnya. Grid dua kolom mulai xl, satu kolom pada
          layar sempit, dengan jarak 24px. ReportSummaryCard memakai varian data-report-card: sudut
          20px, ring tipis, bayangan lembut, inset 20px di semua ukuran layar, judul 14px
          regular, serta footer penuh dengan warna netral ke rose yang lembut. Label metrik 12px
          berada di atas nilai tabular 24px; total profil memakai 36px regular.
        </p>
        <p className="text-sm text-muted-foreground">
          Perubahan risiko memakai grafik batang horizontal berbaseline nol karena datanya berupa
          jumlah kategori, dengan toggle Grafik/Rincian yang menampilkan nilai identik. Periode
          laporan dan pembanding tetap terlihat. Empat rate mempertahankan pembilang, penyebut,
          serta selisih berlabel pp dengan penjelasan poin persentase pada tooltip. Nilai tanpa penyebut memakai dash.
          Kejadian memakai donut severity 180px dan daftar terbaru, dengan tooltip dan ringkasan
          aksesibel. Semua lima status mitigasi termasuk nol tetap terlihat. Footer aksi membuka
          rincian risiko atau perbandingan unit. Filter, reset, ekspor PDF/Excel, kedua tabel,
          pagination, dan pemuatan detail unit tetap memakai perilaku produksi. Kedua tabel memakai
          border atas 1px dengan token table-divider langsung pada header kolom, membentang hingga
          tepi kartu tanpa garis ganda pada wrapper. Skeleton mengikuti
          susunan kartu yang sama. Contoh berikut memakai komponen produksi dengan data ilustrasi.
        </p>
        <p className="text-sm text-muted-foreground">Metadata laporan menunjukkan periode, penanda kuartal berjalan, waktu pembaruan dan pengambilan data. Perlu tindak lanjut membuka daftar risiko dengan filter target belum tercapai, laporan mitigasi melewati tenggat, atau pemantauan belum final; Hapus filter menampilkan semua risiko. Unit terpilih dapat ditinjau dan dihapus satu per satu dalam popover, terpisah dari reset periode. Filter tersimpan per akun dan diperiksa kembali terhadap akses pengguna. Tabel unit menempatkan persentase 14px di samping ring 24px, dengan pembilang/penyebut dan detail 12px. Status mitigasi dikelompokkan menjadi Sudah tercatat dan Masih memerlukan perhatian.</p>
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
              Saat card perubahan substansi risiko dibuka, tinggi kolom utama boleh bertambah tanpa mendorong atau menurunkan posisi simpulan pemantauan. Rail tetap menempel pada awal workspace dan hanya memakai offset sticky yang aman dari app chrome. Pada tabel transaksi pemantauan, kode risiko berada di bawah judul dalam kolom Risiko selebar `33%`; kolom Perubahan Skor tetap mendapat `15%` dan lebar kolom lainnya tidak berubah. Badge level pada Perubahan Skor memakai palet `levelToColor` yang sama dengan badge level di field Skor form risiko. Workspace monitoring read-only menampilkan KPI Draf/Final di atas tabel transaksi tanpa kartu Progress keseluruhan terpisah.
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
