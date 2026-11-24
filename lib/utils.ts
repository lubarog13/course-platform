import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { File as FileModel } from "@/app/lib/models";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function declOfNum(val: number, variants: string[]) {
  const cases = [2, 0, 1, 1, 1, 2]
  return variants[ (val % 100 > 4 && val % 100 < 20) ? 2 : cases[(val % 10 < 5) ? val % 10 : 5] ]
}

export function getFio(surname: string, name: string, patronymic?: string) {
  return `${surname} ${name} ${patronymic ? patronymic : ''}`.trim();
}

export function filePublicUrl(url?: string, file?: Pick<FileModel, "url">): string | undefined {
  const filename = 
  file? 
  typeof file.url === "string" ? file.url.split(/[/\\]/).pop() : undefined :
  url ? url.split(/[/\\]/).pop() : undefined;
  return filename ? `/api/uploads/${encodeURIComponent(filename)}` : undefined;
}