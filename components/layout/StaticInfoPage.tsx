import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type StaticInfoPageProps = {
  title: string;
  description: string;
  sections: { heading: string; body: string }[];
};

export default function StaticInfoPage({
  title,
  description,
  sections,
}: StaticInfoPageProps) {
  return (
    <main className="container mx-auto max-w-3xl flex-1 px-4 py-10">
      <Link href="/">
        <Button variant="ghost" className="mb-6 -ml-2 gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Button>
      </Link>

      <h1 className="font-lora text-3xl font-semibold text-[#10375d] dark:text-foreground">
        {title}
      </h1>
      <p className="mt-3 text-muted-foreground">{description}</p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Это страница-заглушка. Текст будет уточнён перед публикацией платформы.
      </p>
    </main>
  );
}
