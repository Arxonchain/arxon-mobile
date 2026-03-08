import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms = 12_000,
  message = "Request timed out. Please try again."
): Promise<T> {
  let timeoutId: number | null = null;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    // Promise.resolve converts Supabase PostgrestBuilder (thenable) into a real Promise.
    return (await Promise.race([Promise.resolve(promiseLike), timeout])) as T;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}


