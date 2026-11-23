"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { InitializedMDXEditorProps } from "./InitializedMDXEditor";

const Editor = dynamic(() => import("./InitializedMDXEditor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex min-h-[360px] items-center justify-center rounded-xl border border-dashed text-sm">
      Загрузка редактора…
    </div>
  ),
});

type ForwardRefEditorProps = Omit<InitializedMDXEditorProps, "editorRef">;

export const ForwardRefEditor = forwardRef<MDXEditorMethods, ForwardRefEditorProps>(
  (props, ref) => <Editor {...props} editorRef={ref} />,
);

ForwardRefEditor.displayName = "ForwardRefEditor";
