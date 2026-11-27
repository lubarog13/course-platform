import type { Metadata } from "next";
import { Geist_Mono, Lora, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Онлайн-курсы",
    template: "%s | Онлайн-курсы",
  },
  description: "Библейские онлайн-курсы для всех возрастов",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistMono.variable} ${lora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

