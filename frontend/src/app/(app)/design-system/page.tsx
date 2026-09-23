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
  WarningCardExample,
} from "@/components/shared/design-system/examples";

export default function DesignSystemPage() {
  return (
    <TooltipProvider>
      <PageStack>
        <section className="space-y-4">
          <DesignSystemSectionLabel>Color Palette</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Root dokumen tetap transparan. Canvas utama dan app shell memakai
            token background dan main-content #ffffff, serta sidebar #fafafa;
            header tabel memakai surface #fcfcfc. Gunakan token
            background pada shell, halaman, dan surface yang memang memiliki
            konteks; hover hanya
            dimiliki oleh kontrol interaktifnya. Batas struktur memakai token
            surface-border (#e3e3e3), sedangkan field/input memakai boundary
            `border-shadow` berbasis shadow-custom tanpa hard border; field-border
            (#ebebeb) tetap tersedia untuk override legacy/semantik; warna semantik tetap khusus untuk
            status, validasi, selection, dan focus. Chart memakai token Origin:
            cyan signal sebagai seri utama, iris sebagai pembanding, dan aksen
            orchid/periwinkle untuk kategori pendukung; level risiko tetap
            memakai token semantik. Hierarki font color global memakai
            `foreground` (`#201d1d`), `secondary-foreground` (`#52525b`),
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
            Item navigasi sidebar memakai bobot normal saat inactive dan medium
            saat aktif; label grup tetap medium dan
            berukuran 11px tanpa character spacing tambahan, sedangkan elemen pendukung tetap normal. State aktif dibedakan oleh
            surface netral dan warna icon/teks yang lebih gelap, sedangkan state
            inactive memakai teks dan icon `secondary-foreground` (`#52525b`) dengan stroke icon `1.8`,
            tanpa animasi transform maupun transition pada icon,
            tanpa garis dekoratif di sisi kiri. Setiap baris menu memiliki jarak vertikal
            2px (`gap-0.5`) agar surface hover tetap rapat namun terbaca. Setiap item menu memiliki
            tinggi 36px (`h-9`) dengan padding horizontal 8px (`px-2`), sedangkan
            Dashboard dan
            Persetujuan &amp; TTE berada dalam satu grup mandiri tanpa label di atas
            section OPERASIONAL. Antarkelompok menu memakai jarak 20px (`gap-5`)
            untuk memperjelas hierarki. Navigasi
            memiliki lebar desktop 260px (`16.25rem`), inset horizontal 12px
            (`px-3`), dan inset atas 8px (`pt-2`)
            dari batas bawah header/logo.
            Radius item hover
            mengikuti button standar dengan `rounded-md` (6px). Hover netral di seluruh
            aplikasi mengikuti surface sidebar yang sama; hover semantik tetap
            mempertahankan warna statusnya. Batas footer memakai fade blur halus
            sebelum area akun dan bantuan.
            Footer akun memakai baris borderless yang menempatkan nama user di
            samping icon `HelpCircle`; icon tersebut membuka popover compact berisi
            pilihan `Panduan`. Jangan menambahkan kembali kartu, border keras, atau
            shadow pada baris footer ini.
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
            modal Detail Aktivitas Catatan: surface disabled yang sangat ringan
            (#f8f8f8), teks disabled (#bcbbbb), dan cursor not-allowed.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Trigger dan item menu mempertahankan outline fokus-visible berkontras
            tinggi agar kontrol aktif mudah dilacak oleh pengguna keyboard.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Semua field bersama, termasuk trigger custom pada form Risiko dan
            Pemantauan, memakai `border-shadow` sebagai perimeter bersama tanpa
            hard border; focus dan invalid state memakai ring/shadow semantik.
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Pesan invalid memakai
            <code className="mx-1 text-xs">FieldErrorMessage</code> dan masuk
            sebagai accordion/collapse kecil: baris membuka dari `0fr` ke `1fr`
            sambil fade dan turun 4px selama 200ms dengan easing `--ease-out`.
            Teks error mengikuti sesudahnya dengan delay 20ms dan fade selama 160ms
            agar pesan terbaca setelah container mulai terbuka.
            Reduced motion mempertahankan fade 120ms tanpa perpindahan spasial.
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
            wordmark `Manris` pada judul memakai treatment Inter tanpa underline.
            Field login dan daftar akun memakai surface netral `bg-muted/30`
            dengan border 1px `border-input` agar tetap terbaca pada shell
            autentikasi yang terang.
            Animasi dekoratif dan entrance menghormati
            <code className="mx-1 text-xs">prefers-reduced-motion</code>;
            kontrol password memiliki label aksesibel, focus ring, dan hit area
            yang cukup.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Ikon browser memakai kotak ber-radius yang hampir hitam, dengan
            gradient abu-abu tipis di tepi untuk memberi kedalaman 3D. Mark ini
            berdiri sendiri tanpa grid titik agar tetap terbaca pada ukuran
            favicon.
          </p>
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Button Variants</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Semua button berlabel memakai font size 14px, padding horizontal
            16px, bobot medium (500), dan tanpa ikon dekoratif agar hierarki
            action konsisten di seluruh varian.
            Button primary memakai surface solid tanpa shadow. Button secondary
            memakai surface hover sidebar yang sedikit lebih gelap tanpa garis
            tepi; varian outline tetap
            digunakan saat border diperlukan. Depth hanya digunakan pada surface
            yang memang elevated seperti card, modal, dan dropdown. Untuk action collection
            yang perlu menyatu dengan perimeter Card, gunakan `border-0
            border-shadow` agar boundary-nya memakai `--shadow-custom` yang
            sama. Tombol bantuan AI inline memakai treatment outline dengan
            ukuran compact yang sama, tanpa ikon dekoratif; state loading
            ditunjukkan melalui label `Memproses...`. Feedback tekan memakai
            transisi transform 150ms dengan strong ease-out dari primitive
            bersama; feature page tidak menambahkan scale lokal, dan reduced
            motion menghapus transform tersebut.
          </p>
          <ButtonVariantsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Shared Action Buttons</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Button berlabel selalu memakai teks 14px dan text-only, termasuk saat
            loading; state loading ditunjukkan melalui label. Jika aksi toolbar sengaja
            memasangkan ikon dan label, gunakan jarak 8px (`gap-2`). Gunakan kontrol icon-only untuk
            dropdown action yang perlu tetap ringkas, termasuk di luar tabel,
            dengan ukuran 32px (`icon-xs`) dan perimeter `border-0 border-shadow`;
            pertahankan
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
            `StandardCard` dapat memakai satu subtitle atau description ringkas dengan
            `secondary-foreground` (`#52525b`) sebagai konteks pendukung;
            gunakan `contentClassName=&quot;p-4 pt-0&quot;` ketika content memang perlu
            menempel langsung ke bawah header tanpa gap atas tambahan;
            `KpiCard` sengaja tidak memuat subtitle atau description agar
            ringkasan KPI tetap ringkas;
            `muted-foreground` (`#8f8e8e`) tetap untuk caption, helper text,
            metadata, dan legend.
            Section form risiko selalu terbuka dan memakai satu Card per section
            dengan CardHeader dan CardContent; judul section form memakai
            `text-sm font-medium tracking-tight` (14px), sedangkan deskripsi
            pendukung memakai `text-xs leading-relaxed text-secondary-foreground`
            (12px); jangan gunakan Accordion untuk shell form risiko. Surface
            Form risiko memakai satu kolom form utama dengan panel konteks
            di sisi kanan pada desktop. Shell dibatasi `max-w-7xl`,
            memakai jarak 24px (`gap-6`), dan membagi ruang 60% untuk form
            serta 40% untuk panel. Section form tetap terbuka dan
            mengikuti alur dokumen; panel konteks menjadi sticky dan menumpuk di
            bawah form pada viewport sempit.
            struktural non-Card memakai
            `surface-hairline`, yang resolve ke `--shadow-custom` tanpa hard
            border tambahan, sehingga card, panel, table, dan field memiliki depth
            yang konsisten. Ringkasan KPI collection memakai `KpiCard` dengan surface
            putih, padding dan typography bawaan yang sama di semua halaman;
            KPI tidak memuat subtitle atau description;
            gunakan tone warna hanya untuk konteks non-KPI. Input, search, select,
            dan combobox memakai `border-shadow` agar boundary field konsisten
            dengan outline control. Kontrol pada collection/list memakai tinggi compact
            36px (`h-9`), sedangkan form/detail tetap memakai baseline 40px
            (`h-10`); primitive Input, SearchInput, dan SelectTrigger menjadi
            sumber treatment field bersama, termasuk `border-shadow` dan state disabled yang memakai
            `disabled-surface`. Form risiko yang sudah final bersifat read-only;
            selector RO disembunyikan pada mode pembuatan maupun detail risiko,
            sementara Ringkasan Hirarki juga tidak ditampilkan. Periode pemantauan
            hanya tampil sebagai metadata pada panel Properti. Nilai `roId`
            tetap dipertahankan di state dan payload.
            Label kiri pada panel kanan Form Risiko dan Pemantauan memakai
            13px (`text-[13px]`), sedangkan nilai ringkas tetap 14px.
            Form evaluasi memakai grammar yang sama saat memiliki sidebar konteks:
            setiap blok kerja utama memakai Card terpisah dengan header
            `text-base font-medium tracking-tight`, deskripsi `text-sm
            leading-relaxed`, dan content inset `px-5 pb-6 pt-2`; field tetap
            memakai baseline 40px (`h-10`) dan textarea memakai `border-shadow`
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
            memakai satu surface putih dengan radius 8px, jarak label 12px,
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
            Dashboard, Register, form risiko, MoM, dan Document Intelligence
            memakai shell halaman yang sama: topbar global menjadi breadcrumb ringkas
            yang memetakan parent muted ke halaman aktif,
            tanpa global page header tambahan. Header lokal di dalam konten menangani
            title/subtitle dan aksi utama hanya ketika workflow membutuhkannya. Detail
            Piagam tetap memiliki header lokal dengan title/subtitle. Header
            borderless di dalam konten menangani konteks dan aksi utama. Toolbar tetap berada di
            luar card data,
            dengan filter/search di sisi kiri dan button action di sisi kanan,
            surface netral, dan state loading/empty yang konsisten. Kontrol
            collection/list memakai tinggi compact 36px (`h-9`) agar field di
            kiri sejajar dengan action di kanan; field form/detail tetap 40px
            (`h-10`). Search pada Daftar Risiko dan Penanganan memakai
            `CollectionSearchField` yang persisten dengan ikon di sisi kiri dan
            keycap `Esc` di sisi kanan untuk mengosongkan query;
            trigger filter memakai icon-only 36px dengan `aria-label` dan tooltip
            untuk menjaga konteks tanpa label visual;
            `ExpandableSearchField` dicadangkan untuk toolbar padat yang memang
            membutuhkan affordance minimal. Header form
            memakai jarak 8px (`gap-2`) ketika aksi berlabel sengaja dipasangkan
            dengan ikon kontekstual, seperti `Import Risiko`;
            mengikuti lebar shell dua kolom agar tepi trailing action sejajar
            dengan tepi panel konteks; action utama tetap di trailing edge pada
            form/detail.
            Action group form/detail tetap inline pada header lokal melalui
            `actionsPlacement=&quot;top&quot;`; wrapper action memakai
            `justify-end` agar seluruh CTA menempel ke sisi trailing shell dan
            tidak ada portal ke global page header.
            Pada title row lokal, grup CTA memakai `items-center` agar tetap
            sejajar secara vertikal.
            Background tetap transparan agar action group tetap ringan.
            Root shell mempertahankan lebar layout dengan
            <code className="mx-1 text-xs">scrollbar-gutter: stable</code> agar
            breadcrumb, topbar, dan floating controls tidak bergeser ketika
            modal, menu, atau popover mengaktifkan scroll lock.
            Elemen root <code className="mx-1 text-xs">html</code> memakai
            utility <code className="mx-1 text-xs">border-shadow</code> dari
            design system sebagai boundary global yang konsisten.
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
            Tindakan tanpa label menu visual tambahan agar header tetap ringkas
            dan seluruh aksi sekunder terpusat.
            Route authenticated tidak merender AppHeader global; Detail
            Piagam memakai title/subtitle pada header form lokal agar sejajar dengan
            lebar dokumen 672px. Jarak 24px (`mb-6`) dipakai antara
            header lokal dan komponen pertama di main content bila header tersebut ada.
            Section setelah komponen pertama memakai ritme vertikal 24px
            (`space-y-6` atau `gap-y-6`) pada seluruh halaman. Collection table
            atau result list yang langsung mengikuti toolbar/filter memakai
            ritme 16px (`space-y-4`) agar kontrol dan data tetap terbaca sebagai
            satu kelompok kerja di semua halaman.
            Form registrasi Risiko sengaja tidak memakai CollectionPageHeader lokal
            kedua karena route ini sudah memiliki konteks dari shell aplikasi.
            Action utama tetap berada dalam satu toolbar compact di sisi trailing
            sebagai child pertama FormPage. CollectionPageHeader di dalam halaman
            tetap dapat memakai `showTitle={false}` saat hanya membawa badge atau
            action lokal; jarak konten dimulai dari inset shell yang sama dengan sisi
            kiri dan kanan. Contoh katalog mengaktifkan judul dan subtitle untuk
            mendemonstrasikan primitive tersebut. Header memakai satu wrapper
            content tanpa nested `min-w-0` yang redundan agar struktur header tetap
            ringkas. Header setiap section card pada form Risiko memakai
            title 14px (`text-sm`) dan subtitle 12px (`text-xs`) agar hierarkinya
            tetap ringkas.
            Detail Evaluasi mengikuti shell standalone yang sama ketika form
            memiliki konteks persisten: gunakan `FormPage` `max-w-7xl`,
            `CollectionPageHeader` dengan `actionsPlacement=&quot;title&quot;`, lalu grid
            `xl:grid-cols-[minmax(0,1fr)_360px]`. Sidebar status memakai satu
            Card dengan metadata label/value borderless, sedangkan blok poin,
            kesimpulan, dan saran tetap dipisah sebagai section card yang selalu
            terbuka.
            Risk Register memakai satu collection risiko tanpa tab sekunder.
            Kolom Kode digabung ke kolom Risiko sebagai metadata muted di bawah
            judul primer, mengikuti pola dua tingkat pada tabel operasional.
            Proporsi tabelnya adalah Risiko/Judul 42%, Kategori 15%, Skor 8%,
            Status 11%, Pemantauan 18%, dan Aksi 6%. Surface memakai radius 12px,
            header 44px dengan fill netral tipis, row 68px, inset horizontal 20px,
            divider horizontal halus, dan tanpa grid vertikal. Kategori memakai
            `text-secondary-foreground`, skor dan judul memakai `text-foreground`,
            metadata memakai `text-muted-foreground`, dan warna tetap dibatasi
            pada badge status. Tabel tetap menampilkan progres Pemantauan secara ringkas
            sebagai hitungan seperti `2/4`, tanpa label “transaksi”, dan menu
            aksi menyediakan Mulai/Lanjutkan Pemantauan melalui pemilihan periode;
            form edit risiko final yang masih aktif juga boleh menyediakan aksi
            header `Mulai Pemantauan` dengan varian secondary dan pemilihan
            periode yang sama. Jika ada transaksi draft yang sedang berjalan,
            CTA berubah menjadi `Lanjutkan Pemantauan` dengan varian outline,
            padding horizontal 16px, tanpa ikon, dan mengarah langsung ke
            transaksi tersebut; selector periode hanya dibuka ketika belum ada
            transaksi berjalan;
            divider bawah header memakai `border-border/60`, sama dengan garis
            atas footer pagination;
            detail transaksinya tersedia di workspace Pemantauan khusus. Toolbar
            register hanya menampilkan action import dan tambah risiko yang relevan,
            tanpa tombol refresh manual. Ikon overflow pada kolom Aksi memakai
            `ActionIconButton` ukuran icon-xs dengan label aksesibel spesifik
            risiko dan perimeter `border-shadow` tanpa hard border, sama seperti
            tabel Evaluasi, agar affordance menu tetap ringan
            dan konsisten. Pada row
            yang dapat di-hover, surface `bg-muted/50` diterapkan langsung ke
            seluruh body cell, termasuk cell Aksi yang sticky, supaya hover
            tidak terputus di trailing edge tabel.
            Shell authenticated memakai topbar global 56px di atas sidebar dan
            konten: wordmark `manris` Inter 20px semibold lowercase dengan
            letter-spacing -0.4px tanpa logo dan sejajar dengan inset
            menu sidebar, dan konteks halaman di tengah. Tanpa action tambahan di
            sisi kiri maupun kanan, konteks halaman tetap terpusat dan tenang. AI Tools tetap tersedia melalui section
            AI & OTOMASI di sidebar. Sidebar desktop dimulai di bawah topbar
            dan mengikuti state expanded/collapsed, sedangkan mobile memakai
            trigger sidebar serta wordmark `manris` Inter 20px semibold yang
            ringkas. Public registration juga memakai wordmark text-only
            lowercase `manris` yang sama dan tidak menampilkan field nomor HP.
            Search field memakai lebar content-fit `sm:w-80` pada desktop dan
            hanya melebar penuh pada mobile saat ruang memang terbatas.
            AppShell menyediakan canvas selebar area konten untuk seluruh halaman;
            inset atasnya mengikuti `p-4 md:p-6` yang
            sama dengan sisi kiri dan kanan agar konten tidak terlalu jauh dari
            topbar; halaman atau form yang membutuhkan measure
            lebih sempit tetap dapat memilih batas internalnya sendiri. Form
            Risiko yang memakai side panel memakai `FormPage` selebar area konten;
            header, notice, dan grid konten
            menjadi child langsung tanpa wrapper `mx-auto`/`max-w-*` tambahan.
            Form panjang dengan panel konteks memakai shell `max-w-7xl`
            dengan jarak 24px (`gap-6`): form tetap di kolom utama, panel
            360px memakai item grid polos agar outer edge
            kartu pertama pada form dan panel dimulai pada garis atas yang sama.
            Pada workflow Pemantauan, aksi `Simpan draft` memperbarui data
            secara in-place tanpa memanggil ulang loading page atau me-mount
            ulang `FormPage` maupun disclosure form. Slot status header menjaga
            lebar action group tetap stabil; perubahan visual hanya terjadi pada
            tombol dan toast.
            Perilaku sticky mulai breakpoint xl ditempatkan pada wrapper di dalam
            panel dengan `top-20`, bukan pada item grid-nya, lalu
            kedua kolom menumpuk di bawah form pada viewport yang lebih sempit. Panel konteks tidak
            memakai tab untuk konten paralel; gunakan section terpisah dengan
            seluruh heading section uppercase 12px (`text-xs`) berwarna muted
            70% dengan character spacing 0.6px. Semua section memakai divider dashed/soft, dan timeline atau
            list untuk histori versi agar progres, kejadian terkait, catatan, dan
            riwayat tetap terlihat serta mudah dipindai. Section Kejadian menampilkan
            maksimal tiga record terbaru sebagai row flat yang menaut ke detail LED,
            disertai kode, tingkat, deskripsi ringkas, dan tanggal kejadian tanpa
            nested card. Aksi Catat kejadian berada di trailing judul section sebagai
            ActionIconButton plus-only dengan label aksesibel, bukan di toolbar form.
            Aksi ini membuka ulang drawer pencatatan LED yang sama dengan halaman
            Kejadian dan otomatis memilih risiko yang sedang dibuka, tetapi hanya
            tersedia ketika risiko berstatus final. Sebelum finalisasi, state
            kosong menjelaskan syarat tersebut.
            Catatan memakai compact activity feed:
            aktivitas inti dan waktu relatif tanpa avatar atau nested card;
            detail lengkap dibuka lewat modal dengan shell form yang sama seperti
            Tambah catatan dan field Input/Textarea disabled. Judul Catatan mengikuti
            pola Kejadian dengan jumlah item dan ActionIconButton plus-only di sisi
            kanan; aksi tambah tidak tersedia selama risiko masih berstatus draft.
            Preview catatan dan histori
            versi dibatasi lima item terbaru, dengan action untuk membuka seluruh
            daftar di modal scrollable. Marker timeline versi berukuran ringkas
            12px; connector vertikal ditarik dari pusat marker ke pusat marker
            berikutnya agar tidak bergeser saat isi item membungkus. Versi aktif
            memakai fill success, sedangkan versi lain memakai fill abu-abu solid.
            Section pertama pada panel konteks adalah Properti, memakai list
            label/nilai vertikal tanpa nested card yang menampilkan status, kode
            risiko, versi, dan periode pemantauan. Kode dan periode tidak diulang lagi
            sebagai field di kartu Identifikasi; nilainya tetap dikelola oleh state
            form dan payload penyimpanan. Saat memilih versi, tutup dialog riwayat
            dan tampilkan loading kontekstual; request lama tidak boleh menimpa
            snapshot versi yang terakhir dipilih. Tandai versi aktif melalui marker
            timeline dan metadata versi; jangan tambahkan badge `Terkini` yang
            redundan. Divider dashed yang sama memisahkan Properti dari section
            Penanganan berikutnya.
            Ringkasan progres menggunakan list
            vertikal tanpa divider atau nested card, dengan angka memakai
            tabular-nums dan rata kanan dalam spacing yang kompak. Label summary
            progres memakai 13px (`text-[13px]`), sedangkan angkanya 14px
            (`text-sm`). Gunakan
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
              submit, sedangkan field workflow tetap 40px (`h-10`). Halaman hanya
              memiliki satu alur upload, review, dan submit risiko baru—tanpa
              mode pemantauan, selector periode, organisasi, atau RO. Konteks
              organisasi untuk bulk baru mengikuti kolom `UNIT KERJA` pada file
              untuk user global, atau akun pengguna untuk user non-global.
              Header tidak menampilkan badge tambahan agar hierarki tetap
              ringkas.
              Upload memakai satu dashed drop zone netral dengan radius
              `rounded-lg`; source card dan hasil import memakai Card
              `rounded-lg` tanpa divider header atau nested elevation. Empty
              preview memakai `CollectionEmptyState`. Tabel preview dan hasil
              memakai satu structural border, `CollectionTableHeader` compact
              40px, `CollectionTableHead`, dan Badge tone semantik untuk status.
            </p>
          </section>

          <section className="space-y-4">
            <DesignSystemSectionLabel>MoM Briefing Creation</DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Form buat briefing dan workspace transkrip memakai FormPage
              max-w-7xl tanpa FormHeader lokal yang menduplikasi konteks halaman.
              Card setup transkrip memiliki satu inset 16px tanpa padding content tambahan. Pilihan keluaran memakai
              fieldset berlabel, permukaan netral, pressed state melalui kontras
              border/background tanpa ikon dekoratif, dan focus ring. Label transkrip berada di atas textarea yang bisa
              diperbesar vertikal dengan jarak label ke field 8px. ActionButton dan AccentButton
              text-only, rata kanan, serta membungkus pada layar kecil; label idle dan loading
              tidak memakai icon agar tinggi baris aksi tetap stabil. Header card transkrip memakai
              judul medium 15px/23px, deskripsi regular 13px/22px, jarak vertikal
              2px, padding atas 16px, dan inset horizontal 16px. Hasil briefing tidak
              memakai wrapper Card induk. Badge konteks dan action berdiri di baris
              atas, lalu setiap komponen hasil memakai `LabeledList` terpisah dengan
              label di luar surface, radius 8px, inset 16px, dan separator internal.
              Susun Peserta, Agenda, Ringkasan, Key Points, Tindak Lanjut, Isu Terbuka,
              dan Keputusan dalam satu kolom dengan jarak antarseksi 40px. Empty state cukup berupa
              satu pesan muted yang terpusat vertikal tanpa panel, heading, atau ikon tambahan.
              Pada hasil briefing, helper copy, ringkasan KPI operasional, dan metadata
              follow-up yang tidak esensial dihilangkan; box keputusan dan isu terbuka
              tanpa ikon dekoratif atau border kiri.
              Toolbar koleksi `/minutes` menampilkan `CollectionSearchField` di sisi
              leading dan aksi `Buat Notulen` di sisi trailing; filter date
              dihilangkan agar tombol pembuatan tetap tersedia pada semua kondisi
              daftar. Empty state tidak menduplikasi CTA tersebut.
              Pada `/minutes/new`, header lokal dan form memakai container max-w-7xl
              yang sama agar judul dan isi form sejajar horizontal.
              Ringkasan briefing memakai pola editorial yang sama dengan Isu Terbuka
              dan menggunakan lebar section penuh tanpa batas 75ch. Agenda memakai
              poin bulat yang sama dengan Poin kunci. Tindak lanjut memakai baris task
              datar tanpa ikon dekoratif atau badge prioritas; metadata yang tersedia
              tetap berada di bawah judul task.
              Halaman detail briefing memakai shell max-w-7xl yang sama untuk
              header lokal dan isi agar garis kirinya sejajar. Detail dibaca sebagai
              satu document Card `gap-0 p-0`, dengan inset horizontal 24px pada
              layar kecil dan 32px pada desktop serta divider penuh antarbagian.
              Divider antar-section memakai garis putus-putus dengan
              `border-t border-dashed border-border/70`; divider pada baris
              tindak lanjut dan risiko terkait mengikuti treatment yang sama
              melalui `divide-y divide-dashed divide-border/70`.
              Section pertama memakai heading `Properti` dan definition list
              responsif satu, dua, lalu tiga kolom tanpa card lokal atau ikon
              dekoratif. Enam propertinya memuat judul notulen, pembuat beserta
              waktu pembuatan, tanggal rapat, check-in berikutnya, jumlah dan
              identitas peserta, serta ID notulen. Label memakai 12px medium
              uppercase dengan tracking 0.08em dan warna muted; nilai memakai
              14px medium. Gap heading dan baris adalah 32px, sedangkan gap kolom
              48px. Ini adalah konteks inline, bukan card metadata terpisah.
              Ringkasan, agenda, poin kunci, tindak lanjut, isu
              terbuka, keputusan, dan risiko terkait mengalir sebagai section
              editorial di surface yang sama. Tindak lanjut memakai date band
              netral dan baris task datar tanpa ikon atau badge prioritas. Risiko
              terkait menempatkan kode di atas judul dalam tautan full-width dengan
              padding horizontal dan vertical yang seimbang. Identitas peserta harus tetap tersedia sebagai konten yang
              bisa dibaca dan diakses keyboard/touch, bukan hanya tooltip.
              Loading memakai status live yang menghormati reduced motion; error
              pemuatan dipisahkan dari not-found/access-denied dan selalu menyediakan
              aksi pemulihan. Terminologi user-facing pada route detail mengikuti
              “Notulen” yang dipakai collection dan navigasi. Detail notulen
              menempatkan Ekspor Notulen dan, bila diizinkan, Hapus Notulen di
              dalam satu trigger `ActionIconButton` berbasis `DropdownMenu`
              agar title row tetap ringkas dan tidak menyusut.
              Dialog simpan briefing dan tinjau perubahan memakai shell Dialog
              canonical tanpa close icon, header dengan `pb-3` untuk bottom breathing room,
              footer rhythm standar, `CollectionDialogCancel`,
              dan `AccentButton`. Dialog simpan tidak memakai description tambahan,
              search field, atau daftar risiko yang selalu terbuka. Gunakan satu
              trigger `Pilih risiko`; popover selector-nya baru menampilkan
              `CollectionSearchField`, opsi risiko, dan checkmark multi-select saat
              trigger dibuka. Dialog destruktif mempertahankan konteks melalui
              metadata datar tanpa nested surface, memakai
              `CollectionDialogCancel` dan `DestructiveButton` tanpa ikon
              dekoratif, serta menampilkan pesan retry inline ketika request
              gagal. Dialog tetap terbuka dan hanya menutup setelah penghapusan
              berhasil.
            </p>
          </section>

          <section className="space-y-4">
            <DesignSystemSectionLabel>Contextual Document Intelligence Workspaces</DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Document Intelligence dipakai sebagai workflow kontekstual di
              Risiko dan Penanganan, bukan sebagai modul sidebar mandiri.
              Risiko membuka ekstraksi SOP dari menu Import Risiko, sedangkan
              Penanganan menyediakan tombol Import pada toolbar koleksi.
              Keduanya memakai pola upload-first: kanvas terpusat
              memberi prioritas visual pada drop zone besar bergaris putus-putus,
              dengan glyph dokumen yang tenang sebagai satu-satunya aksen setup.
              Drop zone hanya memiliki satu target keyboard; input file yang
              dipicu secara programatis berada di luar semantik tombol dan urutan
              Tab. Setelah dipilih, satu baris file ringkas menampilkan identitas,
              box shadow yang sama dengan card, validasi, aksi hapus, dan aksi
              utama Mulai analisis. Upload hanya menerima PDF atau XLSX lalu
              mengirim file langsung ke backend Document Intelligence API dengan
              sesi autentikasi dan konteks organisasi; tidak ada mock processing
              atau sinkronisasi hasil lokal sebagai fallback. Mode analisis
              ditentukan oleh entry point dan tidak ditampilkan sebagai selector
              di dalam workspace. Periode diproses otomatis tanpa field. Route
              menekan global page header dan
              tidak menampilkan CollectionPageHeader lokal; heading setup
              menjadi konteks langsung workspace dan memakai skala 16px
              (text-base) dengan jarak 8px (`space-y-2`) ke subtitle,
              sedangkan heading drop zone tetap compact 14px.
              Satu layout upload-first dipakai untuk setup, proses aktif, dan
              hasil. Saat proses aktif, status dan progress ditampilkan ringkas
              di bawah upload; setelah selesai, file dibersihkan dan hanya panel
              `Temuan untuk ditinjau` yang muncul di bawah drop zone. Status
              progres memakai semantik progressbar dan live announcement yang
              ringkas; indikatornya memakai transform scaleX dari sisi kiri
              selama 200ms, bukan perubahan width. Panel hasil masuk dengan
              fade dan full transform dari offset vertikal 10px selama 200ms;
              reduced-motion mempertahankan fade 120ms tanpa perpindahan.
              Saat state terminal muncul, halaman berpindah langsung ke panel
              temuan agar entrance panel menjadi satu-satunya gerak spasial.
              Temuan ditampilkan sebagai daftar
              datar tanpa grouping prioritas, ringkasan tingkat, atau wrapper
              card tambahan; setiap card temuan memakai surface `bg-card` yang
              sama dengan card lain, sementara metadata ringkas hanya
              menyisakan `Keyakinan` dan ringkasan temuan mentok ke kiri. Aksi
              Tombol outline `Mulai proses baru` memakai `border-0 border-shadow`
              berbasis `--shadow-custom` agar memiliki perimeter dan lift yang
              sama dengan surface card tanpa garis border tambahan. `Buat draf risiko` tetap memakai tombol outline di
              dalam footer card dengan divider atas dan surface `table-header`
              (`#fcfcfc`) seperti modal agar tetap terlihat sebagai aksi
              sekunder yang jelas. Temuan SOP memakai
              `Buat draf risiko` untuk membuka modal ringkas di tempat yang
              sama, dengan `Judul`, `Deskripsi`, dan `Kategori` yang sudah
              terisi. Pengguna dapat menyimpan draft langsung dari modal, lalu
              aksinya berubah menjadi `Draf dibuat`. Temuan laporan mitigasi memakai
              `Gunakan untuk laporan`, membuka modal `Lapor Progress Penanganan`
              di tempat yang sama, lalu berubah menjadi `Sudah dilaporkan` setelah
              task dikirim dengan status `done`.
              Disclosure sumber memakai divider dashed, label `Sumber` yang
              muted, serta label `Lihat` berwarna foreground dengan chevron di
              sisi kanan. Detail sumber memakai fade 150ms dengan jarak 12px
              (`mt-3`) dari trigger ke detail, lalu jarak 4px (`space-y-1`)
              antar baris nama file, kutipan, dan tindakan; subtitle hasil tidak
              menambahkan line-height lokal, sementara card
              memakai continuity transition grow/shrink dari 0fr ke 1fr selama
              200ms agar perubahan tinggi tidak snap. Baris
              file memakai tween transform dan opacity 180ms; reduced-motion
              tetap memperoleh fade 120ms. Card status proses masuk sekali dari
              offset bawah 8px melalui CSS starting-style selama 180ms, sedangkan
              reduced-motion hanya memakai fade 120ms. Label `Mulai analisis`
              dan `Menyiapkan...` berbagi lebar yang stabil lalu cross-fade selama
              120ms. Alert koneksi dan validasi file masuk dan keluar dengan
              opacity selama 150ms, atau 120ms pada reduced-motion. Temuan tidak
              memakai stagger dan perubahan teks tahap proses tetap instan.
              Badge severity memakai primitive Badge borderless dari Design System
              dengan semantic tone.
              Detail sumber menampilkan nama dokumen dan halaman tanpa prefix
              `Sumber:`, sementara kutipan tampil sebagai teks italic tanpa
              border kiri.
              Seluruh label operasional memakai bahasa Indonesia, ukuran metadata
              minimal 12px, warna status memakai token semantik. Kegagalan dari
              backend ditampilkan pada panel hasil terminal dan pembatalan proses
              menghentikan request API yang sedang berjalan. Ringkasan terminal
              disimpan hanya selama sesi tab agar pengguna dapat kembali dari
              form draf risiko atau melanjutkan batch laporan tanpa membentuk
              riwayat dokumen permanen.
            </p>
          </section>

          <section className="space-y-3">
            <DesignSystemSectionLabel>
              Working Paper Creation Form
            </DesignSystemSectionLabel>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Form pembuatan Kertas Kerja memakai CollectionPageHeader dengan
              badge siklus asesmen dan CTA utama sejajar di sisi kanan header.
              Gunakan shell lebar
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
              berada dalam konteks collection yang sama. Tabel progress memiliki
              kolom `Aksi` di sisi trailing dengan tombol outline icon-only `Download
              kertas kerja` per baris; tombol mengunduh kertas kerja terbaru yang
              cocok dengan organisasi dan periode tersebut, menampilkan spinner
              selama proses, dan disabled jika dokumen sumber tidak tersedia.
              Boundary roster
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
              Detail Kertas Kerja memakai shell `max-w-7xl` dengan layout
              dua kolom yang menjaga tabel monitoring sebagai surface utama
              dengan lebar penuh pada kolom konten. Ringkasan dokumen, Progres
              Pemantauan, dan Histori Tanda Tangan terkumpul di panel kanan;
              pada layar kecil kedua kolom
              menumpuk secara natural. Kartu Ringkasan dokumen menyalin grammar
              panel Properti form Risiko: satu Card tanpa header terpisah,
              `CardContent` 20px (`px-5 py-5`), dan section di dalamnya memakai
              `space-y-4` dengan divider dashed `pt-5`. Setiap heading section
              12px semibold uppercase dengan tracking `0.6px`. Ringkasan memakai
              `dl` berjarak 12px (`space-y-3`) dengan baris horizontal
              `items-center justify-between gap-4`, label 13px muted, dan nilai
              14px foreground rata kanan tanpa ikon. Status memakai compact
              Badge semantik. Progres dan Histori Tanda Tangan mengikuti heading,
              inset, dan divider section yang sama dalam surface tersebut.
              Judul header detail menggunakan kode kertas kerja sebagai konteks
              utama. Kartu Progres Pemantauan merangkum jumlah risiko Selesai
              Dipantau dalam compact Badge bertone semantik, dengan persentase
              dan progress bar tetap terlihat.
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
              operasional lain; action tetap inline pada header lokal agar CTA sejajar
              dengan title serta subtitle. Aksi utama memakai `AccentButton`,
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
              dengan teks muted-foreground, bukan fill status semantik. Ledger
              utama memakai layout fluid `w-full table-fixed` tanpa `min-width`
              route-local agar tidak memaksa scroll horizontal, dengan kolom
              `Kode`, `Risiko`, `Periode`, `Status`, `Perubahan Skor`,
              `Tanggal Dibuat`, `Progres Penanganan`, dan `Update Terakhir`.
              Status memakai badge semantik `Berlangsung` atau `Final`.
              Siklus dipisahkan menjadi kolom Periode, tanggal dibuat memakai `createdAt` dengan
              fallback `startedAt`, progres ditampilkan sebagai persentase
              ringkas, dan Update Terakhir memakai `updatedAt` dengan fallback
              `startedAt`. Konten panjang dikunci di dalam proporsi kolom dan
              dipotong aman agar tabel tetap fit. Tabel memakai search kode/risiko, filter,
              pagination, dan selector siklus yang sama dengan Daftar Risiko;
              search, selector, dan filter memakai tinggi toolbar
              compact 36px (`h-9`) yang sama, dan opsi selector siklus/status juga
              memakai `h-9` agar tinggi item mengikuti field search. Badge siklus dan penanda konteks
              kosong seperti “Belum Ada Data” memakai context badge compact dengan
              surface low-contrast, bukan badge status. Ledger utama tidak
              mengulang kolom Organisasi dan Aksi karena scope organisasi dikendalikan
              toolbar dan baris serta judul risiko sudah menjadi jalur navigasi baca.
              Skor awal ditampilkan muted dan tercoret sebagai referensi historis,
              sedangkan skor hasil pemantauan memakai badge level risiko dengan teks
              tanpa ikon.
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
              header CollectionPageHeader dengan shell max-w-7xl, lalu
              menyusun skor observasi melalui trigger heatmap 5×5 yang sama
              dengan form Risiko, lalu progres mitigasi, revisi profil, alasan
              perubahan, dan simpulan dalam satu urutan kerja. Form memakai
              surface rounded-lg dan sidebar sticky 360px agar konsisten
              dengan halaman risk register. Header draft memakai label ringkas
              “Pemantauan”, sedangkan hasil final memakai “Hasil Pemantauan Risiko”
              tanpa banner sukses tambahan di bawah header.
              Body card memakai `px-5 py-5 text-sm` seperti panel kanan form
              Risiko; judul section memakai 12px (`text-xs`) dengan tracking
              0.6px, summary menggunakan label muted 13px dan value foreground
              14px. Perubahan skor cukup ditampilkan sebagai transisi skor lama
              ke skor baru tanpa angka delta yang repetitif.
              Baseline tersedia melalui satu tombol ellipsis outline di action
              kanan atas dengan dropdown yang mengikuti pola detail kertas kerja.
              Menu berisi `Detail Risiko` dan, selama masih editable, `Hapus draf`.
              Detail membuka shared Vaul drawer dari kanan tanpa meninggalkan
              workspace. Drawer memakai inset viewport 8px, lebar 310px dengan
              batas aman mobile, overlay `bg-black/40` di atas topbar dan shell
              chrome (`z-[60]`), serta inner surface card rounded 16px di atas
              scrim (`z-[70]`) dengan modal elevation. Closed transform memakai
              `calc(100% + 8px)` agar panel keluar penuh melewati inset. Title,
              description, dan close action tetap aksesibel. Tombol close memakai
              komposisi canonical modal: `Button` ghost `size=&quot;icon-sm&quot;` dengan
              posisi `top-2 right-2`, `rounded-full`, tanpa shadow, dan hover
              `bg-muted`. Isi memakai heading
              12px `PROPERTI SUMBER`, lalu baris
              Kode, Kategori, Versi, Probabilitas, Dampak, Skor, dan Status dengan
              grammar panel kanan: label muted 13px, value 14px, identifier dan
              angka monospaced, serta Badge status semantik. Hapus draf tetap
              diteruskan ke AlertDialog destruktif. Floating pill bawah dan ruang
              padding khususnya tidak digunakan lagi; reduced motion mematikan
              animasi overlay dan drawer. Tabel
              mitigasi di dalam form bersifat spacing-only tanpa nested
              elevation. Panel simpulan memakai shell Card yang sama dengan
              panel kanan form Risiko (rounded-lg, padding 20px, `CardContent`
              body `text-sm`/14px, title section 12px, dan jarak antar-panel
              24px). Isi simpulan
              menggunakan list berlabel dengan separator dashed yang lembut
              (`border-border/50`) untuk skor, evaluasi, dan efektivitas.
              Semuanya tetap berada di dalam
              shell utama tanpa nested elevation; hasil evaluasi dapat membungkus
              secara natural di sidebar sempit tanpa `whitespace-nowrap`.
              Ringkasan pelaksanaan
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
              akan dibuat, dan tindakan tidak dapat dibatalkan. Label metadata
              ringkasan `Periode`, `Skor`, dan `Versi hasil` tampil dalam presentasi
              uppercase yang compact. Warning menjelaskan
              bahwa mitigasi yang belum dilaporkan menjadi “Tidak dilaporkan” dan
            memakai surface borderless <code>bg-state-surface text-state-foreground</code> dengan radius 12px;
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
            Label KPI overview mengikuti istilah metrik: Total, Prioritas,
            Mitigasi belum terlapor, dan Eksposur. `Mitigasi belum terlapor`
            memakai count backend `unreportedMitigations`, yaitu task mitigasi
            tanpa laporan valid, bukan count overdue. Judul dashboard KPI memakai
            Inter 14px sentence case dengan token `secondary-foreground` dan
            weight medium. Angka KPI memakai Inter 38px dengan weight semibold,
            lalu descriptor unit 12px memakai `muted-foreground` bila relevan.
            Header dapat menampilkan icon `TrendingUp` atau `TrendingDown`
            berukuran 20px dengan warna `success` untuk uptrend dan
            `destructive` untuk downtrend sebagai cue arah yang eksplisit;
            icon tidak menggantikan delta numerik.
            Dashboard KPI card dan collection KPI card tetap memakai surface
            yang sama, tetapi collection KPI mempertahankan treatment labelnya
            sendiri; dashboard KPI card tidak memuat chart maupun indikator
            perbandingan tanpa payload per-metrik. Nilai `—` tetap dipakai bila
            data tidak tersedia. Judul panel/chart tetap memakai treatment card
            title 14px. Dashboard KPI card memakai baseline tinggi 148px dengan
            padding 20px dan corner smoothing 60% pada radius visual 10px
            melalui shared path utility; wrapper luar tetap memegang shadow agar
            perimeter tidak terpotong. Card menempatkan angka di bawah judul
            dengan jarak 20px. Chart produksi
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
            tanpa strip KPI tambahan di atas chart, lalu tiga pasangan 50/50:
            Paparan Risiko dengan Tingkat Risiko
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
            `table-header` (`#fcfcfc`). Pada varian modal `plain`, footer memakai
            `-mx-5 -mb-5 px-5` agar tepat memenuhi surface modal `p-5`; varian
            card tetap memakai inset full-bleed `-mx-4 -mb-4`.
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
            Header KPI memakai inset 16px dan jarak vertikal 24px agar judul
            dan nilai card tetap terkelompok tanpa terasa rapat.
            List Risiko yang Perlu Perhatian memakai ledger terintegrasi tanpa
            checkbox: header memakai padding horizontal 24px dan padding vertikal
            6px (`px-6 py-1.5`) serta label 13px (`text-[13px]`) medium
            `text-secondary-foreground` pada surface putih `bg-card`, lalu kolom
            Kode, Probabilitas, Dampak, Kategori, dan Skor. Kolom Judul
            dihilangkan dari ringkasan; kode, probabilitas, dan dampak memakai
            foreground, kategori memakai muted foreground, skor tetap berupa
            badge semantik, dan
            divider antarbaris memakai hairline netral tanpa ikon panah. Baris memakai
            padding `px-6 py-4` dan
            `font-normal` untuk kode, kategori, skor, dan judul pada 14px agar seluruh daftar memiliki
            bobot visual yang sama. Header menggunakan kapitalisasi normal dan
            badge skor mengikuti primitive `Badge` ukuran `micro`, font mono
            tabular, dan warna level risiko semantik.
            Distribusi kolom desktop memakai grid `5fr 7fr 7fr 10fr 5fr`
            untuk Kode, Probabilitas, Dampak, Kategori, dan Skor; rasio dihitung
            dari ruang yang tersedia setelah gap sehingga ledger tetap `w-full`
            tanpa overflow. Pada layar sempit, Kategori disembunyikan dan grid
            memakai empat kolom setara untuk Kode, Probabilitas, Dampak, dan Skor.
            Narrative Overview mengikuti satu urutan baca: condition, change,
            attention, lalu concentrated risk. KPI tetap tenang, tren
            empat kuartal memiliki bidang visual terlebar, risiko prioritas
            berdampingan dengan heatmap saat ini. Perbandingan multi-fase menjadi
            analisis progresif dalam modal yang dibuka lewat kontrol expand kecil
            di tengah bawah card heatmap saat ini. Kedua card pada baris ini
            berbagi baseline bawah pada layar lebar. Tabel selalu menyediakan
            lima slot setinggi 56px: baris yang berisi data tidak meregang,
            sedangkan slot sisanya tetap ditandai divider halus. Heatmap
            mempertahankan ukuran besar yang seimbang dengan tinggi lima baris.
            Pada layar sempit, tinggi card mengikuti kontennya masing-masing.
            Kontrol expand melintasi perimeter card heatmap tanpa
            menambah tingginya. Isi heatmap memakai inset atas yang
            cukup setelah header agar matriks tidak menempel pada judul. Dashboard tidak memakai
            global page header maupun helper subtitle di dalam card. Heatmap ringkas mengandalkan
            matriks dan legenda level tanpa caption total yang berulang; tooltip
            memisahkan angka dan label seri dengan jarak yang konsisten. Konten langsung
            dimulai dari KPI karena konteks rute sudah tersedia pada topbar. Dashboard
            seperti halaman lain mengisi seluruh lebar area konten tanpa batas max-width tambahan;
            hanya padding shell 16px pada mobile dan 24px pada desktop yang tersisa. Pada
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
            yang sama: trigger penuh dengan chevron bulat 36px memakai perimeter
            border button outline dan shadow tombol yang halus, dengan glyph
            20px dan stroke 2px, title 14px, optional description dan action kontekstual,
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
            Tabel daftar penanganan operasional memakai urutan
            `Rencana Penanganan | Risiko | PIC | Periode | Deadline | Status | Aksi`
            dengan proporsi desktop 26% / 17% / 13% / 10% / 13% / 9% / 12%.
            Kolom Risiko menampilkan kode monospaced dan judul singkat; Periode
            memakai label ringkas seperti `Triwulan III 2026`; Deadline
            menampilkan tanggal `dd MMM yyyy` tanpa baris status relatif. Output,
            bukti, dan catatan
            tetap berada di detail laporan, bukan kolom utama. PIC memakai
            `text-muted-foreground`, judul rencana memakai `text-foreground`,
            dan badge tetap mempertahankan warna semantic dari `tone`. Semua
            header tabel memakai `text-[13px]` (13px), `font-medium` (500),
            `capitalize`, `text-secondary-foreground`, tinggi 44px, dan `py-3 px-5`.
            Header tidak memakai letter-spacing tambahan agar teks tidak tampak renggang.
            Baris data memakai tinggi dasar 68px dan inset `py-3 px-5`.
            `TableBody` menerapkan divider internal `border-b border-border/50`
            pada cell baris data, sementara divider pada baris terakhir dihilangkan.
            Kontrol header sortable mengikuti treatment `capitalize` yang sama,
            tidak memakai inset horizontal tambahan agar sejajar dengan data, dan
            tidak boleh memakai `uppercase`; divider header dan footer memakai
            `border-border/50`. Footer pagination hanya muncul saat total item
            lebih dari 10; tabel dengan 10 item atau kurang tidak menampilkan
            footer tersebut. Kontrol header sortable tidak memakai tinggi tetap
            agar mengikuti tinggi header tabel yang sama. Gunakan
            Geometri tersebut berlaku untuk seluruh tabel aplikasi melalui
            primitive `Table`, `CollectionTableHeader`, `CollectionTableHead`, dan
            `CollectionTableCard`; varian compact hanya boleh menurunkan tinggi
            header menjadi 40px pada tabel form atau picker yang benar-benar padat.
            Gunakan
            <code className="mx-1 text-xs">CollectionTableCard</code> untuk
            tabel collection yang memiliki shell sendiri, atau
            <code className="mx-1 text-xs">CollectionTableSurface</code> untuk
            tabel yang ditanam di dalam Card atau disclosure tanpa border kedua;
            keduanya menjaga overflow tabel tetap aman.
            Empty state pada tabel dirender sebagai satu
            <code className="mx-1 text-xs">TableRow</code> dengan
            <code className="mx-1 text-xs">TableCell colSpan</code> di dalam
            <code className="mx-1 text-xs">TableBody</code>, lalu memakai
            alignment tengah agar tetap terbaca sebagai bagian dari ledger;
            jangan menaruhnya sebagai sibling tabel di luar shell.
            Judul risiko pada Register Risiko adalah link detail dengan
            `text-sm font-medium` agar tetap menjadi titik fokus utama baris;
            kode monospaced 11px ditempatkan sebagai metadata di bawah judul.
            primitive tabel mempertahankan bobot normal pada `td` tanpa
            memaksa seluruh turunannya, sehingga judul dapat memilih bobotnya.
            Judul utama pada collection table lain mengikuti treatment medium
            yang sama.
            Koleksi Piagam Manris mengikuti grammar yang sama: header compact
            40px, tabel enam kolom dengan kolom Aksi sticky di trailing edge,
            status melalui <code className="mx-1 text-xs">CollectionStatusBadge</code>,
            dan state loading, error, serta empty melalui primitive collection.
            Judul piagam menjadi satu-satunya link ke detail; menu Aksi tidak
            mengulang opsi `Buka` dan hanya menampung aksi administratif seperti
            arsip atau pulihkan.
            Sel Aksi memakai surface <code className="mx-1 text-xs">bg-card</code>
            dengan padding data canonical `px-5 py-3`; hover row diterapkan ke seluruh
            sel melalui selector child `td` agar tetap konsisten dengan tabel Risiko.
            Untuk tabel Penanganan, sel ini memakai trigger ellipsis seperti tabel
            Risiko; menu hanya menempatkan aksi kontekstual `Lapor progress`,
            sementara status yang belum waktunya tetap tampil sebagai option
            nonaktif dengan alasan yang jelas. Detail tetap dibuka melalui judul
            rencana, bukan dari menu opsi.
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Field scope multi-select menjaga trigger tetap satu baris: tampilkan
            nama unit ketika hanya satu unit dipilih, atau ringkasan jumlah unit
            ketika pilihannya lebih banyak. Detail pilihan dan pencarian tetap
            tersedia di dalam popover tanpa menumpuk chip pada field.
          </p>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Filter popover terbuka di bawah trigger dan mulai dari sisi leading
            (`side=&quot;bottom&quot;`, `align=&quot;start&quot;`) agar panel melebar ke kanan
            pada toolbar.
          </p>
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
            Semua subtitle atau deskripsi pada Dialog, AlertDialog, dan Sheet
            memakai `text-secondary-foreground` sebagai warna teks pendukung,
            termasuk subtitle custom yang dirender langsung di header modal.
            Konfirmasi destructive seperti hapus draft memakai metadata polos
            tanpa background/ring bertingkat dan komponen `DestructiveButton`
            dengan action merah solid, teks putih, serta label ringkas `Hapus`
            tanpa icon.
            Judul risiko pada dialog arsip memakai `text-sm font-medium
            text-secondary-foreground` sebagai konteks pendukung; kode risiko
            tetap memakai `text-muted-foreground`.
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
            Dialog Eskalasi Risiko mengikuti shell dan footer yang sama;
            flow create hanya menyediakan pilihan Bottom-up, sedangkan mode
            review tetap dapat membaca record Top-down lama. Mode review
            memakai satu surface metadata tenang dengan badge context/status
            semantik, sementara aksi Tolak memakai `DestructiveButton`. Nilai
            sumber dan tujuan membungkus di dalam kolomnya dan tidak menambah
            close icon kedua.
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Indikator menampilkan segmen status dengan count ringkas secara
            default. Gunakan `showCount={false}` ketika segmen sudah cukup
            sebagai konteks visual dan angka hanya menjadi repetisi; label
            aksesibel tetap menyampaikan progres lengkap.
          </p>
          <MonitoringTransactionProgressExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Dropdown Menu</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Dropdown memakai panel putih solid dengan radius 8px dan inset
            4px. Setiap opsi memakai radius 8px dan padding kiri 8px, dengan
            padding kanan 40px untuk opsi yang memiliki checkmark; baris opsi
            setinggi 32px (`h-8`).
            State hover atau fokus memakai surface
            abu-abu lembut, sedangkan opsi terpilih ditandai centang di sisi
            kanan tanpa menambahkan badge atau warna dekoratif.
            `RemoteUserPicker` memakai lebar maksimum 24rem dengan margin aman
            terhadap viewport, search field compact 36px (`h-9`) dengan jarak 4px
            sebelum opsi. Opsi user menampilkan ikon person kecil berisi serta nama
            satu baris dengan font normal tanpa avatar atau jabatan.
          </p>
          <dl className="grid max-w-3xl overflow-hidden rounded-lg bg-border/70 text-sm sm:grid-cols-2">
            {[
              ["Trigger", "h-9 / 36px · min-width 176px · px-16px"],
              ["Panel katalog", "w-64 / 256px · min-width 128px"],
              ["Panel inset", "4px di seluruh sisi (p-1)"],
              ["Panel radius", "8px"],
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
          <DesignSystemSectionLabel>Warning Card</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Warning card memakai surface `#fbf6e8` dengan font hitam untuk
            pesan yang membutuhkan perhatian. Gunakan `WarningCard` untuk
            peringatan persisten; status singkat tetap memakai Badge semantik.
          </p>
          <WarningCardExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>AI Suggestion Surfaces</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tombol saran AI pada form risiko mengecilkan ikon, menumbuhkan spinner
            biasa yang tersambung di slot ikon, lalu mengganti teks dengan slide
            horizontal dari kiri ke kanan dan sedikit overshoot. Lebar tombol
            tetap stabil. Request berjalan bersamaan; modal muncul setelah data
            siap dan transisi 540ms selesai. Reduced motion mengganti state langsung
            tanpa delay; kegagalan menampilkan toast sehingga pengguna dapat mencoba lagi.
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
          <p className="max-w-3xl text-sm text-muted-foreground">
            Riwayat versi memakai vertical timeline yang sama dengan panel kanan
            form risiko: marker aktif, connector antarversi, row flat tanpa card
            bertingkat, dan metadata muted yang tetap dapat dipilih.
          </p>
          <VersionTimelineExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Empty / Disabled State</DesignSystemSectionLabel>
          <InlineEmptyStateExample message="Simpan draft untuk mengakses navigasi" />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Form Page Container</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Form Piagam Manris memakai FormPage satu kolom yang dipusatkan
            dengan lebar maksimum 672px
            tanpa card wrapper. Label Judul Piagam tetap terlihat, sementara
            textarea judul tampil seperti teks dokumen tanpa chrome field,
            membungkus teks panjang, dan tumbuh mengikuti isi;
            paragraf dan nilai naratif memakai `text-secondary-foreground`,
            sedangkan placeholder kosong tetap muted.
            metadata organisasi, level UPR, dan tahun tidak diulang di body form.
            Ruang lingkup, konteks internal, dan konteks eksternal memakai
            DocumentFormSection yang selalu terbuka tanpa divider atau subtitle
            tambahan, dengan label section `text-muted-foreground` dan field
            ditata vertikal di bawahnya.
            Dasar hukum, stakeholder eksternal, dan struktur UPR memakai
            DocumentListSection dengan label section `text-muted-foreground` di
            atas surface list, tombol +
            di ujung kanan label untuk membuka modal tambah/edit, dan menu ellipsis
            untuk tindakan item. Surface list tidak mengulang title atau header card.
            List memakai inset horizontal 16px dan vertikal 6px, tanpa fill hover dekoratif;
            Struktur UPR memakai picker pengguna agar nama dan jabatan terisi otomatis; jarak
            field pada quick-create Piagam memakai `flex flex-col gap-2` (8px)
            antara label, input, dan pesan validasi; jarak
            visual antarkelompok 12px dari satu parent stack, dengan override
            24px pada batas judul–Ruang Lingkup, textarea–list, list–section
            berikutnya, dan transisi konteks internal–eksternal; label ke field tetap
            12px. Section naratif tidak menambahkan padding vertikal sendiri
            atau label sr-only sebagai sibling field agar gap tersebut tidak
            bertumpuk; heading section menjadi accessible label melalui
            aria-labelledby. Pada route ini, FormPage memakai space-y-0 karena
            wrapper FormHeader sudah menyediakan gap bawah total 24px; document stack hanya
            memiliki padding bawah sehingga jarak header tidak terduplikasi.
            Header form lokal menampilkan title/subtitle halaman dan hanya
            mempertahankan badge status; badge Versi tidak ditampilkan.
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

        <section className="space-y-4">
          <DesignSystemSectionLabel>Risk Event Ledger / Progressive Disclosure</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Form Kejadian Risiko memakai bottom Drawer berbasis Vaul dengan shell
            inset 8px, tinggi dinamis mengikuti ukuran form aktif (dengan batas
            max-h viewport), max-width yang mengikuti form (max-w-3xl), handle drag,
            dan footer sticky. Grow/shrink tinggi tray memakai layout animation
            interruptible selama 220ms dengan ease-out; reduced motion menonaktifkan
            transisi posisi. Pada mobile tray menyusut mengikuti viewport. Flow dibagi menjadi lima
            langkah: Fakta utama, Dampak &amp; penanganan, Risiko terkait, Detail tambahan,
            lalu Periksa. Setiap langkah dirender sebagai konten terpisah di dalam satu
            shell Drawer yang stabil; saat berpindah langkah, shell tetap dan hanya
            tinggi kontennya yang grow/shrink tanpa menghapus isian form.
            Counter dan progress bar di header tidak ditampilkan; progres
            hanya memakai lima lingkaran di footer, satu active dan sisanya
            inactive, dengan label screen-reader Langkah n dari 5. Header langsung
            memakai DrawerTitle dan DrawerDescription tanpa eyebrow tambahan, dengan
            deskripsi text-secondary-foreground. Tombol
            Lanjut hanya aktif ketika field wajib pada langkah aktif valid dan
            pengguna dapat kembali tanpa kehilangan isian. Setiap pasangan label
            dan field menggunakan wrapper flex flex-col gap-2 untuk jarak 8px
            yang konsisten; fieldset memakai legend block dengan mb-2 agar jarak
            label ke checkbox group tetap 8px. Risiko terkait dan detail tambahan
            menjadi dua langkah Drawer berurutan di dalam shell yang sama. Langkah Periksa memakai satu summary
            card tanpa border atau surface muted tambahan; CTA penyimpanan menggunakan label
            Simpan dan langsung menyimpan record immutable setelah ringkasan ditinjau. Halaman detail bersifat read-only; pengguna hanya
            dapat menambahkan hubungan risiko baru melalui konfirmasi permanen.
            Section Informasi utama dan Detail tambahan memakai vertical spacing
            tanpa divider internal.
            Label metadata pada detail memakai 13px (`text-[13px]`) dengan
            `text-muted-foreground`, sedangkan nilai detail tetap 14px.
            Header lokal menjadi pemilik judul/subtitle halaman bila konteks tersebut
            diperlukan; aksi detail tetap inline tanpa portal global dan tanpa header lokal kedua.
            Daftar LED mengikuti pola tabel Penanganan dengan CollectionToolbar
            dan CollectionTableCard, sementara warna hanya dipakai pada badge
            tingkat kejadian. Urutan kolom daftar adalah Kode, Kejadian, Tingkat,
            Risiko terkait, Dicatat oleh, lalu Waktu sebagai kolom trailing
            terpisah. Empty state tanpa data dirender sebagai row penuh di dalam
            tabel, dengan konten ter-align center, dan menjelaskan langkah berikutnya;
            hasil pencarian menyebutkan kata kunci yang dicari dan menyediakan
            aksi Hapus pencarian. Error pemuatan memakai pesan yang dapat
            dipahami pengguna dan aksi Coba lagi tanpa menampilkan detail teknis
            backend.
          </p>
        </section>
      </PageStack>
    </TooltipProvider>
  );
}
