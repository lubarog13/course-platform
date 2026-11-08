"use client";
import { CertificateDto } from "@/app/lib/certificate";
import { Button } from "../ui/button";
import { Item, ItemContent, ItemTitle, ItemDescription, ItemMedia, ItemActions, ItemFooter } from "../ui/item";
import { FileBadge as CertificateIcon, Loader2 } from 'lucide-react';

import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import {useSession} from "next-auth/react";

export default function CertificateBanner({ courseId, bannerTitle, bannerDescription, buttonText, cashed = true }: { courseId: number, bannerTitle: string, bannerDescription: string, buttonText: string, cashed?: boolean }) {
  const [certificate, setCertificate] = useState<CertificateDto | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
const {data: session} = useSession();


  const handleDownloadCertificate = async () => {
    if (cashed && certificate) {
        const filename = typeof certificate.file?.url === "string" ? certificate.file.url.split("/").pop() : null;
        if (!filename) {
            throw new Error("Не удалось получить имя файла");
        }
        setCertificateUrl(`/api/uploads/${encodeURIComponent(filename)}`);
        window.open(`/api/uploads/${encodeURIComponent(filename)}`, "_blank");
        return;
    }
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
      setCertificate(data);
    const filename = typeof data?.file?.url === "string" ? data.file.url.split("/").pop() : null;
    if (!filename) {
      throw new Error("Не удалось получить имя файла");
    }
    setCertificateUrl(`/api/uploads/${encodeURIComponent(filename)}`);
    window.open(`/api/uploads/${encodeURIComponent(filename)}`, "_blank");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сгенерировать сертификат");
    } finally {
      setLoading(false);
    }
  };

  return <>
  {error && <p className="mb-3 text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            {error}
          </p>}
  <Item variant="outline" className="w-full">
    <ItemMedia>
        <CertificateIcon className="size-4" />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>{bannerTitle}</ItemTitle>
      <ItemDescription>{bannerDescription}</ItemDescription>
    </ItemContent>
    <ItemActions>
        <Button disabled={loading} onClick={handleDownloadCertificate}>{
            loading ? <Loader2 className="size-4 mr-2" /> : <DownloadIcon className="size-4 mr-2" />
        } {buttonText}</Button>
    </ItemActions>
    {certificateUrl && <ItemFooter>
        <iframe src={certificateUrl}  className="w-full max-w-full h-auto" />
    </ItemFooter>}
  </Item>
  </>;
}