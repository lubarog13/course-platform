import { ThemeProvider } from "@/components/providers/theme-provider"
import { ReCaptchaProvider } from "next-recaptcha-v3";
import { SessionProvider } from "next-auth/react";


export function Providers({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
          <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          >
            <ReCaptchaProvider useEnterprise>
              <SessionProvider>
                {children}
              </SessionProvider>
            </ReCaptchaProvider>
          </ThemeProvider>
    );
  }