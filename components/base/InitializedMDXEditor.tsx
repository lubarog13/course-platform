"use client";

import { useRef, type ForwardedRef } from "react";
import { useTheme } from "next-themes";
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  frontmatterPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  directivesPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  KitchenSinkToolbar,
  AdmonitionDirectiveDescriptor,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import {
  diffRemovedImageUrls,
  mdxEditorRu,
  uploadEditorImage,
} from "./mdxEditorRu";

const lessonEditorPlugins = [
  toolbarPlugin({
    toolbarContents: () => <KitchenSinkToolbar />,
  }),
  listsPlugin(),
  quotePlugin(),
  headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
  linkPlugin(),
  linkDialogPlugin(),
  imagePlugin({
    imageUploadHandler: uploadEditorImage,
    imageAutocompleteSuggestions: [],
  }),
  tablePlugin(),
  thematicBreakPlugin(),
  frontmatterPlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: "Текст",
      js: "JavaScript",
      ts: "TypeScript",
      css: "CSS",
      html: "HTML",
      json: "JSON",
      md: "Markdown",
      bash: "Bash",
    },
  }),
  directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
  diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
  markdownShortcutPlugin(),
];

export type InitializedMDXEditorProps = {
  editorRef: ForwardedRef<MDXEditorMethods> | null;
  /** Вызывается, когда из markdown исчезли URL картинок (кнопка, Backspace, source). */
  onImagesRemoved?: (urls: string[]) => void;
} & MDXEditorProps;

export default function InitializedMDXEditor({
  editorRef,
  className,
  contentEditableClassName,
  translation = mdxEditorRu,
  markdown,
  onChange,
  onImagesRemoved,
  ...props
}: InitializedMDXEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const prevMarkdownRef = useRef(markdown ?? "");

  const handleChange = (
    value: string,
    initialMarkdownNormalize: boolean,
  ) => {
    if (!initialMarkdownNormalize && onImagesRemoved) {
      const removed = diffRemovedImageUrls(prevMarkdownRef.current, value);
      if (removed.length > 0) {
        onImagesRemoved(removed);
      }
    }
    prevMarkdownRef.current = value;
    onChange?.(value, initialMarkdownNormalize);
  };

  return (
    <MDXEditor
      plugins={lessonEditorPlugins}
      translation={translation}
      className={[
        "lesson-mdx-editor mdxeditor rounded-xl border border-border bg-background text-foreground",
        isDark ? "dark-theme dark" : "light-theme",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      contentEditableClassName={[
        "prose prose-sm dark:prose-invert max-w-none min-h-[320px] px-4 py-3 text-foreground",
        contentEditableClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
      markdown={markdown ?? ""}
      onChange={handleChange}
      ref={editorRef}
    />
  );
}
