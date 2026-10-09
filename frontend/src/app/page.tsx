import type { Metadata } from "next";
import Link from "next/link";
import { ManriskMark } from "@/components/manrisk-mark";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { LogoCarousel } from "@/components/marketing/logo-carousel";
import { MarketingActions, MarketingPreview } from "@/components/marketing/marketing-primitives";
import {
  ArrowRight, BarChart3, Building2, ClipboardCheck,
  FileSignature, FileSpreadsheet, FileText, History, Layers3,
  Lock, Sparkles, Users,
} from "@/components/shared/icons";
import styles from "@/components/marketing/marketing.module.css";

export const metadata: Metadata = {
  title: "Manrisk — Kelola risiko bersama tim",
  description: "Catat dan nilai risiko, susun penanganan, lalu pantau progresnya bersama tim. Manrisk menyediakan bantuan AI untuk meninjau SOP dan menyusun notulen rapat.",
};

const workflow = [
  { title: "Catat risiko dan penyebabnya", description: "Mulai dari konteks organisasi, hasil rapat, atau temuan tim. Catat penyebab dan dampak risiko sebagai dasar penilaian.", kind: "minutes" as const },
  { title: "Susun rencana penanganan", description: "Tetapkan langkah mitigasi, penanggung jawab, dan target penyelesaian untuk setiap risiko.", kind: "treatment" as const },
  { title: "Pantau progres dan perubahan risiko", description: "Perbarui progres mitigasi dan skor risiko setiap periode. Tinjau perkembangan untuk menentukan tindak lanjut.", kind: "monitoring" as const },
  { title: "Susun laporan dan kertas kerja", description: "Rangkum hasil pemantauan dalam laporan dan kertas kerja. Tinjau isinya, teruskan kertas kerja untuk tanda tangan, dan telusuri riwayat dokumen.", kind: "paper" as const },
];

const tools = [
  { icon: FileText, name: "Ekstraksi SOP", description: "Temukan kandidat risiko beserta sumbernya dalam SOP.", href: "/docs/risk-register#ekstraksi-sop" },
  { icon: FileSpreadsheet, name: "Excel", description: "Impor profil risiko dan ekspor hasil kerja.", href: "/docs/risk-register" },
  { icon: Users, name: "Kolaborasi tim", description: "Bagikan tugas mitigasi dengan penanggung jawab yang jelas.", href: "/docs/risk-treatment" },
  { icon: FileSignature, name: "Tanda tangan", description: "Tinjau dan tandatangani kertas kerja sesuai urutan.", href: "/docs/signatures" },
  { icon: Sparkles, name: "Notulen rapat", description: "Susun notulen, keputusan, dan tindak lanjut dari transkrip rapat.", href: "/docs/meeting-minutes" },
  { icon: BarChart3, name: "Ringkasan risiko", description: "Baca ringkasan risiko dan progresnya per periode.", href: "/docs/reports" },
  { icon: Building2, name: "Grup organisasi", description: "Kelompokkan unit kerja untuk memilih cakupan laporan.", href: "/docs/organization-groups" },
  { icon: Layers3, name: "API key", description: "Akses peta risiko organisasi dari aplikasi lain.", href: "/docs/api-key" },
];

const resources = [
  ["Mulai menggunakan Manrisk", "Kenali ruang kerja dan alur manajemen risiko.", "/docs/introduction"],
  ["Identifikasi dan nilai risiko", "Susun profil risiko yang siap ditindaklanjuti.", "/docs/risk-register"],
  ["Kelola rencana penanganan", "Catat mitigasi, penanggung jawab, dan progres.", "/docs/risk-treatment"],
  ["Pantau risiko setiap periode", "Tinjau perkembangan dan finalisasi pemantauan.", "/docs/risk-monitoring"],
  ["Susun kertas kerja", "Rangkum hasil pemantauan untuk ditinjau dan ditandatangani.", "/docs/working-papers"],
];

export default function HomePage() {
  return (
    <div className={styles.surface}>
      <a className={styles.skipLink} href="#main-content">Lewati ke konten</a>
      <MarketingHeader />
      <main id="main-content">
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <h1 id="hero-heading">Kelola risiko bersama tim dalam satu tempat.</h1>
            <p>Catat dan nilai risiko, susun penanganan, lalu pantau progresnya. Gunakan bantuan AI untuk meninjau SOP dan menyusun notulen rapat.</p>
            <MarketingActions />
          </div>
          <div className={styles.heroMedia}><MarketingPreview hero /></div>
          <LogoCarousel />
        </section>

        <section id="fitur" className={`${styles.container} ${styles.section}`} aria-labelledby="features-heading">
          <h2 id="features-heading" className={styles.sectionHeading}>Informasi risiko yang jelas untuk seluruh tim.</h2>
          <div className={styles.featureGrid}>
            <MarketingReveal as="article" className={styles.feature}><MarketingPreview kind="register" /><h3>Profil risiko dalam satu tampilan.</h3><p>Lihat skor, status, dan progres pemantauan setiap risiko. Gunakan informasi yang sama untuk menentukan prioritas tim.</p></MarketingReveal>
            <MarketingReveal as="article" className={styles.feature}><MarketingPreview kind="extraction" /><h3>Temukan kandidat risiko dari SOP.</h3><p>Gunakan AI untuk menemukan kandidat risiko dalam SOP beserta sumbernya. Periksa hasilnya sebelum membuat draf.</p><Link href="/docs/risk-register#ekstraksi-sop" className={styles.textLink}>Baca panduan ekstraksi SOP <ArrowRight size={16} /></Link></MarketingReveal>
          </div>
        </section>

        <div className={styles.sectionDivider}>
          <section id="alur-kerja" className={`${styles.container} ${styles.section}`} aria-labelledby="workflow-heading">
            <h2 id="workflow-heading" className={styles.sectionHeading}><span>Dari identifikasi hingga pelaporan,</span>ikuti setiap tahap dalam satu ruang kerja.</h2>
            <div className={styles.workflow}>{workflow.map((item) => (
              <MarketingReveal as="article" key={item.kind} className={styles.workflowRow}>
                <div className={styles.workflowCopy}><h3>{item.title}</h3><p>{item.description}</p></div>
                <MarketingPreview kind={item.kind} />
              </MarketingReveal>
            ))}</div>
          </section>
        </div>

        <div className={styles.sectionDivider}>
          <section className={`${styles.container} ${styles.section}`} aria-labelledby="tools-heading">
            <h2 id="tools-heading" className={styles.sectionHeading}><span>Dokumen, kolaborasi, dan integrasi.</span>Dalam alur kerja yang sama.</h2>
            <MarketingReveal className={styles.toolsGrid}>{tools.map(({ icon: Icon, name, description, href }) => <Link key={name} href={href} className={styles.tool}><Icon aria-hidden="true" /><strong>{name}</strong><p>{description}</p></Link>)}</MarketingReveal>
          </section>
        </div>

        <div className={styles.sectionDivider}>
          <section className={`${styles.container} ${styles.section} ${styles.resourceLayout}`} aria-labelledby="resources-heading">
            <div><h2 id="resources-heading" className={styles.sectionHeading}>Mulai dengan panduan yang jelas.</h2><p className={styles.sectionIntro}>Baca panduan dari pencatatan risiko hingga penyusunan kertas kerja.</p></div>
            <MarketingReveal className={styles.resourceList}>{resources.map(([title, description, href]) => <Link className={styles.resource} key={href} href={href}><div><h3>{title}</h3><p>{description}</p></div><ArrowRight aria-hidden="true" /></Link>)}</MarketingReveal>
          </section>
        </div>

        <div className={styles.sectionDivider}>
          <section id="keamanan" className={`${styles.container} ${styles.section} ${styles.security}`} aria-labelledby="security-heading">
            <h2 id="security-heading" className={styles.sectionHeading}>Ruang kerja terkelola.<span>Akses sesuai tanggung jawab.</span></h2>
            <MarketingReveal className={styles.securityItems}>
              <article className={styles.securityItem}><Lock aria-hidden="true" /><h3>Akses berbasis peran</h3><p>Hak akses mengikuti peran pengguna dan cakupan organisasi.</p></article>
              <article className={styles.securityItem}><History aria-hidden="true" /><h3>Riwayat yang dapat ditelusuri</h3><p>Perubahan profil dan versi risiko tersimpan untuk mendukung tinjauan.</p></article>
              <article className={styles.securityItem}><ClipboardCheck aria-hidden="true" /><h3>Alur tinjauan yang jelas</h3><p>Kertas kerja diteruskan sesuai alur tanda tangan yang ditetapkan.</p></article>
            </MarketingReveal>
          </section>
        </div>

        <div className={styles.sectionDivider}>
          <section className={`${styles.container} ${styles.closing}`} aria-labelledby="closing-heading">
            <MarketingReveal>
              <h2 id="closing-heading" className={styles.sectionHeading}><span>Kelola risiko bersama tim.</span>Mulai dengan Manrisk.</h2>
              <p>Daftar akun untuk mulai menggunakan Manrisk. Akun dapat digunakan setelah admin menyetujui pendaftaran.</p><MarketingActions />
            </MarketingReveal>
          </section>
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}><Link href="/" className={styles.brand} aria-label="Manrisk beranda"><ManriskMark className="dark:invert-0" /><span>manrisk</span></Link></div>
            <div className={styles.footerColumn}><h3>Produk</h3><Link href="#fitur">Fitur Manrisk</Link><Link href="#alur-kerja">Cara kerja</Link><Link href="#keamanan">Kontrol akses</Link></div>
            <div className={styles.footerColumn}><h3>Panduan</h3><Link href="/docs">Dokumentasi</Link><Link href="/docs/account-access">Akses akun</Link><Link href="/docs/glossary-and-troubleshooting">Istilah dan kendala</Link></div>
            <div className={styles.footerColumn}><h3>Mulai</h3><Link href="/register">Daftar akun</Link><Link href="/login">Masuk aplikasi</Link><Link href="/docs/introduction">Panduan penggunaan</Link></div>
          </div>
          <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Manrisk</span></div>
        </div>
      </footer>
    </div>
  );
}
