"use client";

import { PageStack, TooltipProvider } from "@/components/shared/design-system";
import {
  AccordionExample,
  AiSuggestionDropdownExample,
  ArchivedBannerExample,
  BadgeSystemExample,
  ButtonVariantsExample,
  ActionButtonsExample,
  CardPatternsExample,
  CollapsibleCardExample,
  CollectionLayoutExample,
  CollectionPageHeaderExample,
  ColorPaletteExample,
  DesignSystemSectionLabel,
  DialogExample,
  DropdownActionMenuExample,
  FilterPopoverExample,
  FieldsExample,
  FormDialogExample,
  FormContainerExample,
  InlineEmptyStateExample,
  IconographyExample,
  MitigationProgressDialogExample,
  MitigationProgressFormExample,
  MonitoringTransactionProgressExample,
  OverviewDashboardExample,
  OverviewPanelStatesExample,
  PaginationExample,
  ProgressMeterExample,
  RadiusScaleExample,
  ReportPrimitivesExample,
  RiskAssessmentSummaryExample,
  RiskSummaryStripExample,
  SearchInputExample,
  SemesterIndicatorExample,
  SidebarMotionExample,
  TableExample,
  TabsExample,
  TooltipExample,
  TypographyExample,
  VersionTimelineExample,
} from "@/components/shared/design-system/examples";

export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      <PageStack className="space-y-12">
        <section className="space-y-4">
          <DesignSystemSectionLabel>Color Palette</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Root dokumen tetap transparan. Header tabel memakai surface
            #fcfcfc yang sama dengan canvas. Gunakan token background pada shell,
            halaman, dan surface yang memang memiliki konteks; hover hanya
            dimiliki oleh kontrol interaktifnya. Batas struktur memakai token
            surface-border (#e3e3e3), sedangkan field/input memakai field-border
            (#ebebeb); warna semantik tetap khusus untuk
            status, validasi, selection, dan focus. Chart memakai token Origin:
            cyan signal sebagai seri utama, iris sebagai pembanding, dan aksen
            orchid/periwinkle untuk kategori pendukung; level risiko tetap
            memakai token semantik.
          </p>
          <ColorPaletteExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Typography</DesignSystemSectionLabel>
          <TypographyExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Iconography</DesignSystemSectionLabel>
          <IconographyExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Sidebar Motion</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Semua teks sidebar memakai bobot normal; label grup berukuran 12px
            dengan character spacing 0,6px. State aktif dibedakan oleh
            surface netral dan warna icon/teks yang lebih gelap, sedangkan state
            inactive memakai teks dan icon `#646464` dengan stroke icon `1.8`,
            tanpa garis dekoratif di sisi kiri. Setiap baris menu memiliki jarak vertikal
            4px agar surface hover tidak saling menempel. Radius item hover
            mengikuti button standar dengan `rounded-md` (6px). Hover netral di seluruh
            aplikasi mengikuti surface sidebar yang sama; hover semantik tetap
            mempertahankan warna statusnya. Batas footer memakai fade blur halus
            sebelum area Bantuan dan akun.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Hierarki navigasi produksi menempatkan jalur kerja harian di bawah
            <span className="font-medium text-foreground"> Operasional</span>:
            Dashboard, Daftar Risiko, Penanganan, Pemantauan, Kertas Kerja,
            Persetujuan &amp; TTE, dan Evaluasi. Area sekunder mengikuti urutan
            Tata Kelola Risiko, Laporan, AI &amp; Otomasi, lalu Administrasi.
            Ikon operasional mengikuti maknanya: monitor untuk Pemantauan,
            dokumen untuk Kertas Kerja, dan tanda tangan untuk Persetujuan &amp;
            TTE.
            Administrasi menggabungkan Pengguna, Organisasi, dan Grup agar tidak
            ada section tunggal yang menambah beban pindai; Pengguna dan
            Organisasi tetap dibatasi untuk Super Admin, sedangkan Grup tetap
            tersedia sesuai scope akses organisasi pengguna.
          </p>
          <SidebarMotionExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Border Radius Scale</DesignSystemSectionLabel>
          <RadiusScaleExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Fields</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Label untuk field yang wajib diisi menampilkan asterisk merah setelah
            teks label. Field opsional tidak memakai penanda ini.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Field yang read-only atau disabled mengikuti treatment input pada
            modal Detail Aktivitas Log: surface muted yang terlihat, teks muted,
            dan cursor not-allowed.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Trigger dan item menu mempertahankan outline fokus-visible berkontras
            tinggi agar kontrol aktif mudah dilacak oleh pengguna keyboard.
          </p>
          <FieldsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Public Authentication</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Halaman login publik memakai shell yang terpusat dengan satu Card
            solid sebagai fokus utama. Logo berada di dalam CardHeader dan
            sejajar dengan judul; label, helper copy, pesan error, tombol, dan
            tautan mengikuti sumbu tengah, sementara field tetap full-width agar
            nyaman diisi. Animasi dekoratif dan entrance menghormati
            <code className="mx-1 text-xs">prefers-reduced-motion</code>;
            kontrol password memiliki label aksesibel, focus ring, dan hit area
            yang cukup.
          </p>
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Button Variants</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Button primary memakai surface solid tanpa shadow. Button secondary
            memakai `border-border/60`, sama dengan hairline netral pada
            perimeter Card. Depth hanya digunakan pada surface yang memang
            elevated seperti card, modal, dan dropdown. Untuk action collection
            yang perlu menyatu dengan perimeter Card, gunakan `border-0
            border-shadow` agar boundary-nya memakai `--shadow-custom` yang
            sama.
          </p>
          <ButtonVariantsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Shared Action Buttons</DesignSystemSectionLabel>
          <ActionButtonsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Badge System</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Semua status, counter, dan metadata pill memakai primitive Badge
            shadcn yang sama. Gunakan variant bawaan atau tone semantik shared;
            pengecualian hanya counter notifikasi di sidebar, yang tampil sebagai
            angka tabular polos tanpa pill agar navigasi tetap ringan.
          </p>
          <BadgeSystemExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Card Patterns</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Detail metadata pada card memakai pola yang sama dengan modal detail
            laporan: label 14px muted, value 14px medium dengan ikon, grid dua
            kolom, dan tanpa nested card surface. Card biasa memakai
            `border-shadow` berbasis `--shadow-custom`; dashboard, KPI, analisis
            risiko, collection, dan context side-panel card juga memakai
            treatment yang sama.
            Subtitle atau description pada card memakai `secondary-foreground`
            (`#525252`) agar terbaca sebagai konteks pendukung yang konsisten;
            `muted-foreground` (`#737373`) tetap untuk caption, helper text,
            metadata, dan legend.
            Section form risiko selalu terbuka dan memakai satu Card per section
            dengan CardHeader dan CardContent; judul section form memakai
            `text-sm font-medium tracking-tight`; jangan gunakan Accordion untuk
            shell form risiko. Surface struktural non-Card memakai
            `surface-hairline`, yang resolve ke `--shadow-custom` tanpa hard
            border tambahan, sehingga card, panel, dan table memiliki depth
            yang konsisten. Ringkasan KPI collection memakai `KpiCard` dengan surface
            putih, padding dan typography bawaan yang sama di semua halaman;
            gunakan tone warna hanya untuk konteks non-KPI. Input, search, select,
            dan combobox memakai field-border agar batas field tetap lebih ringan
            dari container. Form risiko yang sudah final bersifat read-only,
            termasuk selector RO dan Periode yang disabled setelah finalisasi.
          </p>
          <CardPatternsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Page & Collection / Intelligence Layout
          </DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dashboard, Register, form risiko, Meeting, dan Document Intelligence
            memakai shell halaman yang sama: topbar global menjadi satu-satunya judul
            halaman, sedangkan header borderless di dalam konten hanya menangani
            back action, konteks, dan aksi di sisi kanan. Toolbar tetap berada di
            luar card data,
            dengan filter/search di sisi kiri dan button action di sisi kanan,
            surface netral, dan state loading/empty yang konsisten. Header form
            mengikuti lebar shell dua kolom agar tepi trailing action sejajar
            dengan tepi panel konteks; action kembali tetap di leading edge dan
            action utama tetap di trailing edge pada form/detail. Semua action
            kembali memakai `ActionButton` variant secondary, ukuran sm, ikon
            ArrowLeft 3.5, label ringkas, dan override `border-0 text-sm
            font-normal` agar tetap ringan tanpa garis tepi. Label field form
            memakai `text-sm font-normal`; bobot medium tetap reserved untuk
            button text dan metadata yang membutuhkan penekanan. Field tunggal di dalam group grid
            dua kolom span penuh agar control tidak berhenti di setengah card.
            Inbox memakai tabel persetujuan ringkas yang hanya menampilkan Kode,
            Entitas, Jenis, Tanggal, dan Status; jalur navigasi tetap berasal dari
            judul entitas.
            Detail kertas kerja menempatkan aksi Ekspor Excel di dalam popover
            Tindakan agar header tetap ringkas dan seluruh aksi sekunder terpusat.
            Judul duplikat dari CollectionPageHeader tidak dirender di halaman
            operasional (`showTitle` default false); jarak konten dimulai dari
            inset shell yang sama dengan sisi kiri dan kanan. Contoh katalog
            dapat mengaktifkan judul secara eksplisit untuk mendemonstrasikan
            primitive tersebut.
            Risk Register memakai satu collection risiko tanpa tab sekunder.
            Kolom Kode digabung ke kolom Risiko dengan kode muted di atas judul;
            semua teks tabel memakai `text-muted-foreground` kecuali judul
            risiko dan warna semantic pada badge status. Tabel tetap menampilkan progres Pemantauan secara ringkas
            sebagai hitungan seperti `2/4`, tanpa label “transaksi”, dan menu
            aksi menyediakan Mulai/Lanjutkan Pemantauan melalui pemilihan periode;
            divider bawah header memakai `border-border/60`, sama dengan garis
            atas footer pagination;
            detail transaksinya tersedia di workspace Pemantauan khusus. Toolbar
            register hanya menampilkan action import dan tambah risiko yang relevan,
            tanpa tombol refresh manual. Ikon overflow pada kolom Aksi memakai
            `ActionButton` variant ghost dan ukuran icon-xs, sama seperti tabel
            Evaluasi, agar affordance menu tetap ringan dan konsisten.
            Shell authenticated memakai topbar global 56px di atas sidebar dan
            konten: wordmark `MANRIS` 14px bold uppercase dengan letter-spacing 2px
            tanpa logo dan sejajar dengan inset
            menu sidebar, pemilih organisasi sesuai hak akses user di sisi kiri,
            konteks halaman di tengah. Pemilih organisasi memakai dropdown
            non-modal agar scrollbar dokumen tidak terkunci dan konteks halaman
            tidak bergeser saat overlay dibuka. Tanpa action tambahan di sisi
            kanan, konteks halaman tetap terpusat dan tenang. AI Tools tetap tersedia melalui section
            AI & OTOMASI di sidebar. Sidebar desktop dimulai di bawah topbar
            dan mengikuti state expanded/collapsed, sedangkan mobile memakai
            trigger sidebar serta wordmark `MANRIS` yang ringkas dengan bobot normal.
            Search field memakai lebar content-fit `sm:w-80` pada desktop dan
            hanya melebar penuh pada mobile saat ruang memang terbatas.
            AppShell menyediakan canvas bersama `max-w-[1400px]` bergaya Vercel
            untuk seluruh halaman; inset atasnya mengikuti `p-4 md:p-6` yang
            sama dengan sisi kiri dan kanan agar konten tidak terlalu jauh dari
            topbar; halaman atau form yang membutuhkan measure
            lebih sempit tetap dapat memilih batas internalnya sendiri.
            Form panjang dengan panel konteks memakai grid lebar: form tetap di
            kolom utama, panel 360px memakai item grid polos agar outer edge
            kartu pertama pada form dan panel dimulai pada garis atas yang sama.
            Perilaku sticky mulai breakpoint xl ditempatkan pada wrapper di dalam
            panel dengan `top-20`, bukan pada item grid-nya, lalu
            kedua kolom menumpuk di bawah form pada viewport yang lebih sempit. Panel konteks tidak
            memakai tab untuk konten paralel; gunakan section terpisah dengan
            seluruh heading section uppercase 12px (`text-xs`) berwarna muted
            70% dengan character spacing 0.6px. Semua section memakai divider dashed/soft, dan timeline atau
            list untuk histori versi agar
            progres, log, dan riwayat tetap terlihat serta mudah dipindai. Log memakai compact activity feed:
            aktivitas inti dan waktu relatif tanpa avatar atau nested card;
            detail lengkap dibuka lewat modal dengan shell form yang sama seperti
            Tambah Log dan field Input/Textarea disabled. Preview log dan histori
            versi dibatasi lima item terbaru, dengan action untuk membuka seluruh
            daftar di modal scrollable. Ringkasan progres menggunakan list
            vertikal tanpa divider atau nested card, dengan angka memakai
            tabular-nums dan rata kanan dalam spacing yang kompak. Gunakan
            warna teks monochrome untuk seluruh summary progres. Panel ringkas hanya menampilkan summary progres; task
            detail/report table tidak dirender di panel tersebut.
            Tabel mitigasi di dalam surface form memakai spacing-only layout
            tanpa nested card atau elevation kedua, tidak memiliki panel cari,
            dan mengikuti grammar ledger daftar risiko untuk header, row, hover,
            padding sel, serta action column yang sticky. Layout-nya fluid dan
            tidak memaksa horizontal scroll di dalam card form. Boundary tabel
            memakai satu border struktural tanpa surface atau elevation tambahan.
          </p>
          <CollectionLayoutExample />
          <CollectionPageHeaderExample />

          <section className="space-y-4">
            <DesignSystemSectionLabel>Document Intelligence Workspace</DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Document Intelligence treats a selected document as the
              primary object. The production workspace uses a two-area content
              canvas with setup and history sections, a neutral spatial index,
              and a closable inspector. The new-process setup follows the risk
              form grammar with FormSection, stacked labels, 36px controls, and
              neutral select surfaces; the quarterly cycle generates the process
              name automatically without a manual name or organization-ID field.
              Upload begins with one large dashed drop zone and
              transitions into cards with per-file validation; valid files stay
              available when another file fails. Processing exposes completed
              task progress, compact parallel lanes, and a factual activity
              timeline rather than a single spinner. Page thumbnails remain
              visible after completion so findings can navigate back to their
              source. Group accents are pastel and semantic only: Risk register,
              SOP &amp; controls, Audit &amp; findings, Planning &amp; performance, and
              Supporting documents. Staged thumbnail entry and regrouping use
              restrained layout springs with bounce disabled and a reduced-motion
              fallback. The adapter contract persists job summaries locally and
              keeps cancellation, partial completion, and task-level retry
              explicit for the eventual backend processor.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Working Paper Creation Form
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Form pembuatan Kertas Kerja memakai CollectionPageHeader dengan
              pola back action yang sama seperti form Risiko, badge siklus
              asesmen, dan CTA utama sejajar di sisi kanan header. Gunakan shell lebar
              untuk roster, primitive search dan table bersama, serta state loading dan
              empty yang sama dengan collection. Kode risiko dan periode
              memakai monospace; warna hanya dipakai untuk status. Metadata
              versi teknis tidak ditampilkan pada roster ini. Jika judul section
              sudah cukup jelas,
              helper description pada card dapat dihilangkan. Progress Kertas Kerja
              ditampilkan sebagai disclosure collapsed pada
              collection ini agar status roster dan progress TTE tetap berada
              dalam konteks yang sama. Boundary roster
              menggunakan `FormSection` dan `CollectionTableCard` canonical dengan
              perimeter hairline dan radius yang konsisten. Checkbox header dan
              baris diintegrasikan ke kolom Kode agar tidak ada kolom kosong khusus
              untuk seleksi. Pengecualian cukup ditentukan dengan checkbox tanpa
              field alasan tambahan. Tabel memakai layout fluid `w-full table-fixed`
              dengan lebar kolom proporsional, sehingga tidak memaksa scroll
              horizontal. Nilai
              panjang dipotong secara aman dengan tooltip native. Konfirmasi
              memakai AlertDialog canonical dengan summary angka yang ringkas,
              footer action `Batal` berjenis outline dan aksi utama berjenis
              primary, serta spacing token yang sama.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Working Paper Detail
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Detail Kertas Kerja memakai shell `max-w-[1400px]` dengan layout
              dua kolom yang menjaga tabel monitoring sebagai surface utama
              dengan lebar penuh pada kolom konten. Ringkasan dokumen,
              `Monitoring Final`, dan status tanda
              tangan terkumpul di panel kanan; pada layar kecil kedua kolom
              menumpuk secara natural. Jarak judul ringkasan ke item memakai
              24px (`gap-6`), sedangkan item metadata disusun vertikal dengan
              jarak 16px (`gap-4`) antar blok.
              Ledger monitoring detail menempatkan versi di kolom `Versi`,
              level skor tetap berupa teks biasa, dan status memakai compact
              Badge dengan tone semantik agar mudah dipindai tanpa memenuhi
              baris.
              Tabel mengikuti grammar daftar risiko dengan header compact,
              baris satu-baris, layout `w-full table-fixed`, dan lebar kolom
              proporsional agar tidak memaksa scroll horizontal.
              Connector pada timeline tanda tangan diperpanjang melewati
              offset marker agar setiap langkah tersambung secara visual.
              Header detail memakai `CollectionPageHeader` seperti halaman
              operasional lain; action berada sebagai grup sibling di sisi
              kanan header tanpa wrapper layout tambahan. Aksi utama memakai
              `AccentButton`, sedangkan ekspor dan overflow memakai
              `ActionButton`; konfirmasi mengikuti ukuran action dialog yang
              sama. Header global disembunyikan agar tidak terjadi duplikasi,
              dan action tetap mengikuti tipografi kontrol standar. Modal aksi
              detail memakai `AlertDialogHeader` yang berisi title dan
              description, lalu footer action yang sama seperti modal lain.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Monitoring Read-only Ledger
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Halaman Pemantauan memakai snapshot risiko dari Kertas Kerja
              sebagai sumber daftar, bukan hanya transaksi pemantauan yang
              sudah dibuat. Pengguna non-global hanya melihat transaksi dari
              organisasinya sendiri; pengguna global tetap dapat melihat
              seluruh scope. Ringkasan KPI menampilkan Belum Dimulai,
              Berlangsung, dan Final; pada scope global daftar organisasi parent
              merangkum child organization tanpa memberi aksi mutasi. KPI ditampilkan paling
              atas sebagai orientasi cepat, diikuti Progress keseluruhan dan
              Daftar status pemantauan sebagai ledger utama. Rekap per Organisasi
              menjadi disclosure pendukung setelah daftar dan ikut menampilkan
              organisasi child dalam scope pengguna; disclosure dimulai dalam
              kondisi collapsed agar fokus awal tetap pada ledger. Tabel
              memakai search kode/risiko, filter, pagination, refresh, dan
              selector siklus yang sama dengan Daftar Risiko. Roster utama tidak
              mengulang kolom Organisasi dan Aksi karena baris serta judul risiko
              sudah menjadi jalur navigasi baca. Skor awal ditampilkan muted dan
              tercoret sebagai referensi historis, sedangkan skor hasil
              pemantauan memakai badge level risiko dengan teks tanpa ikon.
              Disclosure memakai compound component yang sama; chevron berputar saat
              panel dibuka dan trigger tetap keyboard-accessible.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Monitoring Workspace &amp; Finalization
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Workspace pemantauan menempatkan periode dan versi sumber di
              header CollectionPageHeader dengan shell max-w-[1400px], lalu
              menyusun skor observasi melalui trigger heatmap 5×5 yang sama
              dengan form Risiko, lalu progres mitigasi, revisi profil, alasan
              perubahan, dan simpulan dalam satu urutan kerja. Form memakai
              surface rounded-2xl dan sidebar sticky 360px agar konsisten
              dengan halaman risk register.
              Baseline memakai floating pill fixed hitam di bawah-tengah
              dengan teks putih regular yang menampilkan versi,
              skor sumber, P/D, target, dan level risiko agar tetap bisa
              dibandingkan saat form di-scroll; pada layar sempit level tetap
              terlihat, konten dapat digeser dengan affordance dan fokus
              keyboard, serta offset fixed menghormati safe-area. Tabel
              mitigasi di dalam form bersifat spacing-only tanpa nested
              elevation. Panel simpulan memakai shell Card yang sama dengan
              panel kanan form Risiko (rounded-2xl, padding 20px, title section
              10px, body 12px, dan jarak antar-panel 24px). Isi simpulan
              menggunakan list berlabel dengan separator dashed yang lembut
              (`border-border/50`) untuk skor, target, evaluasi, dan
              efektivitas; progres target dikelompokkan di bawah perubahan
              skor tanpa subjudul berulang, cukup dengan pasangan skor, meter
              progres, dan satu status singkat. Semuanya tetap berada di dalam
              shell utama tanpa nested elevation; hasil evaluasi tetap satu
              baris di sidebar sempit. Ringkasan pelaksanaan
              mitigasi berada di panel kanan yang sama, di bawah divider
              dashed, dan hanya menampilkan progress, total, sudah dilaporkan,
              pending, serta disclosure daftar mitigasi inline; setiap baris
              yang masih bisa dilaporkan memiliki tombol kecil Lapor yang
              membuka modal pelaporan—tanpa berpindah halaman atau tabel
              detail. Badge
              status memakai tone Badge dari Design System, bukan warna lokal.
              Draft
              selalu memperlihatkan status simpan dan memperingatkan perubahan
              yang belum tersimpan melalui AlertDialog. Validasi inline
              terhubung ke field untuk assistive technology, sedangkan error
              pemuatan membedakan data tidak ditemukan dari error yang dapat
              dicoba ulang. Dialog finalisasi merangkum skor sumber ke
              observasi, tren, versi hasil, perubahan substansi, dan mitigasi
              yang masih pending. Setelah commit, halaman berubah menjadi
              read-only dengan metadata finalisasi dan tautan versi hasil.
            </p>
          </section>
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Report Primitives</DesignSystemSectionLabel>
          <ReportPrimitivesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Overview Dashboard</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Judul KPI memakai Inter 12px dengan token muted
            foreground dark gray, weight medium, dan Capitalize. Angka
            KPI memakai Inter 24px dengan weight semibold. KPI card tidak
            memuat chart maupun indikator perbandingan. Nilai `—` tetap dipakai
            bila data tidak tersedia. Judul
            panel/chart tetap memakai treatment card title 14px. KPI card
            memakai baseline tinggi 112px dengan padding yang lebih rapat; card
            menempatkan angka langsung di bawah judul tanpa mendorongnya ke
            dasar card, dan dapat bertambah tinggi saat judul panjang perlu
            wrap. Chart produksi
            memakai shadcn
            ChartContainer dan persistent text legend; tooltip hanya menjadi
            pelengkap, bukan satu-satunya penanda makna. Distribusi kategori
            risiko produksi berada di halaman Laporan dan mengikuti scope unit
            serta cycle yang aktif; legend tetap berada di bawah chart dalam grid
            responsif agar tidak mengambil ruang horizontal dari visual utama.
            Legenda level risiko pada heatmap multi-fase diperlakukan sebagai
            footer full-bleed dengan border atas selebar card dan background
            `table-header` (`#fcfcfc`).
            Panel yang gagal memuat data menampilkan status unavailable yang
            eksplisit dan aksi `Coba lagi` bila pemulihan tersedia; payload fase
            yang hilang tidak digambar sebagai grid nol. Judul `StandardCard`
            dan KPI memakai heading semantic agar struktur halaman terbaca oleh
            assistive technology.
            State panel di dalam card memakai radius inner yang lebih rapat,
            sementara badge hanya mentransisikan warna, border, dan shadow
            fokus yang memang berubah.
            Perbandingan heatmap multi-fase menempatkan keenam fase dalam satu
            baris pada desktop lebar (`2xl:grid-cols-6`); pada lebar yang lebih
            sempit, matriks turun ke beberapa kolom agar tetap terbaca. Label
            fase memakai 12px normal uppercase dengan letter spacing 0.6px.
            Header KPI mendapat ruang bawah tambahan 4px agar judul dan nilai
            card tidak terasa terlalu rapat.
            Baris Risiko Teratas memakai `font-normal` untuk kode, skor, judul,
            dan organisasi agar seluruh daftar memiliki bobot visual yang sama.
          </p>
          <OverviewDashboardExample />
          <RiskSummaryStripExample />
          <OverviewPanelStatesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Accordion (Generic Disclosure)
          </DesignSystemSectionLabel>
          <AccordionExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Collapsible Card</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Monitoring Overview dan form Monitoring memakai compound component
            yang sama: trigger penuh dengan chevron bulat, title 14px, optional
            description dan status action, divider body, serta animasi collapse
            200ms yang menghormati reduced motion. Susun bagian yang diperlukan
            melalui children; jangan menambah prop boolean untuk variasi header.
          </p>
          <CollapsibleCardExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Tabs</DesignSystemSectionLabel>
          <TabsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Table</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tabel penanganan memakai proporsi kolom 44% rencana, 18% PIC, 14%
            deadline, 12% status, dan 12% aksi. Kode risiko digabung sebagai
            metadata `kode · judul` di kolom rencana, PIC memakai
            `text-muted-foreground`, dan tanggal deadline mengikuti format
            kolom Finalisasi (`dd MMM yyyy`, locale `id-ID`). Warna teks tabel
            defaultnya `text-muted-foreground`, judul dapat memakai
            `text-foreground`, dan badge tetap mempertahankan warna semantic
            dari `tone`; divider header dan footer memakai `border-border/60`.
          </p>
          <TableExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Pagination</DesignSystemSectionLabel>
          <PaginationExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Filter Popover</DesignSystemSectionLabel>
          <FilterPopoverExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Dialog / AlertDialog</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Modal masuk dan keluar memakai transisi 200ms dengan strong ease-out
            bersama, tetap menggunakan frosted scrim yang sama, dan menjadi
            statis saat prefers-reduced-motion aktif. Semua dialog memakai
            surface card solid, padding 20px, elevation shared, scrollbar
            tersembunyi, header tanpa divider, dan footer dengan divider internal;
            ukuran modal tetap boleh berbeda jika kebutuhan kontennya berbeda.
            Flow pemilihan atau pembuatan seperti picker periode kertas kerja
            memakai shell yang sama dengan modal lapor penanganan: tanpa close
            control duplikat, field berlabel, footer
            CollectionDialogCancel/AccentButton, dan reveal header/field/footer
            0/40/80ms yang aman untuk reduced motion. Selector periode memakai
            pola Popover + Button + option-list yang sama dengan form risiko,
            bukan SelectItem collection. CTA pemantauan mengikuti hasil aksi:
            gunakan “Buat draft & lanjutkan” hanya ketika belum ada draft, dan
            arahkan draft yang sudah ada melalui “Lanjutkan draft”. Gunakan
            istilah “Draft pemantauan” dan “Skor”, serta berikan langkah
            pemulihan pada error yang masih bisa dicoba ulang.
          </p>
          <DialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Dialog</DesignSystemSectionLabel>
          <FormDialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Mitigation Progress Dialog</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Header, form, dan footer memakai hierarchy reveal 0/40/80ms dengan
            opacity serta offset 4px. Handoff dari detail ke laporan berlangsung
            melalui lifecycle exit modal; pada reduced motion, dialog laporan
            dibuka di frame berikutnya tanpa menunggu animasi. Area modal tetap
            dapat discroll di layar pendek tanpa menampilkan scrollbar glitch;
            modal detail memakai shell, title hierarchy, spacing space-y-6, dan
            ukuran tombol footer yang sama. Field informasinya memakai label
            muted dengan value ber-icon atau dot tanpa border/kartu bertingkat.
            Metadata utama dikelompokkan dengan jarak 16px, lalu bukti dan
            catatan dipisahkan 24px; teks panjang tetap wrap di dalam modal.
            Footer detail menempatkan Tutup di leading edge dan aksi utama di
            trailing edge; border hanya dipakai oleh input dan textarea pada
            modal lapor.
          </p>
          <MitigationProgressDialogExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Mitigation Progress Form</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Error validasi tetap diumumkan sebagai role alert dan muncul dengan
            reveal opacity 150ms serta offset 4px; reduced motion menampilkannya
            langsung tanpa transform.
          </p>
          <MitigationProgressFormExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Risk Assessment Summary Strip</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Pemilihan skor risiko memakai trigger satu baris yang membuka modal
            heatmap 5×5. Trigger berukuran mengikuti isi, tetap dibatasi lebar
            container, dan menonjolkan angka skor, level, serta chevron.
            Judul dan pasangan probabilitas × dampak tetap tersedia untuk
            assistive technology tanpa mengulang konteks yang sudah ada di form.
            Baris field cukup menampilkan label tanpa helper text tambahan di
            samping trigger. Header modal heatmap menggunakan jarak title dan
            subtitle yang rapat tanpa tombol close; modal ditutup lewat Batal.
            Pada desktop, area tengah mengikuti tinggi konten tanpa scroll;
            viewport sempit tetap punya fallback scroll agar grid tidak terpotong.
            Cell aktif mempertahankan warna border level risiko lalu hanya
            menebalkan border menjadi 2px, tanpa warna foreground, tanda
            centang, atau ring offset kedua. Angka ringkasan di bawah heatmap
            memakai number ticker tersinkronisasi saat selection berubah,
            menghormati reduced motion, dan mempertahankan tabular numerals.
            User memilih kombinasi probabilitas × dampak melalui
            cell dengan angka dan label yang jelas, melihat tiga kartu ringkas
            untuk probabilitas, dampak, dan hasil. Label level tetap terlihat
            di bawah angka agar konteks tidak bergantung pada tooltip; judul
            sumbu tambahan dihilangkan supaya grid lebih bersih. Ringkasan di
            bawah heatmap tampil borderless dengan angka yang lebih dominan.
            Form register tidak menumpuk summary strip kedua setelah picker.
            User lalu mengonfirmasi melalui Terapkan Skor. Detail evaluasi yang
            dihitung otomatis tampil sebagai label/value borderless dengan
            `text-sm font-normal text-muted-foreground` tanpa helper copy dalam
            tanda kurung, sementara field hanya dipakai untuk pilihan penanganan
            yang bisa diubah.
          </p>
          <RiskAssessmentSummaryExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Semester Indicator</DesignSystemSectionLabel>
          <SemesterIndicatorExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Monitoring Transaction Progress
          </DesignSystemSectionLabel>
          <MonitoringTransactionProgressExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Dropdown Menu</DesignSystemSectionLabel>
          <DropdownActionMenuExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Progress Bar (Completeness)</DesignSystemSectionLabel>
          <ProgressMeterExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Tooltip</DesignSystemSectionLabel>
          <TooltipExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Collection Search</DesignSystemSectionLabel>
          <SearchInputExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Archived Banner</DesignSystemSectionLabel>
          <ArchivedBannerExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>AI Suggestion Surfaces</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Saran judul risiko memakai modal clean-list single-select dengan
            list flat tanpa wrapper visual dan divider, metadata sekunder,
            teks item sejajar dengan title modal, hierarchy title/deskripsi/meta
            yang compact, detail muncul dengan Accordion / Collapse 200ms saat
            hover/focus, deskripsi ditampilkan penuh saat terbuka, scroll
            boundary yang bounded, direct apply saat item dipilih, dan footer
            hanya berisi tombol Batal; tanpa icon, subtitle, atau close.
            Saran penyebab risiko memakai varian structured-list multi-select
            dengan shell yang sama seperti modal lapor penanganan dan list
            checkbox/saran tanpa divider; list yang panjang tetap scroll di area
            list agar footer selalu terlihat tanpa membuat modal terlalu tinggi.
            Footer menampilkan count saran dipilih/total dengan font mono
            tabular di sisi kiri dan action tetap terkelompok di sisi kanan.
            Dropdown tetap tersedia hanya untuk saran yang memang perlu dekat
            dengan field sumber.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Baris inline editable untuk sebab dan dampak menambahkan item secara
            sinkron. Item baru boleh memakai entrance fade/slide 200ms berbasis
            ID yang baru ditambahkan; row lama tidak boleh mengulang animasi
            saat controlled array berubah. Gunakan motion-safe / motion-reduce,
            feedback hover berbasis warna, tanpa divider internal, dan jangan
            menganimasikan layout.
          </p>
          <AiSuggestionDropdownExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Timeline / Version Selector</DesignSystemSectionLabel>
          <VersionTimelineExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Empty / Disabled State</DesignSystemSectionLabel>
          <InlineEmptyStateExample message="Simpan draft untuk mengakses navigasi" />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Page Container</DesignSystemSectionLabel>
          <FormContainerExample />
        </section>
      </PageStack>
    </TooltipProvider>
  );
}
