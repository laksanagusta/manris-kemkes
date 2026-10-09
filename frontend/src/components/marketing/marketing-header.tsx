"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ManriskMark } from "@/components/manrisk-mark";
import { Button } from "@/components/ui/button";
import { AlignLeft, X } from "@/components/shared/icons";
import styles from "./marketing.module.css";

const navigation = [
  { href: "#fitur", label: "Fitur" },
  { href: "#alur-kerja", label: "Cara kerja" },
  { href: "#keamanan", label: "Kontrol akses" },
  { href: "/docs", label: "Panduan" },
];

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuContent = useRef<HTMLElement>(null);

  useEffect(() => {
    const content = menuContent.current;
    if (!content) return;
    const observer = new ResizeObserver(() => setMenuHeight(content.offsetHeight));
    observer.observe(content);
    // A desktop resize also clears the disclosure state before returning to mobile.
    const desktop = window.matchMedia("(min-width: 901px)");
    const onViewportChange = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", onViewportChange);
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", onViewportChange);
    };
  }, []);
  return (
    <header className={styles.header} onKeyDown={(event) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="Manrisk beranda"><ManriskMark size={25} className="dark:invert-0" /><span>manrisk</span></Link>
        <nav className={styles.desktopNav} aria-label="Navigasi utama">
          {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.loginLink}>Masuk</Link>
          <Button asChild data-marketing-action="compact"><Link href="/register">Daftar akun</Link></Button>
          <Button ref={menuButton} variant="ghost" size="icon" className={styles.menuToggle} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="homepage-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="t-icon-swap" data-state={menuOpen ? "b" : "a"} aria-hidden="true">
              <span className="t-icon" data-icon="a"><AlignLeft /></span>
              <span className="t-icon" data-icon="b"><X /></span>
            </span>
          </Button>
        </div>
      </div>
      <div className={`t-resize ${styles.mobileMenu}`} style={{ height: menuOpen ? menuHeight : 0 }} inert={!menuOpen}>
        <nav ref={menuContent} id="homepage-mobile-menu" className={`t-panel-slide ${styles.mobileNav} ${styles.menuPanel}`} data-open={menuOpen} aria-label="Navigasi mobile">
          {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
