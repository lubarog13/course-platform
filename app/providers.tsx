import { ThemeProvider } from "@/components/providers/theme-provider";
import { ReCaptchaProvider } from "next-recaptcha-v3";
import { SessionProvider } from "next-auth/react";
import { SkulletProvider } from "skullet/react";
import "skullet/styles.css";

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
          <SkulletProvider mode="system" reveal="smart">
            {children}
          </SkulletProvider>
        </SessionProvider>
      </ReCaptchaProvider>
    </ThemeProvider>
  );
}