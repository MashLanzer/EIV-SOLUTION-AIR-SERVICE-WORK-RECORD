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
        {/* Runs before paint: flags the <html> when we're inside the Capacitor
            WebView (the APK) so the native app chrome (4-tab + FAB bar) shows
            only there, never in a normal browser. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.setAttribute('data-native','1')}}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
