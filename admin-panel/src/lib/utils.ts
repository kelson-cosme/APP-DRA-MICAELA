import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeFilename(filename: string) {
  const extension = filename.split('.').pop();
  const nameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
  
  // Remove special characters, accents, and replace spaces with dashes
  const sanitized = nameWithoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-zA-Z0-9]/g, "-") // replace non-alphanumeric with -
    .replace(/-+/g, "-") // collapse multiple -
    .replace(/^-|-$/g, ""); // trim - from start/end

  return `${sanitized}.${extension}`;
}
