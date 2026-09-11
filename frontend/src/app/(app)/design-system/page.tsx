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
  DropdownMenuExample,
  FilterPopoverExample,
  FieldsExample,
  FormDialogExample,
  FormContainerExample,
  InlineEmptyStateExample,
  IconographyExample,
  LabeledListExample,
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
      <PageStack>
        <section className="space-y-4">
          <DesignSystemSectionLabel>Color Palette</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Root dokumen tetap transparan. Canvas utama dan app shell memakai
            token background, main-content, dan sidebar #fcfcfc; header tabel
            memakai surface #fcfcfc yang sama dengan canvas. Gunakan token
            background pada shell, halaman, dan surface yang memang memiliki
            konteks; hover hanya
            dimiliki oleh kontrol interaktifnya. Batas struktur memakai token
            surface-border (#e3e3e3), sedangkan field/input memakai field-border
            (#ebebeb); warna semantik tetap khusus untuk
            status, validasi, selection, dan focus. Chart memakai token Origin:
            cyan signal sebagai seri utama, iris sebagai pembanding, dan aksen
            orchid/periwinkle untuk kategori pendukung; level risiko tetap
            memakai token semantik. Hierarki font color global memakai
            `foreground` (`#201d1d`), `secondary-foreground` (`#636161`),
            `muted-foreground` (`#8f8e8e`), dan `disabled-foreground`
            (`#bcbbbb`) untuk primary, secondary, muted, dan disabled/placeholder
            text. Field disabled memakai `disabled-surface` (`#f8f8f8`) yang
            lebih ringan daripada surface muted.
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
            Item navigasi dan label grup sidebar memakai bobot medium; label grup
            berukuran 12px dengan character spacing 0,6px, sedangkan elemen pendukung tetap normal. State aktif dibedakan oleh
            surface netral dan warna icon/teks yang lebih gelap, sedangkan state
            inactive memakai teks dan icon `muted-foreground` (`#8f8e8e`) dengan stroke icon `1.8`,
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
            Label metadata read-only pada evaluasi risiko memakai
            <code className="mx-1 text-xs">text-foreground</code> sebagai
            penanda primary, sedangkan nilainya tetap memakai
            <code className="mx-1 text-xs">text-muted-foreground</code>.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Field yang read-only atau disabled mengikuti treatment input pada
            modal Detail Aktivitas Log: surface disabled yang sangat ringan
            (#f8f8f8), teks disabled (#bcbbbb), dan cursor not-allowed.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Trigger dan item menu mempertahankan outline fokus-visible berkontras
            tinggi agar kontrol aktif mudah dilacak oleh pengguna keyboard.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Semua field bersama, termasuk trigger custom pada form Risiko dan
            Pemantauan, mengubah warna border yang sudah ada menjadi sedikit
            lebih gelap saat hover tanpa menambah ring atau perimeter baru.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Selector berbasis opsi memakai export shared
            <code className="mx-1 text-xs">PopoverSelectField</code> dengan
            pasangan <code className="mx-1 text-xs">value/label</code> yang
            sama antara form Risiko dan disclosure collection.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Form risiko memakai export <code className="mx-1 text-xs">Input</code>
            dan <code className="mx-1 text-xs">Textarea</code> dari shared design
            system, termasuk field yang dirender di dalam list dan tabel editable.
          </p>
          <FieldsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Public Authentication</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Halaman login publik memakai shell yang terpusat tanpa wrapper Card
            dan tanpa logo; judul, label, helper copy, pesan error, tombol, dan
            tautan mengikuti sumbu tengah, sementara field tetap full-width agar
            nyaman diisi. CTA login memakai tinggi 40px (`h-10`) dengan bentuk
            pill (`rounded-full`) tanpa icon dekoratif. Frasa `Masuk ke` pada
            heading memakai 20px medium;
            wordmark `Manris` pada judul memakai treatment Poppins tanpa underline.
            Animasi dekoratif dan entrance menghormati
            <code className="mx-1 text-xs">prefers-reduced-motion</code>;
            kontrol password memiliki label aksesibel, focus ring, dan hit area
            yang cukup.
          </p>
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Button Variants</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Button primary memakai surface solid tanpa shadow. Button secondary
            memakai surface hover sidebar yang sedikit lebih gelap tanpa garis
            tepi; varian outline tetap
            digunakan saat border diperlukan. Depth hanya digunakan pada surface
            yang memang elevated seperti card, modal, dan dropdown. Untuk action collection
            yang perlu menyatu dengan perimeter Card, gunakan `border-0
            border-shadow` agar boundary-nya memakai `--shadow-custom` yang
            sama. Tombol bantuan AI inline memakai treatment outline dengan
            ukuran compact yang sama, tanpa ikon dekoratif; state loading
            ditunjukkan melalui label `Memproses...`.
          </p>
          <ButtonVariantsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Shared Action Buttons</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gunakan kontrol icon-only untuk dropdown action yang perlu tetap
            ringkas, termasuk di luar tabel. Gunakan ukuran
            <code className="mx-1 text-xs">icon-xs</code> dan pertahankan
            <code className="mx-1 text-xs">aria-label</code> serta
            <code className="mx-1 text-xs">title</code> saat label visual
            dihilangkan.
          </p>
          <ActionButtonsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Badge System</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Status collection memakai wrapper state bersama
            <code className="mx-1 text-xs">CollectionStatusBadge</code> yang
            meneruskan tone semantik ke primitive Badge. Counter dan metadata
            pill tetap memakai primitive Badge shadcn yang sama. Gunakan
            variant bawaan atau tone semantik shared;
            badge konteks seperti periode memakai `size=&quot;compact&quot;`, `tone=&quot;neutral&quot;`,
            serta pasangan low-contrast `bg-[#0000000a] text-[#8f8e8e]`. Status
            “Tidak dilaporkan” di dalam konfirmasi finalisasi memakai pasangan
            yang sama. State netral seperti empty, loading, dan unavailable di
            seluruh aplikasi memakai state surface tanpa border dengan
            `bg-state-surface text-state-foreground`
            (`#fcfbfb` / `#8f8e8e`).
            Pengecualian hanya counter notifikasi di sidebar, yang tampil sebagai
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
            Card biasa dapat memakai subtitle atau description dengan
            `secondary-foreground` (`#636161`) sebagai konteks pendukung;
            `KpiCard` sengaja tidak memuat subtitle atau description agar
            ringkasan KPI tetap ringkas;
            `muted-foreground` (`#8f8e8e`) tetap untuk caption, helper text,
            metadata, dan legend.
            Section form risiko selalu terbuka dan memakai satu Card per section
            dengan CardHeader dan CardContent; judul section form memakai
            `text-base font-medium tracking-tight` (16px), sedangkan deskripsi
            pendukung memakai `text-sm leading-relaxed text-muted-foreground`
            (14px); jangan gunakan Accordion untuk shell form risiko. Surface
            Form risiko memakai satu kolom form utama dengan panel konteks
            di sisi kanan pada desktop. Shell dibatasi `max-w-[1280px]`,
            memakai jarak 40px (`gap-10`), dan membagi ruang 60% untuk form
            serta 40% untuk panel. Section form tetap terbuka dan
            mengikuti alur dokumen; panel konteks menjadi sticky dan menumpuk di
            bawah form pada viewport sempit.
            struktural non-Card memakai
            `surface-hairline`, yang resolve ke `--shadow-custom` tanpa hard
            border tambahan, sehingga card, panel, dan table memiliki depth
            yang konsisten. Ringkasan KPI collection memakai `KpiCard` dengan surface
            putih, padding dan typography bawaan yang sama di semua halaman;
            KPI tidak memuat subtitle atau description;
            gunakan tone warna hanya untuk konteks non-KPI. Input, search, select,
            dan combobox memakai field-border agar batas field tetap lebih ringan
            dari container. Kontrol pada collection/list memakai tinggi compact
            36px (`h-9`), sedangkan form/detail tetap memakai baseline 40px
            (`h-10`); primitive Input, SearchInput, dan SelectTrigger menjadi
            sumber treatment field bersama, termasuk state disabled yang memakai
            `disabled-surface`. Form risiko yang sudah final bersifat read-only,
            termasuk selector RO, sementara periode asesmen hanya tampil sebagai
            metadata pada panel Properti.
            Form evaluasi memakai grammar yang sama saat memiliki sidebar konteks:
            setiap blok kerja utama memakai Card terpisah dengan header
            `text-base font-medium tracking-tight`, deskripsi `text-sm
            leading-relaxed`, dan content inset `px-5 pb-6 pt-2`; field tetap
            memakai baseline 40px (`h-10`) dan textarea memakai field-border
            bersama. Baris poin evaluasi memakai separator internal dan spacing,
            bukan nested card atau ring kedua.
          </p>
          <CardPatternsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Labeled List</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Gunakan <code className="mx-1 text-xs">LabeledList</code> untuk
            daftar singkat yang memiliki label section di luar surface. List
            memakai satu surface putih dengan radius 10px, jarak label 12px,
            row minimum 56px, inset horizontal 16px, dan divider internal yang
            berhenti 16px dari kedua sisi. Semua row memakai vertical center
            alignment; teks yang membungkus memperbesar tinggi row tanpa bergeser
            ke sisi atas. Tambahkan konten pendukung melalui slot leading,
            description, atau trailing tanpa membuat nested card.
          </p>
          <LabeledListExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Page & Collection / Intelligence Layout
          </DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dashboard, Register, form risiko, Meeting, dan Document Intelligence
            memakai shell halaman yang sama: topbar global menjadi konteks ringkas,
            sementara AppHeader merender title/subtitle untuk route standar. Detail
            Piagam menjadi pengecualian karena header lokalnya memiliki title/subtitle,
            sedangkan back action pada halaman authenticated ditempatkan di
            slot khusus paling atas milik AppHeader, di atas title global. Header
            borderless di dalam konten menangani konteks dan aksi utama. Toolbar tetap berada di
            luar card data,
            dengan filter/search di sisi kiri dan button action di sisi kanan,
            surface netral, dan state loading/empty yang konsisten. Kontrol
            collection/list memakai tinggi compact 36px (`h-9`) agar field di
            kiri sejajar dengan action di kanan; field form/detail tetap 40px
            (`h-10`). Search pada Daftar Risiko dan Penanganan memakai
            `CollectionSearchField` yang persisten dengan ikon di sisi kiri;
            `ExpandableSearchField` dicadangkan untuk toolbar padat yang memang
            membutuhkan affordance minimal. Header form
            mengikuti lebar shell dua kolom agar tepi trailing action sejajar
            dengan tepi panel konteks; pada route standar back action berada di
            atas title global dan action utama tetap di trailing edge pada
            form/detail. Semua halaman form/detail memakai primitive
            `FormBackAction`: variant ghost, ukuran sm, ikon ChevronLeft 16px,
            teks 12px (`text-[12px]`), tanpa padding horizontal agar sejajar
            dengan title header, serta hover warna pada ikon dan label bersama
            tanpa perubahan background.
            Action group form/detail dikirim ke title row `AppHeader` melalui
            `actionsPlacement=&quot;top&quot;`, sehingga pusat CTA mengikuti blok title
            dan subtitle secara vertikal.
            Pada title row, grup CTA memakai `items-center` agar berada di
            tengah vertikal terhadap blok title dan subtitle.
            Background tetap transparan dan grup ikon-label diberi optical nudge
            2px ke leading side (`-translate-x-0.5`) agar pusat visualnya tetap
            seimbang.
            Root shell mempertahankan lebar layout dengan
            <code className="mx-1 text-xs">scrollbar-gutter: stable</code> agar
            breadcrumb, topbar, dan floating controls tidak bergeser ketika
            modal, menu, atau popover mengaktifkan scroll lock.
            Fixed shell chrome membaca ukuran scrollbar yang dihapus melalui
            <code className="mx-1 text-xs">--removed-body-scroll-bar-size</code>
            agar lebarnya tetap sama selama scroll lock.
            Label field form
            memakai `text-sm font-normal`; bobot medium tetap reserved untuk
            button text dan metadata yang membutuhkan penekanan. Field tunggal di dalam group grid
            dua kolom span penuh agar control tidak berhenti di setengah card.
            Inbox memakai tabel persetujuan ringkas yang hanya menampilkan Kode,
            Entitas, Jenis, Tanggal, dan Status; jalur navigasi tetap berasal dari
            judul entitas.
            Detail kertas kerja menempatkan aksi Ekspor Excel di dalam popover
            Tindakan agar header tetap ringkas dan seluruh aksi sekunder terpusat.
            AppHeader merender satu title dan subtitle halaman untuk route
            authenticated standar, dengan back action di slot teratasnya; Detail
            Piagam memindahkan title/subtitle ke header form lokal agar sejajar dengan
            lebar dokumen. Jarak 48px (`mb-12`) dipakai secara konsisten antara
            header halaman dan komponen pertama di main content.
            Section setelah komponen pertama memakai ritme vertikal 24px
            (`space-y-6` atau `gap-y-6`) pada seluruh halaman, termasuk wrapper
            internal KPI, toolbar, dan tabel di Penanganan serta Pemantauan.
            Form registrasi Risiko memakai standalone CollectionPageHeader
            dengan back row dan action form dalam satu header. CollectionPageHeader di dalam halaman tetap dapat memakai
            `showTitle={false}` saat hanya membawa badge atau action lokal; jarak konten dimulai dari inset shell yang
            sama dengan sisi kiri dan kanan. Contoh katalog mengaktifkan judul
            dan subtitle untuk mendemonstrasikan primitive tersebut.
            Detail Evaluasi mengikuti shell standalone yang sama ketika form
            memiliki konteks persisten: gunakan `FormPage` `max-w-[1400px]`,
            `CollectionPageHeader` dengan `backActionPlacement=&quot;local&quot;` dan
            `actionsPlacement=&quot;title&quot;`, lalu grid
            `xl:grid-cols-[minmax(0,1fr)_360px]`. Sidebar status memakai satu
            Card dengan metadata label/value borderless, sedangkan blok poin,
            kesimpulan, dan saran tetap dipisah sebagai section card yang selalu
            terbuka.
            Risk Register memakai satu collection risiko tanpa tab sekunder.
            Kolom Kode digabung ke kolom Risiko dengan kode muted di atas judul;
            semua teks tabel memakai `text-muted-foreground` kecuali judul
            risiko dan warna semantic pada badge status. Tabel tetap menampilkan progres Pemantauan secara ringkas
            sebagai hitungan seperti `2/4`, tanpa label “transaksi”, dan menu
            aksi menyediakan Mulai/Lanjutkan Pemantauan melalui pemilihan periode;
            form edit risiko final yang masih aktif juga boleh menyediakan aksi
            header `Mulai Pemantauan` dengan varian secondary dan pemilihan
            periode yang sama. Jika ada transaksi draft yang sedang berjalan,
            CTA berubah menjadi `Lanjutkan Pemantauan` dan mengarah langsung ke
            transaksi tersebut; selector periode hanya dibuka ketika belum ada
            transaksi berjalan;
            divider bawah header memakai `border-border/60`, sama dengan garis
            atas footer pagination;
            detail transaksinya tersedia di workspace Pemantauan khusus. Toolbar
            register hanya menampilkan action import dan tambah risiko yang relevan,
            tanpa tombol refresh manual. Ikon overflow pada kolom Aksi memakai
            `ActionButton` variant ghost dan ukuran icon-xs, sama seperti tabel
            Evaluasi, agar affordance menu tetap ringan dan konsisten. Pada row
            yang dapat di-hover, surface `bg-muted/50` diterapkan langsung ke
            seluruh body cell, termasuk cell Aksi yang sticky, supaya hover
            tidak terputus di trailing edge tabel.
            Shell authenticated memakai topbar global 56px di atas sidebar dan
            konten: wordmark `manris` Poppins 20px semibold lowercase dengan
            letter-spacing -0.4px tanpa logo dan sejajar dengan inset
            menu sidebar, dan konteks halaman di tengah. Tanpa action tambahan di
            sisi kiri maupun kanan, konteks halaman tetap terpusat dan tenang. AI Tools tetap tersedia melalui section
            AI & OTOMASI di sidebar. Sidebar desktop dimulai di bawah topbar
            dan mengikuti state expanded/collapsed, sedangkan mobile memakai
            trigger sidebar serta wordmark `manris` Poppins 20px semibold yang
            ringkas. Public registration juga memakai wordmark text-only
            lowercase `manris` yang sama dan tidak menampilkan field nomor HP.
            Search field memakai lebar content-fit `sm:w-80` pada desktop dan
            hanya melebar penuh pada mobile saat ruang memang terbatas.
            AppShell menyediakan canvas bersama `max-w-[1400px]` bergaya Vercel
            untuk seluruh halaman; inset atasnya mengikuti `p-4 md:p-6` yang
            sama dengan sisi kiri dan kanan agar konten tidak terlalu jauh dari
            topbar; halaman atau form yang membutuhkan measure
            lebih sempit tetap dapat memilih batas internalnya sendiri. Form
            Risiko yang memakai side panel menetapkan `max-w-[1400px]` pada
            `FormPage` sebagai satu owner lebar; header, notice, dan grid konten
            menjadi child langsung tanpa wrapper `mx-auto`/`max-w-*` tambahan.
            Form panjang dengan panel konteks memakai shell `max-w-[1280px]`
            dengan jarak 40px (`gap-10`): form tetap di kolom utama, panel
            360px memakai item grid polos agar outer edge
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
            daftar di modal scrollable. Marker timeline versi berukuran ringkas
            12px; connector vertikal ditarik dari pusat marker ke pusat marker
            berikutnya agar tidak bergeser saat isi item membungkus. Versi aktif
            memakai fill success, sedangkan versi lain memakai fill abu-abu solid.
            Section pertama pada panel konteks adalah Properti, memakai list
            label/nilai vertikal tanpa nested card yang hanya menampilkan status,
            kode risiko, dan periode asesmen. Kode dan periode tidak diulang lagi
            sebagai field di kartu Identifikasi; nilainya tetap dikelola oleh state
            form dan payload penyimpanan. Divider dashed yang sama memisahkan Properti
            dari section Penanganan berikutnya.
            Ringkasan progres menggunakan list
            vertikal tanpa divider atau nested card, dengan angka memakai
            tabular-nums dan rata kanan dalam spacing yang kompak. Gunakan
            warna teks monochrome untuk seluruh summary progres. Panel ringkas hanya menampilkan summary progres; task
            detail/report table tidak dirender di panel tersebut.
            Rencana mitigasi di dalam form memakai tabel lima kolom: Rencana
            Penanganan, PIC, Tipe, Detail, dan Aksi. Field utama dapat diedit
            langsung per baris, sementara tombol Rincian membuka baris ekspansi
            berisi seluruh field pendukung. Tombol tambah berbentuk outline
            dashed selebar tabel dan aksi hapus tetap berada pada kolom paling
            kanan. Mode hanya baca mempertahankan struktur tabel dan menjaga
            seluruh kontrol tetap disabled.
          </p>
          <CollectionLayoutExample />
          <CollectionPageHeaderExample />

          <section className="space-y-4">
            <DesignSystemSectionLabel>Bulk Risk Import Workflow</DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Alur bulk create risk memakai shell `FormPage` lebar
              (`max-w-7xl`) karena preview memiliki banyak kolom, tetapi tetap
              mengikuti ritme form `space-y-6`. Header memakai `FormHeader`
              dengan `ActionButton` untuk download dan `AccentButton` untuk
              submit; tombol kembali mengikuti treatment `FormBackAction`,
              sedangkan field workflow tetap 40px (`h-10`). Halaman hanya
              memiliki satu alur upload, review, dan submit risiko baru—tanpa
              mode pemantauan, selector periode, organisasi, atau RO. Konteks
              organisasi untuk bulk baru mengikuti kolom `UNIT KERJA` pada file
              untuk user global, atau akun pengguna untuk user non-global.
              Header tidak menampilkan badge tambahan agar hierarki tetap
              ringkas.
              Upload memakai satu dashed drop zone netral dengan radius
              `rounded-xl`; source card dan hasil import memakai Card
              `rounded-xl` tanpa divider header atau nested elevation. Empty
              preview memakai `CollectionEmptyState`. Tabel preview dan hasil
              memakai satu structural border, `CollectionTableHeader` compact
              40px, `CollectionTableHead`, dan Badge tone semantik untuk status.
            </p>
          </section>

          <section className="space-y-4">
            <DesignSystemSectionLabel>Meeting Briefing Creation</DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Form buat briefing dan workspace transkrip memakai FormPage
              max-w-5xl tanpa FormHeader lokal yang menduplikasi AppHeader.
              Card setup transkrip memiliki satu inset 16px tanpa padding content tambahan. Pilihan keluaran memakai
              fieldset berlabel, permukaan netral, pressed state melalui kontras
              border/background tanpa ikon dekoratif, dan focus ring. Label transkrip berada di atas textarea yang bisa
              diperbesar vertikal dengan jarak label ke field 8px. ActionButton dan AccentButton rata kanan
              serta membungkus pada layar kecil. Header card transkrip memakai
              judul medium 15px/23px, deskripsi regular 13px/22px, jarak vertikal
              2px, padding atas 16px, dan inset horizontal 16px. Hasil briefing tidak
              memakai wrapper Card induk. Badge konteks dan action berdiri di baris
              atas, lalu setiap komponen hasil memakai `LabeledList` terpisah dengan
              label di luar surface, radius 10px, inset 16px, dan separator internal.
              Susun Peserta, Agenda, Ringkasan, Key Points, Tindak Lanjut, Isu Terbuka,
              dan Keputusan dalam satu kolom dengan jarak antarseksi 40px. Empty state cukup berupa
              satu pesan muted yang terpusat vertikal tanpa panel, heading, atau ikon tambahan.
              Pada hasil briefing, helper copy, ringkasan KPI operasional, dan metadata
              follow-up yang tidak esensial dihilangkan; box keputusan dan isu terbuka
              tanpa ikon dekoratif atau border kiri.
              Toolbar koleksi `/minutes` untuk sementara hanya menampilkan
              `CollectionSearchField`; filter date dan aksi pembuatan di toolbar
              dihilangkan, sementara CTA pembuatan tetap tersedia pada empty state.
              Pada `/minutes/new`, AppHeader dan form memakai container max-w-5xl
              yang sama agar judul dan isi form sejajar horizontal.
              Ringkasan briefing memakai pola list struktural yang sama dengan Isu Terbuka,
              dan badge hasil memakai
              context badge netral serta tone compact standar untuk prioritas dan
              kebutuhan PIC/deadline.
              Halaman detail briefing memakai shell max-w-5xl yang sama untuk
              AppHeader dan isi agar garis kirinya sejajar. Detail dibaca sebagai
              satu document Card `gap-0 p-0`, dengan inset horizontal 24px pada
              layar kecil dan 32px pada desktop serta divider penuh antarbagian.
              Header dokumen memuat judul briefing, byline pembuat, dan definition
              list dua kolom untuk tanggal rapat, jumlah peserta, check-in
              berikutnya, serta ID briefing. Ini adalah konteks inline, bukan card
              metadata terpisah. Ringkasan, agenda, poin kunci, tindak lanjut, isu
              terbuka, keputusan, dan risiko terkait mengalir sebagai section
              editorial di surface yang sama. Tindak lanjut memakai date band
              netral dan baris task datar; warna semantik hanya dipakai untuk badge
              prioritas. Identitas peserta harus tetap tersedia sebagai konten yang
              bisa dibaca dan diakses keyboard/touch, bukan hanya tooltip.
              Loading memakai status live yang menghormati reduced motion; error
              pemuatan dipisahkan dari not-found/access-denied dan selalu menyediakan
              aksi pemulihan. Terminologi user-facing pada route detail mengikuti
              “Notulen” yang dipakai collection dan navigasi.
              Dialog simpan briefing dan tinjau perubahan memakai shell Dialog
              canonical tanpa close icon, footer rhythm standar, `CollectionDialogCancel`,
              dan `AccentButton`. Dialog simpan tidak memakai description tambahan,
              search field, atau daftar risiko yang selalu terbuka. Gunakan satu
              trigger `Pilih risiko`; popover selector-nya baru menampilkan
              `CollectionSearchField`, opsi risiko, dan checkmark multi-select saat
              trigger dibuka. Dialog destruktif mempertahankan konteks dan pesan
              retry ketika request gagal, lalu menutup hanya setelah penghapusan
              berhasil.
            </p>
          </section>

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
              empty yang sama dengan collection. Dialog pembuatannya memakai judul
              ringkas Pilih Periode dan wrapper field `flex flex-col gap-2` yang
              sama dengan form Risiko. Kode risiko dan periode
              memakai monospace; warna hanya dipakai untuk status. Metadata
              versi teknis tidak ditampilkan pada roster ini. Jika judul section
              sudah cukup jelas,
              helper description pada card dapat dihilangkan. Progress Kertas Kerja
              ditampilkan sebagai disclosure collapsed di paling bawah collection,
              setelah roster dan pagination, agar roster tetap menjadi fokus utama.
              Data progress diurutkan dari periode terbaru ke terlama dan tetap
              berada dalam konteks collection yang sama. Boundary roster
              menggunakan `FormSection` dan `CollectionTableCard` canonical dengan
              perimeter hairline dan radius yang konsisten. Checkbox header dan
              baris diintegrasikan ke kolom Kode agar tidak ada kolom kosong khusus
              untuk seleksi. Pengecualian cukup ditentukan dengan checkbox tanpa
              field alasan tambahan. Tabel memakai layout fluid `w-full table-fixed`
              dengan lebar kolom proporsional, sehingga tidak memaksa scroll
              horizontal. Nilai
            panjang dipotong secara aman dengan Tooltip shadcn bawaan. Konfirmasi
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
              operasional lain; back action berada di slot teratas dan action
              dikirim ke title row `AppHeader` agar CTA sejajar tengah dengan
              title serta subtitle. Aksi utama memakai `AccentButton`,
              sedangkan ekspor dan overflow memakai `ActionButton`; konfirmasi
              mengikuti ukuran action dialog yang sama. Modal aksi
              detail memakai `AlertDialogHeader` yang berisi title dan
              description, lalu footer action yang sama seperti modal lain.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Monitoring Read-only Ledger
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Halaman Pemantauan memakai transaksi dari risk_monitorings
              sebagai sumber daftar langsung, tanpa bergantung pada Kertas
              Kerja. Setiap transaksi pemantauan yang sudah dibuat harus
              muncul pada siklusnya. Pengguna non-global hanya melihat
              transaksi dari organisasinya sendiri; pengguna global tetap dapat
              melihat seluruh scope. Ringkasan KPI menampilkan Berlangsung dan
              Final; pada scope global rekap organisasi menampilkan parent dan
              child dalam satu list flat tanpa memberi aksi mutasi. KPI
              ditampilkan paling atas sebagai orientasi cepat, diikuti Progress
              keseluruhan dan Daftar status pemantauan sebagai ledger utama.
              Rekap per Organisasi menjadi disclosure pendukung setelah daftar
              dan ikut menampilkan parent serta child dalam satu list flat sesuai
              scope pengguna; disclosure dimulai dalam kondisi collapsed agar
              fokus awal tetap pada ledger. Badge siklus
              pada Actions memakai ukuran compact dan surface muted bersama
              dengan teks muted-foreground, bukan fill status semantik. Tabel
              memakai search kode/risiko, filter, pagination, refresh, dan
              selector siklus yang sama dengan Daftar Risiko; search, selector,
              filter, dan refresh memakai tinggi toolbar compact 36px (`h-9`)
              yang sama. Badge siklus dan
              penanda konteks kosong seperti “Belum Ada Data” memakai context badge
              compact dengan surface low-contrast, bukan badge status. Ledger utama tidak
              mengulang kolom Organisasi dan Aksi karena baris serta judul risiko
              sudah menjadi jalur navigasi baca. Skor awal ditampilkan muted dan
              tercoret sebagai referensi historis, sedangkan skor hasil
              pemantauan memakai badge level risiko dengan teks tanpa ikon.
              Disclosure memakai compound component yang sama; chevron berputar saat
              panel dibuka dan trigger tetap keyboard-accessible. Ringkasan kode/judul
              risiko yang dipotong di tabel memakai `Tooltip` shared yang juga dapat
              dibuka melalui keyboard.
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
              surface rounded-xl dan sidebar sticky 360px agar konsisten
              dengan halaman risk register. Header draft memakai label ringkas
              “Pemantauan”, sedangkan hasil final memakai “Hasil Pemantauan Risiko”
              tanpa banner sukses tambahan di bawah header.
              Baseline memakai floating reference bar putih yang fixed di
              bawah-tengah dengan satu boundary `surface-hairline`, radius
              `rounded-xl`, divider tipis, dan tipografi netral. Bar menampilkan
              kode, versi, skor sumber, P/D, target, dan level risiko tanpa blur,
              gradient, atau shadow berat agar tetap clean saat form di-scroll;
              pada layar sempit konten dapat digeser dengan scrollbar dan fokus
              keyboard, sementara offset fixed menghormati safe-area. Tabel
              mitigasi di dalam form bersifat spacing-only tanpa nested
              elevation. Panel simpulan memakai shell Card yang sama dengan
              panel kanan form Risiko (rounded-xl, padding 20px, `CardContent`
              body `text-sm`/14px, title section 10px, dan jarak antar-panel
              24px). Isi simpulan
              menggunakan list berlabel dengan separator dashed yang lembut
              (`border-border/50`) untuk skor, evaluasi, dan efektivitas.
              Semuanya tetap berada di dalam
              shell utama tanpa nested elevation; hasil evaluasi tetap satu
              baris di sidebar sempit. Ringkasan pelaksanaan
              mitigasi berada di panel kanan yang sama, di bawah divider
              dashed, dan hanya menampilkan progress, total, sudah dilaporkan,
              pending, serta disclosure daftar mitigasi inline; setiap baris
              yang masih bisa dilaporkan memiliki tombol kecil Lapor yang
              membuka modal pelaporan—tanpa berpindah halaman atau tabel
              detail. Daftar mitigasi tetap borderless dan memakai jarak 12px
              dari parent tanpa divider atau padding atas tambahan. Saat disclosure dibuka, daftar masuk dengan `Slide in`
              halus dari atas ke bawah memakai opacity dan transform selama
              200ms dengan kurva `Ease-out`; entrance dinonaktifkan untuk
              `prefers-reduced-motion`. Label utama “Total” memakai
              `text-sm` (14px), sementara badge status tetap compact. Badge
              status memakai tone Badge dari Design System, bukan warna lokal.
              Draft
              selalu memperlihatkan status simpan dan memperingatkan perubahan
              yang belum tersimpan melalui AlertDialog. Validasi inline
              terhubung ke field untuk assistive technology, sedangkan error
              pemuatan membedakan data tidak ditemukan dari error yang dapat
              dicoba ulang. Dialog finalisasi merangkum skor sumber ke
              observasi, tren, versi hasil, perubahan substansi, dan mitigasi
              yang masih belum dilaporkan. Setelah commit, halaman berubah menjadi
              read-only dengan metadata finalisasi dan tautan versi hasil. Deskripsi
              dialog menyatakan bahwa pemantauan akan dikunci, snapshot versi resmi
              akan dibuat, dan tindakan tidak dapat dibatalkan. Warning menjelaskan
              bahwa mitigasi yang belum dilaporkan menjadi “Tidak dilaporkan” dan
              memakai surface borderless <code>bg-state-surface text-state-foreground</code>;
              CTA utama memakai label “Finalisasi” dan aksi sekunder memakai “Batal”.
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
            Judul KPI memakai Inter 13px dengan token muted
            `muted-foreground`, weight medium, dan tanpa tambahan letter spacing.
            Angka KPI memakai Inter 28px dengan weight semibold.
            Dashboard dan collection KPI card memakai treatment yang sama;
            KPI card tidak
            memuat chart maupun indikator perbandingan. Nilai `—` tetap dipakai
            bila data tidak tersedia. Judul
            panel/chart tetap memakai treatment card title 14px. KPI card
            memakai baseline tinggi 100px dengan padding 20px; card
            menempatkan angka langsung di bawah judul dengan jarak 12px, dan
            dapat bertambah tinggi saat judul panjang perlu wrap. Chart produksi
            memakai shadcn
            ChartContainer dan persistent text legend; tooltip hanya menjadi
            pelengkap, bukan satu-satunya penanda makna. Distribusi kategori
            risiko produksi berada di halaman Laporan dan mengikuti scope unit
            serta cycle yang aktif; legend tetap berada di bawah chart dalam grid
            responsif agar tidak mengambil ruang horizontal dari visual utama.
            Semua chart memakai plotting field tanpa gridline Cartesian; garis
            data tidak menampilkan dot biasa maupun dot saat hover sehingga
            tooltip dan legend tetap menjadi penanda nilai serta seri.
            Body widget chart memakai satu inset seimbang `p-4` (16px).
            Series bertumpuk dengan label yang mengandung spasi memakai token
            warna semantik secara langsung agar tidak jatuh ke warna hitam
            karena nama CSS variable yang tidak valid.
            Header panel memakai inset 16px dengan gap 16px saat memiliki
            action di sisi kanan. Header dengan select 36px memakai alignment
            `items-start` agar padding visual atas dan kiri judul sama; action
            badge tetap memakai alignment tengah.
            Widget analitik pada halaman Laporan mengikuti urutan eksekutif:
            Laporan Pergerakan Risiko menjadi perbandingan utama full-width,
            lalu tiga pasangan 50/50: Paparan Risiko dengan Tingkat Risiko
            Kritis, Tren Risiko dengan Tren Skor Kuartal vs Target, serta
            Pergerakan Risiko per Organisasi dengan Distribusi Kategori Risiko.
            Mulai breakpoint medium, kolom pasangan tetap sama lebar dan semua
            widget memakai tinggi seragam 480px (`h-[30rem]`) mengikuti baseline
            widget pergerakan organisasi.
            Gunakan `ReportGrid` serta wrapper
            `flex min-h-0 min-w-0 w-full md:h-[30rem]
            md:[&amp;&gt;*]:h-full [&amp;&gt;*]:w-full`; tambahkan
            `md:col-span-2` hanya pada wrapper perbandingan utama. Body panel memakai
            `min-h-0 flex-1`; chart menyerap ruang tersisa, legend tetap pada
            tempatnya, dan empty/loading state memenuhi seluruh area konten.
            Tren Risiko memakai judul teks tanpa ikon dekoratif dan window picker
            `PopoverSelectField` yang sama seperti form Risiko. Widget tren target
            hanya memuat chart dan legend tanpa surface snapshot tambahan. Aksi
            ekspor memakai label ringkas Export.
            Pada layar kecil, widget menumpuk dengan tinggi natural agar konten
            tidak terpotong.
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
            Header KPI memakai inset 16px dan jarak vertikal 12px agar judul
            dan nilai card tetap terkelompok tanpa terasa rapat.
            List Risiko yang Perlu Perhatian memakai ledger terintegrasi tanpa
            checkbox: header 40px dengan surface `table-header`, lalu kolom
            Kode, Judul, Kategori, dan Skor. Kode dan judul
            berada di kolom terpisah, skor tetap berupa badge semantik, dan
            divider antarbaris memakai hairline netral tanpa ikon panah. Baris memakai
            `font-normal` untuk kode, kategori, skor, dan judul pada 14px agar seluruh daftar memiliki
            bobot visual yang sama. Header menggunakan kapitalisasi normal dan
            badge skor mengikuti primitive `Badge` ukuran `micro`, font mono
            tabular, dan warna level risiko semantik.
            Distribusi kolom desktop memakai rasio Kode 10%, Judul 64%, Kategori
            16%, dan Skor 10% melalui grid `5fr 32fr 8fr 5fr`; rasio dihitung
            dari ruang yang tersedia setelah gap sehingga ledger tetap `w-full`
            tanpa overflow. Pada layar sempit, Kategori diringkas inline di
            bawah Judul dan grid memakai rasio Kode 10%, Judul 80%, Skor 10%.
            Narrative Overview mengikuti satu urutan baca: condition, change,
            attention, lalu concentrated risk. KPI tetap tenang, tren
            empat kuartal memiliki bidang visual terlebar, risiko prioritas
            berdampingan dengan heatmap saat ini. Perbandingan multi-fase menjadi
            analisis progresif dalam modal yang dibuka lewat kontrol expand kecil
            di tengah bawah card heatmap saat ini. Kedua card pada baris ini
            berbagi baseline bawah yang sama; kontrol expand melintasi perimeter
            tanpa menambah tinggi card kanan. Isi heatmap memakai inset atas yang
            cukup setelah header agar matriks tidak menempel pada judul. Dashboard tidak memakai `AppHeader`
            maupun helper subtitle di dalam card. Heatmap ringkas mengandalkan
            matriks dan legenda level tanpa caption total yang berulang; tooltip
            memisahkan angka dan label seri dengan jarak yang konsisten. Konten langsung
            dimulai dari KPI karena konteks rute sudah tersedia pada topbar. Pada
            viewport sempit seluruh panel menumpuk mengikuti urutan dokumen tanpa
            menyembunyikan informasi penting.
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
            yang sama: trigger penuh dengan chevron bulat tanpa border dekoratif
            dan stroke 2px, title 14px, optional description dan action kontekstual,
            divider body, serta animasi collapse 200ms yang menghormati reduced
            motion. Susun bagian yang diperlukan melalui children; jangan
            menambah prop boolean untuk variasi header. Kontrol interaktif seperti
            filter periode harus berada sebagai sibling trigger dalam satu baris
            header, bukan nested di dalam tombol trigger; gunakan
            <code className="mx-1 text-xs">PopoverSelectField</code> untuk
            pilihan berbasis opsi. Untuk disclosure yang berisi ledger, gunakan
            body tanpa padding bersama
            <code className="mx-1 text-xs">CollectionTableSurface</code> agar
            tabel menyatu dengan wrapper tanpa border kedua.
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
            dari `tone`. Semua header tabel memakai `text-xs` (12px) dan
            `font-medium` (500), termasuk varian compact; divider header dan
            footer memakai `border-border/60`. Footer pagination hanya muncul
            saat total item lebih dari 10; tabel dengan 10 item atau kurang
            tidak menampilkan footer tersebut. Gunakan
            <code className="mx-1 text-xs">CollectionTableCard</code> untuk
            tabel collection yang memiliki shell sendiri, atau
            <code className="mx-1 text-xs">CollectionTableSurface</code> untuk
            tabel yang ditanam di dalam Card atau disclosure tanpa border kedua;
            keduanya menjaga overflow tabel tetap aman.
            Koleksi Piagam Manris mengikuti grammar yang sama: header compact
            40px, tabel enam kolom dengan kolom Aksi sticky di trailing edge,
            status melalui <code className="mx-1 text-xs">CollectionStatusBadge</code>,
            dan state loading, error, serta empty melalui primitive collection.
            Sel Aksi memakai surface <code className="mx-1 text-xs">bg-card</code>
            dengan padding compact `px-3 py-2`; hover row diterapkan ke seluruh
            sel melalui selector child `td` agar tetap konsisten dengan tabel Risiko.
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
            Konfirmasi destructive seperti hapus draft memakai metadata polos
            tanpa background/ring bertingkat dan komponen `DestructiveButton`
            dengan action merah solid, teks putih, serta label ringkas `Hapus`
            tanpa icon.
            Flow pemilihan atau pembuatan seperti picker periode kertas kerja
            memakai shell yang sama dengan modal lapor penanganan: tanpa close
            control duplikat, field berlabel, footer
            CollectionDialogCancel/AccentButton. Header, field, detail, dan
            footer modal tampil langsung tanpa stagger internal. Selector periode memakai
            pola Popover + Button + option-list yang sama dengan form risiko,
            bukan SelectItem collection. CTA pemantauan mengikuti hasil aksi:
            gunakan “Buat draft & lanjutkan” hanya ketika belum ada draft, dan
            arahkan draft yang sudah ada melalui “Lanjutkan draft”. Gunakan
            istilah “Draft pemantauan” dan “Skor”, serta berikan langkah
            pemulihan pada error yang masih bisa dicoba ulang. Pada finalisasi
            pemantauan, mitigasi hanya dihitung dilaporkan jika statusnya selesai
            dan catatan pelaksanaan terisi; mitigasi tanpa isian akan dikunci
            sebagai “Tidak dilaporkan”, tidak memiliki aksi Lapor, dan tidak
            dibuat sebagai tindak lanjut periode berikutnya.
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
            Header, form, dan footer tampil statis setelah shell modal terbuka.
            Handoff dari detail ke laporan berlangsung melalui lifecycle exit modal; pada reduced motion, dialog laporan
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
            Link bukti dimulai sebagai teks dengan ikon plus dan hover ala item
            sidebar: latar aksen dan warna foreground.
            Beberapa link tampil sebagai daftar ringkas dan bisa dihapus satu per
            satu. Setelah ada link, Tambahkan Link berada di sisi kanan sebagai
            ikon plus saja. Saat diaktifkan, kontrol melebar secukupnya di baris yang sama
            dan teks beralih halus menjadi input tanpa label visual tambahan.
            Enter menyimpan link sementara ke daftar, sedangkan Kbd Esc dengan
            label Batal membatalkan draft. Keduanya berada tepat di bawah
            input dan sejajar dengan sisi kirinya. Saat editor aktif, Escape
            pertama hanya menutup input; Escape berikutnya baru menutup modal.
            Editor tetap berada di samping kanan
            daftar link dengan lebar 40% dari container dan batas maksimum
            32rem. Nama aksesibel tetap Link
            Bukti; setiap resource mempertahankan ikon panah diagonal di slot aksi
            saat idle, lalu beralih menjadi options tiga titik saat hover/focus.
            Slot tombol tetap transparan tanpa wrapper visual tambahan, dengan
            menu Edit/Delete, validasi edit, dan konfirmasi destructive.
            Reduced motion melewati transisi.
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
            Terapkan Skor dan Batal mempertahankan instance dialog sampai animasi
            exit shared 200ms selesai; React key tidak boleh berubah mengikuti
            state open. Draft selection disinkronkan ulang dari nilai tersimpan
            setiap kali modal dibuka.
            Pada desktop, area tengah mengikuti tinggi konten tanpa scroll;
            viewport sempit tetap punya fallback scroll agar grid tidak terpotong.
            Cell aktif mempertahankan warna border level risiko lalu hanya
            menebalkan border menjadi 2px, tanpa warna foreground, tanda
            centang, atau ring offset kedua. Angka ringkasan di bawah heatmap
            memperbarui angka secara langsung saat selection berubah dan
            mempertahankan tabular numerals tanpa animasi internal.
            User memilih kombinasi probabilitas × dampak melalui
            sel dengan angka dan label yang jelas, melihat tiga kartu ringkas
            untuk probabilitas, dampak, dan hasil. Label level tetap terlihat
            di bawah angka agar konteks tidak bergantung pada tooltip; judul
            sumbu tambahan dihilangkan supaya grid lebih bersih. Ringkasan di
            bawah heatmap tampil borderless dengan angka yang lebih dominan.
            Form register tidak menumpuk summary strip kedua setelah picker.
            Instruksi dialog memakai kata pilih agar tetap jelas untuk pointer,
            touch, dan keyboard. User lalu mengonfirmasi melalui Terapkan Skor.
            Detail evaluasi yang
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dropdown memakai panel putih solid dengan radius 12px dan inset
            4px. Setiap opsi memakai radius 8px dan padding kiri 8px, dengan
            padding kanan 40px untuk opsi yang memiliki checkmark; baris opsi
            setinggi 32px (`h-8`).
            State hover atau fokus memakai surface
            abu-abu lembut, sedangkan opsi terpilih ditandai centang di sisi
            kanan tanpa menambahkan badge atau warna dekoratif.
          </p>
          <dl className="grid max-w-3xl overflow-hidden rounded-lg bg-border/70 text-sm sm:grid-cols-2">
            {[
              ["Trigger", "h-9 / 36px · min-width 176px · px-16px"],
              ["Panel katalog", "w-64 / 256px · min-width 128px"],
              ["Panel inset", "4px di seluruh sisi (p-1)"],
              ["Panel radius", "12px"],
              ["Opsi", "h-8 / 32px · radius 8px"],
              ["Inset opsi", "8px kiri · 40px kanan untuk indikator"],
              ["Teks opsi", "14px / 20px · Inter regular"],
              ["Jarak internal", "8px antar konten dan ikon (gap-2)"],
              ["Checkmark", "16px · 12px dari tepi kanan"],
              ["Offset overlay", "8px dari trigger · collision padding 12px"],
              ["Focus outline", "2px · offset -2px · foreground"],
              ["Separator", "1px tinggi · inset horizontal -8px"],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(0,7rem)_1fr] gap-3 bg-card px-4 py-3">
                <dt className="font-medium text-foreground">{label}</dt>
                <dd className="font-mono text-xs leading-5 text-muted-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <DropdownMenuExample />
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
            Tombol saran AI pada form risiko mengecilkan ikon, menumbuhkan spinner
            biasa yang tersambung di slot ikon, lalu mengganti teks dengan slide
            horizontal dari kiri ke kanan dan sedikit overshoot. Lebar tombol
            tetap stabil. Request berjalan bersamaan; modal muncul setelah data
            siap dan transisi 540ms selesai. Reduced motion mengganti state langsung
            tanpa delay; kegagalan menampilkan toast dan mengaktifkan tombol kembali.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Saran judul risiko memakai modal clean-list single-select dengan
            list flat tanpa wrapper visual dan divider, metadata sekunder,
            teks item sejajar dengan title modal, hierarchy title/deskripsi/meta
            yang compact, detail muncul dengan Accordion / Collapse yang tumbuh
            halus selama 200ms saat hover/focus, deskripsi ditampilkan penuh saat
            terbuka, dan semuanya tertutup saat modal pertama dibuka karena fokus
            awal berada pada shell dialog. Scroll boundary tetap bounded, direct apply saat item dipilih,
            dan footer hanya berisi tombol Batal; tanpa icon, subtitle, atau close.
            Pada reduced motion, detail langsung tampil tanpa transisi.
            Saran penyebab dan dampak risiko memakai varian structured-list
            multi-select dengan shell yang sama seperti modal lapor penanganan
            dan list checkbox/saran tanpa divider; list yang panjang tetap scroll
            di area list agar footer selalu terlihat tanpa membuat modal terlalu tinggi.
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Form Piagam Manris memakai FormPage satu kolom selebar maksimum 5xl
            tanpa card wrapper. Label Judul Piagam tetap terlihat, sementara
            textarea judul tampil seperti teks dokumen tanpa chrome field,
            membungkus teks panjang, dan tumbuh mengikuti isi;
            metadata organisasi, level UPR, dan tahun tidak diulang di body form.
            Ruang lingkup, konteks internal, dan konteks eksternal memakai
            DocumentFormSection yang selalu terbuka tanpa divider atau subtitle
            tambahan, dengan field ditata vertikal di bawah label bagiannya.
            Dasar hukum, stakeholder eksternal, dan struktur UPR memakai
            DocumentListSection dengan label section di atas surface list, tombol +
            di ujung kanan label untuk membuka modal tambah/edit, dan menu ellipsis
            untuk tindakan item. Surface list tidak mengulang title atau header card.
            List memakai inset horizontal 16px dan vertikal 6px, tanpa fill hover dekoratif;
            Struktur UPR memakai picker pengguna agar nama dan jabatan terisi otomatis; jarak
            visual antarkelompok 12px dari satu parent stack, dengan override
            24px pada batas judul–Ruang Lingkup, textarea–list, list–section
            berikutnya, dan transisi konteks internal–eksternal; label ke field tetap
            12px. Section naratif tidak menambahkan padding vertikal sendiri
            atau label sr-only sebagai sibling field agar gap tersebut tidak
            bertumpuk; heading section menjadi accessible label melalui
            aria-labelledby. Pada route ini, FormPage memakai space-y-0 karena
            wrapper FormHeader sudah menyediakan gap bawah total 48px; document stack hanya
            memiliki padding bawah sehingga jarak header tidak terduplikasi.
            Header form lokal menampilkan title/subtitle halaman dan hanya
            mempertahankan badge status; badge Versi tidak ditampilkan. Back action
            memakai placement lokal dengan inset `px-6 lg:px-8` yang sama seperti
            field agar garis kiri tetap sejajar.
            Draf disimpan manual melalui tombol Simpan draf di sisi kiri Finalisasi,
            sejajar dengan ujung kanan form; tombol hanya aktif saat ada perubahan.
            Menu tiga titik ditempatkan paling kiri sebagai entry point untuk riwayat
            versi, revisi, arsip, pulihkan, dan hapus permanen. Simpan draf memakai
            tombol secondary, sedangkan Finalisasi memakai tombol primary. Semua modal Piagam mengikuti shell
            modal Lapor Progress Penanganan:
            lebar max-w-2xl, tanpa ikon close, header/footer yang konsisten,
            tombol Batal outline, dan aksi utama berukuran primary. Sheet riwayat
            versi tetap menjadi panel samping, tetapi memakai treatment tanpa ikon
            close dan footer yang sama. Finalisasi, revisi, arsip, dan hapus permanen tetap
            memakai primitive dialog bersama. Quick create hanya meminta judul
            melalui route modal dan tidak melakukan prefill.
          </p>
          <FormContainerExample />
        </section>
      </PageStack>
    </TooltipProvider>
  );
}
