import './globals.css';
import { Noto_Sans, Noto_Serif } from 'next/font/google';
import Weather from '../components/Weather';
import { SITE_NAME } from '../lib/supabase';

const sans = Noto_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Noto_Serif({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata = {
  title: SITE_NAME,
  description: 'News, photos, videos and stories from our Brundavanam Totalu.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <header className="top">
          <a href="/" className="brand">{SITE_NAME}</a>
          <Weather />
        </header>
        <main>{children}</main>
        <footer className="foot">
          <a href="/admin">Admin</a>
        </footer>
      </body>
    </html>
  );
}
