import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Codebound: The Syntax Chronicles', description: 'A 2D pixel-art RPG where Language Spirits battle corrupted Data Beasts.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-black overflow-hidden">{children}</body></html>;
}
