import type { Metadata } from 'next';
import { Fira_Code } from 'next/font/google';
import './globals.css';
import { ThemeProvider, ThemeScript } from '@/components/providers/ThemeProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Sidebar } from '@/components/Sidebar';
import { SidebarLayout } from '@/components/Sidebar/SidebarLayout';
import { SidebarProvider } from '@/components/Sidebar/SidebarProvider';
import { MobileMenuButton } from '@/components/Sidebar/MobileMenuButton';
import { DynamicBoardHeader } from '@/components/ui/DynamicBoardHeader';

const firaCode = Fira_Code({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dev Automation Board',
  description: 'AI-powered Kanban board for automated software development',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={firaCode.className} suppressHydrationWarning>
        <ThemeProvider>
          <SidebarProvider>
            <div className="flex min-h-screen bg-background text-foreground">
              {/* Sidebar */}
              <Sidebar />

              {/* Main content area */}
              <SidebarLayout>
                {/* Header */}
                <header className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <MobileMenuButton />
                      <DynamicBoardHeader />
                    </div>
                    <div className="flex items-center gap-4">
                      <ThemeToggle variant="compact" size="md" />
                    </div>
                  </div>
                </header>

                {/* Main content */}
                <main className="flex-1 container max-w-screen-2xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </main>
              </SidebarLayout>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
