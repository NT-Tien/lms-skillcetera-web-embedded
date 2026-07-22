import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";

// Font serif cho bài đọc (khớp "Lora" trong bản gốc), có subset tiếng Việt.
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
});

export const metadata: Metadata = {
  title: "Embedded content",
  description: "Static embeddable content pages",
};

// Layout tối giản, không header/nav/footer — trang gọn khi nhúng qua iframe.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
