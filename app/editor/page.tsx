import EditorView from "@/components/editor/EditorView";
import { getCertificateTemplatesList } from "../lib/courses";
export default function EditorPage() {
  const certificateTemplates = getCertificateTemplatesList();
  return <div className="container mx-auto min-h-screen py-4 px-4">
    <EditorView certificateTemplates={certificateTemplates} />
  </div>;
}