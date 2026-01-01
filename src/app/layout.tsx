import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sajilo Share",
  description: "Simple public link sharing for text and files",
  keywords: [
    "share text without login",
    "share file without login",
    "sajilo share",
    "easy share",
    "quick share",
    "temporary file sharing",
    "anonymous file sharing",
    "secure text sharing",
    "online clipboard",
    "share code snippets",
    "free file hosting",
    "no registration file sharing",
    "instant file sharing",
    "public file sharing",
    "text sharing platform",
    "file sharing website",
  ],
  verification: {
    google: "JfTW2psKTQR3IdWWTrUpKgYszAVuKakjDch1RrFO8NY",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
