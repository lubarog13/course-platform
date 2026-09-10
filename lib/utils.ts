import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function declOfNum(val: number, variants: string[]) {
  const cases = [2, 0, 1, 1, 1, 2]
  return variants[ (val % 100 > 4 && val % 100 < 20) ? 2 : cases[(val % 10 < 5) ? val % 10 : 5] ]
}