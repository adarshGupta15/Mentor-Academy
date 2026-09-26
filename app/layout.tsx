import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mentor Academy | Build Your Foundation",
  description: "Personal guidance, regular testing and strong concepts for Class 7–12, JEE and NEET.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
