import type { Metadata } from "next";
import "./globals.css";
import ToastContainer from "@/components/ToastContainer";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import ErrorBoundary from "@/components/ErrorBoundary";
import GoogleAnalytics from "@/components/GoogleAnalytics";

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
      <body className="antialiased bg-gray-50 dark:bg-gray-900 flex flex-col min-h-screen">
        <GoogleAnalytics />
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
              <ToastContainer />
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
