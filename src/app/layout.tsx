import type { ReactNode } from "react";

export const metadata = {
  title: "Basis",
  description: "Back office infrastructure for AI agents.",
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
