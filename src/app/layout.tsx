import Providers from "@/lib/progressBarContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { env } from "@/env";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};


import { CookiesProvider } from 'next-client-cookies/server';



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ClerkProvider
            afterSignOutUrl={"/auth/login"}
            publishableKey={env.NEXT_PUBLIC_PUBLISHABLE_KEY}
            signUpForceRedirectUrl={'/connect-telegram'}
            signInForceRedirectUrl={'/connect-telegram'}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <CookiesProvider>
                {children}
              </CookiesProvider>
            </ThemeProvider>
          </ClerkProvider>
        </Providers>
      </body>
    </html>
  );
}
