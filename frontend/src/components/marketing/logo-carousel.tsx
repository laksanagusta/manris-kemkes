import Image from "next/image";
import styles from "./marketing.module.css";

const logos = [
  { file: "bkk-semarang-transparent.png", name: "Balai Kekarantinaan Kesehatan Semarang", width: 1292, height: 417 },
  { file: "bkk-kendari-transparent.png", name: "Balai Kekarantinaan Kesehatan Kendari", width: 1208, height: 417 },
  { file: "bkk-merauke-transparent.png", name: "Balai Kekarantinaan Kesehatan Merauke", width: 1292, height: 417 },
  { file: "kemenkes-hd.png", name: "Kementerian Kesehatan", width: 1792, height: 500 },
  { file: "ditjen-p2.png", name: "Kementerian Kesehatan Direktorat Jenderal Penanggulangan Penyakit", width: 2120, height: 687 },
];

export function LogoCarousel() {

  return (
    <section className={`${styles.surface} ${styles.logoCarousel}`} aria-label="Logo instansi">
      <div className={styles.logoViewport}>
        <div className={styles.logoTrack}>
          {[false, true].map((duplicate) => (
            <ul className={styles.logoGroup} aria-hidden={duplicate || undefined} key={String(duplicate)}>
              {logos.map((logo) => (
                <li className={styles.logoItem} key={logo.file}>
                  <span className={styles.logoImage}>
                    <Image src={`/marketing/logos/${logo.file}`} alt={duplicate ? "" : logo.name} width={logo.width} height={logo.height} unoptimized sizes="200px" />
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
