import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PALETTE_FAMILIES } from "@/lib/palettes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AeroTrack",
  description: "Installation / Service Work Record",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Runs before paint, so nothing flashes:
            - flags <html> when inside the Capacitor WebView (the APK) so the
              native app chrome shows only there, never in a normal browser;
            - applies the saved Appearance choices (theme light/dark, and the
              reduce-motion toggle) so a forced theme paints correctly on the
              very first frame. "System" stores nothing and leaves data-theme
              off, letting the CSS media query decide. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.setAttribute('data-native','1')}}catch(e){}" +
              "try{var d=document.documentElement,t=localStorage.getItem('theme');" +
              "if(t==='dark'||t==='light'){d.setAttribute('data-theme',t)}" +
              "else if(t==='custom'){var F=" +
              JSON.stringify(PALETTE_FAMILIES) +
              ",p=localStorage.getItem('palette'),f=F[p];if(f){d.setAttribute('data-theme',f);d.setAttribute('data-palette',p)}}" +
              "if(localStorage.getItem('reduce-motion')==='1'){d.setAttribute('data-reduce-motion','1')}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
