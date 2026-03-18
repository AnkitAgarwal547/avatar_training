import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Avatar Training',
  description: 'AI-powered customer complaint handling training with voice avatar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <Link href="/" className="nav-brand">
            <span className="nav-logo">🤖</span>
            AvatarTrainer
          </Link>
          <div className="nav-links">
            <Link href="/roleplay" className="nav-link">Roleplay</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
