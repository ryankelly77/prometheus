import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prometheus - Restaurant KPI Dashboard',
  description: 'Multi-tenant, white-label restaurant analytics platform with health scoring and AI insights.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Inline script to apply cached branding before paint (prevents flash)
  const brandingScript = `
    (function() {
      try {
        var cached = localStorage.getItem('prometheus_branding');
        if (!cached) return;
        var org = JSON.parse(cached);
        if (!org.primaryColor) return;

        function hexToHsl(hex) {
          var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
          if (!result) return null;
          var r = parseInt(result[1], 16) / 255;
          var g = parseInt(result[2], 16) / 255;
          var b = parseInt(result[3], 16) / 255;
          var max = Math.max(r, g, b), min = Math.min(r, g, b);
          var h = 0, s = 0, l = (max + min) / 2;
          if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
              case g: h = ((b - r) / d + 2) / 6; break;
              case b: h = ((r - g) / d + 4) / 6; break;
            }
          }
          return Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
        }

        var root = document.documentElement;
        var primaryHsl = hexToHsl(org.primaryColor);
        var accentHsl = hexToHsl(org.accentColor);

        if (primaryHsl) {
          root.style.setProperty('--primary', primaryHsl);
          root.style.setProperty('--ring', primaryHsl);
          root.style.setProperty('--sidebar-primary', primaryHsl);
          root.style.setProperty('--chart-1', primaryHsl);
          var primaryFg = org.primaryTextLight ? '0 0% 100%' : '0 0% 0%';
          root.style.setProperty('--primary-foreground', primaryFg);
          root.style.setProperty('--sidebar-primary-foreground', primaryFg);
        }
        if (accentHsl) {
          root.style.setProperty('--accent', accentHsl);
          root.style.setProperty('--sidebar-accent', accentHsl);
          var accentFg = org.accentTextLight ? '0 0% 100%' : '0 0% 0%';
          root.style.setProperty('--accent-foreground', accentFg);
          root.style.setProperty('--sidebar-accent-foreground', accentFg);
        }
      } catch(e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: brandingScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
