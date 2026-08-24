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
  PageHeaderExample,
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
        <PageHeaderExample />

        <section className="space-y-4">
          <DesignSystemSectionLabel>Color Palette</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Root dokumen tetap transparan. Gunakan token background pada shell,
            halaman, dan surface yang memang memiliki konteks; hover hanya
            dimiliki oleh kontrol interaktifnya.
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
            State aktif memakai surface netral, bobot teks semibold, dan icon
            gelap seperti font; state inactive memakai icon abu-abu tanpa garis
            dekoratif di sisi kiri. Setiap baris menu memiliki jarak vertikal
            4px agar surface hover tidak saling menempel. Hover netral di seluruh
            aplikasi mengikuti surface sidebar yang sama; hover semantik tetap
            mempertahankan warna statusnya. Batas footer memakai fade blur halus
            sebelum area Bantuan dan akun.
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
          <FieldsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Button Variants</DesignSystemSectionLabel>
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
            jangan membuat pill lokal dengan span atau div.
          </p>
          <BadgeSystemExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Card Patterns</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Detail metadata pada card memakai pola yang sama dengan modal detail
            laporan: label 14px muted, value 14px medium dengan ikon, grid dua
            kolom, dan tanpa nested card surface.
          </p>
          <CardPatternsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>
            Page & Collection / Intelligence Layout
          </DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Register, form risiko, Meeting, dan Document Intelligence memakai
            shell halaman yang sama: header borderless dengan judul 30px,
            deskripsi 14px, aksi di sisi kanan, toolbar di luar card data,
            surface netral, dan state loading/empty yang konsisten. Header form
            mengikuti lebar card form agar kedua sisi tetap sejajar, dengan
            action kembali ditempatkan di atas judul dan action utama sejajar
            dengan judul pada form/detail. Field tunggal di dalam group grid
            dua kolom span penuh agar control tidak berhenti di setengah card.
            Form panjang dengan panel konteks memakai grid lebar: form tetap di
            kolom utama, panel 360px sticky mulai breakpoint xl, lalu menumpuk
            di bawah form pada viewport yang lebih sempit. Panel konteks tidak
            memakai tab untuk konten paralel; gunakan section terpisah dengan
            heading uppercase kecil berwarna muted 70%, divider dashed/soft, dan timeline atau
            list untuk histori versi agar progres, log, dan riwayat tetap
            terlihat serta mudah dipindai. Log memakai compact activity feed:
            avatar inisial, aktivitas inti, dan waktu relatif tanpa nested card;
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
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Report Primitives</DesignSystemSectionLabel>
          <ReportPrimitivesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Overview Dashboard</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Judul KPI memakai Plus Jakarta Sans 10px dengan token muted
            foreground dark gray, weight medium, uppercase, dan letter-spacing
            0.5px. Judul
            panel/chart tetap memakai treatment card title 14px.
            KPI card memakai baseline tinggi 112px dengan header lebih compact;
            card dapat bertambah tinggi saat judul panjang perlu wrap.
            JetBrains Mono tetap digunakan untuk angka dan nilai teknis.
          </p>
          <OverviewDashboardExample />
          <RiskSummaryStripExample />
          <OverviewPanelStatesExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Accordion (Risk Form Sections)</DesignSystemSectionLabel>
          <AccordionExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Tabs</DesignSystemSectionLabel>
          <TabsExample />
        </section>

        <section className="space-y-4">
          <DesignSystemSectionLabel>Table</DesignSystemSectionLabel>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tabel penanganan memakai proporsi kolom 34% rencana, 10% kode
            risiko, 18% PIC, 14% deadline, 12% status, dan 12% aksi agar
            konten utama tetap dominan tanpa ruang kosong berlebih.
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
            bukan SelectItem collection.
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
            Cell aktif memakai satu border foreground 2px tanpa ring offset kedua.
            User memilih kombinasi probabilitas × dampak melalui
            cell dengan angka dan label yang jelas, melihat tiga kartu ringkas
            untuk probabilitas, dampak, dan hasil. Label level tetap terlihat
            di bawah angka agar konteks tidak bergantung pada tooltip; judul
            sumbu tambahan dihilangkan supaya grid lebih bersih. Ringkasan di
            bawah heatmap tampil borderless dengan angka yang lebih dominan.
            Form register tidak menumpuk summary strip kedua setelah picker.
            User lalu mengonfirmasi melalui Terapkan Skor. Detail evaluasi yang
            dihitung otomatis tampil sebagai label/value borderless, sementara
            field hanya dipakai untuk pilihan penanganan yang bisa diubah.
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
