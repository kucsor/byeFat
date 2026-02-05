import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ThemeProvider } from '@/components/theme-provider';
import { Rajdhani, Inter } from 'next/font/google';

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'byeFat - RPG Calorie Tracker',
  description: 'Level up your health. Track calories, gain XP, and complete your daily quests.',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  icons: {
    icon: '/app-icon.svg',
    apple: '/app-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${rajdhani.variable} ${inter.variable}`}>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            <FirebaseClientProvider>
                <FirebaseErrorListener />
                {children}
            </FirebaseClientProvider>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
