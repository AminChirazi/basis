import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Basis",
  description: "Self-hosted back office infrastructure.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
