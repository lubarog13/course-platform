"use client";

import Markdown from "react-markdown";

import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  nodes: string;
  /** Компактные стили для пузырей чата и т.п. */
  compact?: boolean;
  className?: string;
};

export default function MarkdownContent({
  nodes,
  compact = false,
  className,
}: MarkdownContentProps) {
  const text = compact
    ? "text-inherit"
    : "text-gray-700 dark:text-gray-300";
  const gap = compact ? "mb-1 last:mb-0" : "mb-4";

  return (
    <div
      className={cn(
        compact && "text-sm leading-snug break-words [&_*:first-child]:mt-0",
        className,
      )}
    >
      <Markdown
        components={{
          p: ({ children }) => (
            <p className={cn(text, gap)}>{children}</p>
          ),
          h1: ({ children }) => (
            <h1
              className={cn(
                text,
                "font-bold",
                compact ? "mb-1 text-base" : "mb-4 text-3xl",
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                text,
                "font-bold",
                compact ? "mb-1 text-sm" : "mb-4 text-2xl",
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                text,
                "font-bold",
                compact ? "mb-1 text-sm" : "mb-4 text-xl",
              )}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              className={cn(
                text,
                "font-bold",
                compact ? "mb-1 text-sm" : "mb-4 text-lg",
              )}
            >
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className={cn(text, "mb-1 font-bold text-sm")}>{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className={cn(text, "mb-1 font-bold text-xs")}>{children}</h6>
          ),
          ul: ({ children }) => (
            <ul className={cn(text, gap, "list-inside list-disc")}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={cn(text, gap, "list-inside list-decimal")}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className={cn(text, compact ? "mb-0.5" : "mb-2")}>{children}</li>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-2 border-gray-300 dark:border-gray-700" />
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ""}
              className={cn(gap, "max-w-full rounded-md")}
            />
          ),
          code: ({ children }) => (
            <code className="rounded-md bg-black/10 px-1 py-0.5 text-[0.9em] dark:bg-white/10">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                text,
                gap,
                "border-l-4 border-gray-300 pl-3 dark:border-gray-600",
              )}
            >
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
        }}
      >
        {nodes}
      </Markdown>
    </div>
  );
}
