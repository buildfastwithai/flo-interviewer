import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice AI Interview | Interactive Interview Assistant",
  description: "An AI voice interview application with real-time visualization and transcript capabilities",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  authors: [{ name: 'AI Voice Interview' }],
  keywords: ['interview', 'AI', 'voice', 'transcript', 'interview practice'],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1e293b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
