"use client";

import type { ForwardedRef } from "react";
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
    imageAutocompleteSuggestions: [
      "https://via.placeholder.com/640x360",
      "https://via.placeholder.com/320x180",
    ],
  }),
  tablePlugin(),
  thematicBreakPlugin(),
  frontmatterPlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: "Text",
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

export default function InitializedMDXEditor({
  editorRef,
  className,
  contentEditableClassName,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      plugins={lessonEditorPlugins}
      className={[
        "lesson-mdx-editor rounded-xl border border-border bg-background",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      contentEditableClassName={[
        "prose prose-sm dark:prose-invert max-w-none min-h-[320px] px-4 py-3",
        contentEditableClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
      ref={editorRef}
    />
  );
}
