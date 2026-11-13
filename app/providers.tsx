import { ThemeProvider } from "@/components/providers/theme-provider";
import { ReCaptchaProvider } from "next-recaptcha-v3";
import { SessionProvider } from "next-auth/react";
import { SkulletProvider } from "skullet/react";
import { TooltipProvider } from "@/components/ui/tooltip"
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
      <TooltipProvider>
      <ReCaptchaProvider useEnterprise>
        <SessionProvider>
          <SkulletProvider mode="system" reveal="smart">
            {children}
          </SkulletProvider>
          </SessionProvider>
        </ReCaptchaProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}