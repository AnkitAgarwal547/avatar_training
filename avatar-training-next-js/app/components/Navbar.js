"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/training", label: "Training", icon: "🎓" },
    { href: "/roleplay", label: "Roleplay", icon: "🤖" },
    // { href: '/modules', label: 'Modules', icon: '📚' },
    // { href: '/progress', label: 'Progress', icon: '📊' },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🤖</span>
          <span className={styles.logoText}>AvatarTrainer</span>
        </Link>

        <div className={`${styles.links} ${mobileOpen ? styles.open : ""}`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${pathname === link.href ? styles.active : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className={styles.linkIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`${styles.bar} ${mobileOpen ? styles.barOpen : ""}`}
          />
          <span
            className={`${styles.bar} ${mobileOpen ? styles.barOpen : ""}`}
          />
          <span
            className={`${styles.bar} ${mobileOpen ? styles.barOpen : ""}`}
          />
        </button>
      </div>
    </nav>
  );
}
