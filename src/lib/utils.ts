import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCfs(value: number): string {
  return `${value.toFixed(value < 10 ? 1 : 0)} cfs`;
}

export function formatAcFt(value: number): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ac-ft`;
}
