"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { Plus, Search } from "@/components/shared/icons";
import { AccentButton } from "@/components/shared/design-system/actions/accent-button";
import { ActionButton } from "@/components/shared/design-system/actions/action-button";
import { SidebarMotionExample } from "@/components/shared/design-system/examples/sidebar-motion-example";
import { DashboardKpiCard } from "@/components/shared/design-system/layout/dashboard-kpi-card";
import { CardPatternsExample } from "@/components/shared/design-system/examples/card-patterns-example";
import { IncidentFormModalExample } from "@/components/shared/design-system/examples/incident-form-modal-example";
import { MitigationProgressFormExample } from "@/components/shared/design-system/examples/mitigation-progress-form-example";
import {
  CollectionEmptyState,
  RiskCategoryIndicator,
} from "@/components/shared/design-system";
import {
  CollectionLayoutExample,
  CollectionPageHeaderExample,
  CollapsibleCardExample,
  FilterPopoverExample,
  OverviewDashboardExample,
  RiskDetailDrawerExample,
} from "@/components/shared/design-system/examples";

export default function DesignSystemPage() {
  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
        <p className="text-muted-foreground">
          Manris menggunakan komponen shadcn/ui radix-nova, tema dasar neutral, palet grafik untuk data, dan font Inter. Variant default Badge dan Button memakai token primary neutral, sehingga tidak tampil teal. Shell memakai token background; navigasi dan aksi akun memakai komposisi Sidebar bawaan. Variasi tampilan
          memakai prop resmi komponen; kelas halaman mengatur tata letak. Shell, topbar, dan main section memakai token `background` (`#f1f1f1` pada light mode), sementara sidebar dan logo section memakai token `sidebar` (`#f1f1f1` pada light mode). Surface card sekunder memakai token `secondary-card-surface` (`#fbfbfb` pada light mode). Warna risiko hanya
          digunakan untuk menyampaikan data. Border, input, surface-border, dan component-border memakai token `sidebar-border` yang sama (`#e3e3e3` pada light mode). Tepi Card bawaan memakai ring dengan warna `sidebar-border` agar setara dengan garis sidebar. Hirarki teks memakai foreground untuk konten utama, muted-foreground untuk dukungan, dan tertiary-foreground (#a3a3a3) untuk microcopy berprioritas rendah. Sel data pendukung pada tabel seperti kategori memakai muted-foreground, sedangkan link utama, metrik, status, dan skor mempertahankan hierarki semantiknya. Animasi tab, tombol, overlay, input, Sidebar, dan Drawer mengikuti perilaku sebelum revamp.
        </p>
      </header>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Grafik dan visualisasi risiko</h2>
        <p className="text-sm text-muted-foreground">Semua grafik data memakai ChartContainer shadcn dengan ChartConfig untuk label dan warna seri serta ChartTooltip bawaan. Legenda di dalam plot memakai ChartLegend; legenda kontekstual di luar plot tetap menjadi komposisi halaman. Tinggi grafik ditetapkan oleh layout halaman. Recharts adalah renderer di dalam komponen Chart shadcn; tidak ada library grafik atau kerangka chart custom kedua. Heatmap risiko 5×5 tetap berupa matriks domain dengan label sumbu dan legenda yang terbaca.</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Navigasi sidebar</h2>
        <p className="text-sm text-muted-foreground">Item dalam satu grup berjarak 4px; ruang antarseksi lebih besar. Label grup memakai text-tertiary-foreground, item navigasi yang tidak aktif memakai text-muted-foreground untuk label dan ikon, item aktif memakai text-sidebar-accent-foreground, dan hover serta permukaan item aktif memakai sidebar-accent netral yang sedikit lebih gelap dari latar sidebar. Teks logo sejajar dengan tepi kiri ikon navigasi, sementara footer sejajar dengan area item. Border kanan area logo dan border bawah topbar memakai token border-sidebar-border yang sama dengan garis tepi sidebar. Animasi pilihan aktif tetap sama.</p>
        <SidebarMotionExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Aksi dan status</h2>
        <Card>
          <CardHeader>
            <CardTitle>Button dan Badge</CardTitle>
            <CardDescription>Varian bawaan untuk aksi dan penanda status, termasuk alur panduan publik, persetujuan, laporan, kertas kerja, dan ringkasan kejadian. Tombol outline memakai surface putih di light mode dengan border terlihat; pada dark mode memakai surface gelap. Trigger menu dan aksi sekunder seperti Import memakai outline dengan satu ikon konteks tanpa chevron trailing. Menu aksi memakai satu surface popover dengan row DropdownMenuItem native, tanpa Card bersarang.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button>Utama</Button>
            <Button variant="secondary">Sekunder</Button>
            <Button variant="outline">Outline</Button>
            <Button className="h-9 rounded-full">Masuk (login)</Button>
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
            <Badge variant="default" className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Final</Badge>
            <Badge variant="default" className="border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Menunggu</Badge>
            <Badge variant="default" className="border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Sedang</Badge>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Formulir</h2>
        <p className="text-sm text-muted-foreground">Bagian formulir memakai jarak dan inset Card bawaan; judul dan deskripsi berada di CardHeader, diikuti isian dalam CardContent.</p>
        <Card>
          <CardHeader>
            <CardTitle>Kontrol bawaan</CardTitle>
            <CardDescription>Label, input, textarea, checkbox, dan switch memakai komposisi bawaan shadcn. Field NIP dan Password pada login memakai tinggi 36px dan surface putih sebagai pengecualian konteks halaman; default Input dan InputGroup tetap tidak berubah.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
            <Field>
              <FieldLabel htmlFor="design-system-name">Nama risiko</FieldLabel>
              <Input id="design-system-name" placeholder="Masukkan nama risiko" />
            </Field>
            <Field>
              <FieldLabel htmlFor="design-system-login-nip">NIP (login)</FieldLabel>
              <Input id="design-system-login-nip" className="h-9 bg-white dark:bg-white" placeholder="Masukkan NIP" />
            </Field>
            <Field>
              <FieldLabel htmlFor="design-system-login-password">Password (login)</FieldLabel>
              <InputGroup className="h-9 bg-white dark:bg-white">
                <InputGroupInput id="design-system-login-password" type="password" className="h-9 bg-transparent dark:bg-transparent" placeholder="Masukkan password" />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="design-system-description">Deskripsi</FieldLabel>
              <Textarea id="design-system-description" placeholder="Jelaskan risiko" />
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
          Indikator kategori memakai titik warna dan label yang selalu terlihat. Tidak ada border atau background tambahan; warna hanya menjadi penanda visual pendamping teks.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>RiskCategoryIndicator</CardTitle>
            <CardDescription>Enam kategori risiko dengan warna data yang berbeda.</CardDescription>
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
          Catat Kejadian hanya meminta tanggal melalui Calendar shadcn di dalam Popover;
          input jam tidak ditampilkan.
          Saat isi langkah berubah, tinggi modal mengikuti konten dengan transisi grow/shrink
          220ms dan berhenti pada batas viewport. Alur Detail Laporan Penanganan memakai satu
          Dialog yang sama: klik Lapor Progress memakai continuity transition/layout animation
          untuk mengubah detail menjadi form, lalu Batal kembali ke detail tanpa membuka modal kedua.
        </p>
        <IncidentFormModalExample />
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
        <p className="text-sm text-muted-foreground">
          Halaman koleksi memakai toolbar dengan filter di kiri dan action di
          kanan. Search koleksi yang persisten memakai CollectionSearchField
          yang selalu terlihat dengan tinggi compact 32px; ExpandableSearchField
          hanya dipakai saat ruang memang terbatas. Popover filter, table shell, dan pagination memakai komponen shared yang sama
          seperti Register Risiko. Empty state hasil pencarian atau filter selalu
          menjelaskan kondisinya dengan judul 14px medium, subtitle 12px muted,
          jarak 4px, dan langkah berikutnya.
        </p>
        <CollectionPageHeaderExample />
        <CollectionLayoutExample />
        <FilterPopoverExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Komposisi Card</h2>
        <p className="text-sm text-muted-foreground">Panel dashboard dan formulir memakai radius, jarak antarbagian, serta inset Card bawaan. Tabel atau grafik boleh mengatur ruang kontennya tanpa mengubah source Card. Detail kejadian risiko memakai pembagian desktop sekitar 55/45; judul Card memakai ukuran 14px, row label–value memakai gap 32px, Ringkasan mendapat minimum 400px, tetap mengikuti tinggi kontennya, dan setiap risiko terkait memakai border tipis pada row-nya, sementara tingkat kejadian dan pencatat berada di Informasi utama. Deskripsi WarningCard memakai text-muted-foreground agar judul peringatan tetap menjadi fokus.</p>
        <CardPatternsExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Data dan progres</h2>
        <p className="text-sm text-muted-foreground">Status Draf memakai variant secondary abu-abu; pending/progress dan tingkat kejadian Sedang memakai biru, final/success/done hijau, dan cancel merah. Kartu KPI memakai judul 12px berwarna muted, angka 24px, dan keterangan 12px agar angka tetap menjadi fokus utama. State kosong untuk alur upload/import dapat memakai surface dashed muted yang sama dengan area unggah, dengan label terpusat.</p>
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          <DashboardKpiCard title="Risiko Prioritas" value="13" detail="risiko tinggi & ekstrem" trend="up" />
          <DashboardKpiCard title="Mitigasi belum terlapor" value="2" detail="tugas tanpa laporan" trend="down" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Daftar risiko</CardTitle>
              <CardAction><Badge variant="secondary">2 risiko</Badge></CardAction>
              <CardDescription>
                Table bawaan mengatur tipografi 13px, padding, surface #fafafa, dan border daftar operasional. Header tabel memakai background #fafafa dengan label `text-tertiary-foreground`. Sel pertama dan terakhir berjarak 16px dari tepi tabel, sementara jarak antarkolom tetap 8px; setiap kolom label utama seperti Risiko, Judul, Judul Piagam, Kejadian, Organisasi, dan padanannya memakai `px-24` lokal pada header serta body seperti kolom judul risiko pada Register Risiko. Isi tabel sejajar dengan inset Card dan pagination. Teks panjang di kolom utama umumnya membungkus di dalam sel; khusus judul rencana pada tabel Penanganan, teks satu baris memakai ellipsis (`truncate`) dengan `px-24` agar jarak kanan tetap terjaga dan kode risiko tetap terbaca sebagai metadata sekunder. Sel pendukung seperti risiko terkait, pencatat, tanggal, serta waktu memakai `text-muted-foreground`; identifier kode di dalam Ringkasan dan metadata kode dialog konfirmasi memakai `text-tertiary-foreground`. Kode di bawah nama risiko pada Register Risiko memakai Inter 14px (`font-sans text-sm`), sementara kode di bawah judul rencana pada tabel Penanganan tetap memakai 14px monospace; keduanya menggunakan `text-muted-foreground`. Kolom jumlah menggunakan label eksplisit; default-nya rata kiri, sedangkan kolom Jumlah risiko di tabel Kertas Kerja rata kanan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="-mx-(--card-spacing) -mb-(--card-spacing)">
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="px-24">Risiko</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Jumlah risiko</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell className="px-24"><span className="block text-sm text-foreground">Keterlambatan pelaporan</span><span className="block font-sans text-sm leading-5 text-muted-foreground">R-239</span></TableCell><TableCell><Badge variant="secondary">Draf</Badge></TableCell><TableCell className="text-right tabular-nums">4</TableCell></TableRow>
                  <TableRow><TableCell className="px-24">Kapasitas layanan</TableCell><TableCell><Badge variant="default" className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Aktif</Badge></TableCell><TableCell className="text-right tabular-nums">7</TableCell></TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Progres dan identitas</CardTitle>
              <CardDescription>Komponen bawaan untuk indikator ringkas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3"><Avatar><AvatarFallback>MR</AvatarFallback></Avatar><span>Pengelola risiko</span></div>
              <Progress value={65} aria-label="Progres 65 persen" />
              <p className="text-muted-foreground">Linimasa aktivitas dan tugas dokumen memakai Card serta Badge; gerak indikator progres tetap dipertahankan.</p>
              <Skeleton className="h-8 w-full" />
              <CollectionEmptyState
                align="center"
                className="gap-3 rounded-lg border border-dashed border-border/70 bg-muted/[0.18] px-6 py-10"
                title="Belum ada data"
                description="State kosong memakai komposisi Empty bawaan."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Narrative Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview menyusun condition, change, attention, dan concentrated risk secara berurutan. Tabel perhatian memakai primitive tabel koleksi yang sama dengan halaman lain, menggunakan surface putih pada header tabel, sedangkan kartu tren menempatkan legenda berbasis dot tepat di bawah header Card sebelum chart; seri chart memakai token Tailwind skala 600 (`blue-600`, `cyan-600`, `green-600`, `yellow-600`, `orange-600`, dan `red-600`), dan peta risiko menempatkan aksi perbandingan multi-fase di header Card.
        </p>
        <OverviewDashboardExample />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Pengelompokan</h2>
        <Card>
          <CardHeader><CardTitle>Tabs dan Accordion</CardTitle><CardDescription>Tabs tetap memakai primitive shadcn asli, dengan continuity transition ease-in-out pada indikator aktif agar perpindahan antar-tab terasa halus.</CardDescription></CardHeader>
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
        <p className="text-sm text-muted-foreground">Collapsible card menghapus inset vertikal root agar spacing header dimiliki trigger dan isi tabel dapat full-bleed; tabel memakai <code>CollapsibleCard.Body className=&quot;px-0&quot;</code> di pemanggil, sedangkan form dan ringkasan dapat mempertahankan inset CardContent standar.</p>
        <CollapsibleCardExample />
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
              Saat card perubahan substansi risiko dibuka, tinggi kolom utama boleh bertambah tanpa mendorong atau menurunkan posisi simpulan pemantauan. Rail tetap menempel pada awal workspace dan hanya memakai offset sticky yang aman dari app chrome. Pada tabel transaksi pemantauan, kode risiko berada di bawah judul dalam kolom Risiko selebar `33%`; kolom Perubahan Skor tetap mendapat `15%` dan lebar kolom lainnya tidak berubah. Badge level pada Perubahan Skor memakai palet `levelToColor` yang sama dengan badge level di field Skor form risiko.
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
