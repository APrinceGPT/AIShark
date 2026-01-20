import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "AIShark - PCAP Analyzer",
  description: "Advanced packet capture analysis tool for network troubleshooting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
