import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReCaptchaProvider } from "next-recaptcha-v3";


export function Providers({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
          <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ReCaptchaProvider useEnterprise>
              {children}
            </ReCaptchaProvider>
          </NextThemesProvider>
    );
  }