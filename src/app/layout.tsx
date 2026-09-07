import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyGerai",
  description: "Pesan lewat scan QR, bayar QRIS, langsung masuk ke Pedagang.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {children}
      </body>
    </html>
  );
}
