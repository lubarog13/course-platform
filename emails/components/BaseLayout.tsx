import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";
import type { ReactNode } from "react";
import tailwindConfig, { brand } from "../tailwind.config";

type BaseLayoutProps = {
  preview: string;
  children: ReactNode;
};

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  const year = new Date().getFullYear();

  return (
    <Html lang="ru" dir="ltr">
      <Tailwind config={tailwindConfig}>
        <Head />
        <Body className="bg-brand-surface font-sans py-10">
          <Preview>{preview}</Preview>
          <Container className="mx-auto max-w-xl bg-white px-8 py-8 rounded">
            <Section>
              <Text className="m-0 text-lg font-bold text-brand tracking-tight">
                {brand.name}
              </Text>
            </Section>

            <Hr className="border-solid border-brand-border my-6" />

            {children}

            <Hr className="border-solid border-brand-border my-6" />

            <Section>
              <Text className="m-0 text-xs leading-5 text-brand-muted">
                © {year} {brand.name}. Это автоматическое уведомление — отвечать
                на него не нужно.
              </Text>
              {brand.baseUrl ? (
                <Text className="mt-2 mb-0 text-xs leading-5 text-brand-muted">
                  <Link
                    href={brand.baseUrl}
                    className="text-brand underline"
                  >
                    Открыть платформу
                  </Link>
                </Text>
              ) : null}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
