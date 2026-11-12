"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function CertificateModal({ open, setOpen, courseId }: { open: boolean, setOpen: (open: boolean) => void, courseId: number }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {data: session} = useSession();
    const handleDownloadCertificate = async () => {
        
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/certificate/`, {
            method: "POST",
            body: JSON.stringify({
              courseId,
              userId: Number(session?.user?.id),
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error);
          }
        const filename = typeof data?.file?.url === "string" ? data.file.url.split("/").pop() : null;
        if (!filename) {
          throw new Error("Не удалось получить имя файла");
        }
        window.open(`/api/uploads/${encodeURIComponent(filename)}`, "_blank");
        setOpen(false);
    } catch (error) {
          setError(error instanceof Error ? error.message : "Не удалось сгенерировать сертификат");
        } finally {
          setLoading(false);
        }
      };
    return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
        <img src="/images/course_complete.png" alt="Certificate" className="aspect-video object-contain w-full max-w-full mb-4" />
          <DialogTitle>Поздравляем! Вы завершили курс</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Вы успешно завершили курс и теперь вам доступен сертификат. Все сертификаты доступны на странице <Link href="/user/certificates">сертификатов</Link>.
        </DialogDescription>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={loading}>{loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : ""}Получить сертификат</Button>
        </DialogFooter>
        {error && <p className="mb-3 text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {error}
          </p>}
      </DialogContent>
    </Dialog>
  );
}