import { MarketingReveal } from "./marketing-reveal";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AgentIcon, ArrowRight, Check, Sparkles } from "@/components/shared/icons";
import dashboardScreenshot from "../../../public/marketing/screens/dashboard.png";
import registerScreenshot from "../../../public/marketing/screens/risk-register.png";
import extractionScreenshot from "../../../public/marketing/screens/sop-extraction.png";
import treatmentScreenshot from "../../../public/marketing/screens/treatment.png";
import monitoringScreenshot from "../../../public/marketing/screens/monitoring.png";
import paperScreenshot from "../../../public/marketing/screens/working-paper.png";
import minutesScreenshot from "../../../public/marketing/screens/meeting-minutes.png";
import reportsScreenshot from "../../../public/marketing/screens/reports.png";
import importScreenshot from "../../../public/marketing/screens/risk-import.png";
import styles from "./marketing.module.css";

export function MarketingActions() {
  return (
    <div className={styles.actions}>
      <Button asChild size="lg" data-marketing-action>
        <Link href="/register">Daftar akun <ArrowRight data-icon="inline-end" /></Link>
      </Button>
      <Button asChild size="lg" variant="outline" data-marketing-action>
        <Link href="/docs">Baca panduan</Link>
      </Button>
    </div>
  );
}

const previews = {
  dashboard: { image: dashboardScreenshot, alt: "Dashboard Manrisk dengan tren, distribusi kategori, komposisi, dan peta risiko" },
  register: { image: registerScreenshot, alt: "Register risiko dengan status, skor, dan progres pemantauan" },
  extraction: { image: extractionScreenshot, alt: "Ekstraksi risiko dari dokumen menjadi kandidat risiko beserta sumbernya" },
  treatment: { image: treatmentScreenshot, alt: "Daftar penanganan risiko dan progres mitigasi" },
  monitoring: { image: monitoringScreenshot, alt: "Pemantauan risiko per periode di Manrisk" },
  paper: { image: paperScreenshot, alt: "Kertas kerja dengan skor risiko dan riwayat tanda tangan" },
  minutes: { image: minutesScreenshot, alt: "Notulen rapat dan hasil tindak lanjut" },
  reports: { image: reportsScreenshot, alt: "Ringkasan risiko dengan profil, pencapaian target, pelaporan mitigasi, dan pemantauan final" },
  import: { image: importScreenshot, alt: "Impor risiko dari template Excel dan tinjauan hasil parsing" },
};

type PreviewKind = keyof typeof previews;

export function MarketingPreview({ kind = "dashboard", hero = false }: { kind?: PreviewKind; hero?: boolean }) {
  const preview = previews[kind];
  return (
    <figure className={`${styles.preview} ${hero ? styles.heroPreview : ""}`}>
      <div className={styles.previewBackdrop} aria-hidden="true" />
      <div className={styles.previewScreen}>
        <div className={styles.windowBar} aria-hidden="true">
          <span /><span /><span />
          <small>manrisk / {kind === "dashboard" ? "overview" : "workspace"}</small>
        </div>
        <Image
          src={preview.image}
          alt={preview.alt}
          sizes={hero ? "(max-width: 760px) 92vw, 1000px" : "(max-width: 760px) 90vw, 600px"}
          priority={hero}
          className={styles.screenImage}
        />
      </div>
      {hero && (
        <aside className={styles.previewInsight} aria-label="Contoh ringkasan analisis risiko">
          <div className={styles.insightEyebrow}><Sparkles size={15} /> Asisten Manrisk <span>Contoh</span></div>
          <h3>Dari dokumen ke draf risiko.</h3>
          <p>Tinjau kandidat risiko dari dokumen sebelum menyimpannya sebagai draf.</p>
          <div className={styles.sampleFile}><span className={styles.fileMark}>PDF</span><div><strong>Laporan Kinerja.pdf</strong><small>Dokumen sumber</small></div><Check size={16} /></div>
          <ul className={styles.insightList}>
            <li><Check size={14} /> Identifikasi kandidat risiko</li>
            <li><Check size={14} /> Telusuri sumber temuan</li>
            <li><Check size={14} /> Tinjau sebelum membuat draf</li>
          </ul>
          <div className={styles.insightFooter}><span className={styles.statusDot} /> Hasil AI perlu ditinjau</div>
        </aside>
      )}
    </figure>
  );
}

function MarketingAgentPreview() {
  return (
    <figure className={`${styles.preview} ${styles.agentPreview}`} aria-label="Contoh percakapan AI Agent Manrisk">
      <div className={styles.previewBackdrop} aria-hidden="true" />
      <div className={`${styles.previewScreen} ${styles.agentScreen}`}>
        <div className={styles.windowBar} aria-hidden="true"><span /><span /><span /><small>manrisk / agent</small></div>
        <div className={styles.agentConversation}>
          <div className={styles.agentPreviewHeader}><span><AgentIcon width={18} height={18} aria-hidden="true" /> AI Agent</span><small>Contoh percakapan</small></div>
          <p className={styles.agentQuestion}>Apa yang perlu ditindaklanjuti dari risiko unit saya?</p>
          <div className={styles.agentAnswer}>
            <p>Prioritaskan risiko berskor tinggi dan tinjau penanganan yang belum dilaporkan.</p>
            <ul><li><Check size={14} aria-hidden="true" /> Tinjau profil dan penyebab risiko</li><li><Check size={14} aria-hidden="true" /> Telusuri progres penanganan</li><li><Check size={14} aria-hidden="true" /> Susun usulan tindak lanjut</li></ul>
          </div>
          <small className={styles.agentReviewNote}>Usulan perubahan ditinjau sebelum diterapkan.</small>
        </div>
      </div>
    </figure>
  );
}

export function MarketingFeatures() {
  return (
    <div className={styles.featureGrid}>
      <MarketingReveal as="article" className={styles.feature}>
        <MarketingPreview kind="register" />
        <h3>Profil risiko dalam satu tampilan.</h3>
        <p>Lihat skor, status, dan progres pemantauan setiap risiko. Gunakan informasi yang sama untuk menentukan prioritas tim.</p>
      </MarketingReveal>
      <MarketingReveal as="article" className={styles.feature}>
        <MarketingAgentPreview />
        <h3>Tinjau risiko bersama AI Agent.</h3>
        <p>Tanyakan profil risiko, telusuri penanganan dan kejadian, lalu susun usulan tindak lanjut melalui percakapan. Tinjau usulan sebelum menerapkan perubahan.</p>
        <Link href="/agent" className={styles.textLink}>Buka AI Agent <ArrowRight size={16} /></Link>
      </MarketingReveal>
    </div>
  );
}

export function MarketingSystemExample() {
  return (
    <>
      <div className={`${styles.surface} ${styles.typeSpecimen}`} aria-label="Skala tipografi homepage">
        <div><span className={styles.eyebrow}>Display · 36–58px</span><p className={styles.specimenDisplay}>Kelola risiko bersama tim dalam satu tempat.</p></div>
        <div><span className={styles.eyebrow}>Section · 28–40px</span><p className={styles.sectionHeading}>Informasi risiko yang jelas untuk seluruh tim.</p></div>
        <div><span className={styles.eyebrow}>Alur · 24–28px</span><p className={styles.specimenWorkflow}>Susun rencana penanganan</p></div>
        <div><span className={styles.eyebrow}>Kartu · 20px</span><p className={styles.specimenCard}>Profil risiko dalam satu tampilan.</p></div>
        <div><span className={styles.eyebrow}>Lead · 18px</span><p className={styles.specimenLead}>Catat dan nilai risiko, susun penanganan, lalu pantau progresnya.</p></div>
        <div><span className={styles.eyebrow}>Body · 16px</span><p>Gunakan bantuan AI untuk meninjau dokumen dan menyusun notulen rapat.</p></div>
        <div><span className={styles.eyebrow}>UI · 14px</span><p className={styles.specimenUi}>Baca panduan</p></div>
        <div><span className={styles.eyebrow}>Caption · 13px</span><p className={styles.specimenCaption}>Laporan Kinerja.pdf</p></div>
        <div><span className={styles.eyebrow}>Microcopy · 12px</span><p className={styles.specimenMicro}>Hasil AI perlu ditinjau</p></div>
      </div>
      <MarketingReveal className={`${styles.surface} ${styles.systemExample}`}>
        <div className={styles.exampleCopy}>
          <span className={styles.eyebrow}>Public homepage</span>
          <h3>Kelola risiko bersama tim.<br /><span>Mulai dengan Manrisk.</span></h3>
          <p>Geist, palet netral, tombol pill, dan preview produk dari homepage Manrisk.</p>
          <MarketingActions />
          <Link href="/" className={styles.textLink}>Lihat homepage <ArrowRight size={16} /></Link>
        </div>
        <MarketingPreview kind="dashboard" />
      </MarketingReveal>
      <div className={styles.surface}><MarketingFeatures /></div>
    </>
  );
}
