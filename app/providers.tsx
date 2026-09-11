import { ThemeProvider } from "@/components/providers/theme-provider"
import { ReCaptchaProvider } from "next-recaptcha-v3";


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
              {children}
            </ReCaptchaProvider>
          </ThemeProvider>
    );
  }