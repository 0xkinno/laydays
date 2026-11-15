"use client";
const OWNER = (process.env.NEXT_PUBLIC_OWNER_ADDRESS ?? "").toLowerCase();
const CHARTERER = (process.env.NEXT_PUBLIC_CHARTERER_ADDRESS ?? "").toLowerCase();

/** Role of a connected wallet in the demo voyage. Any other wallet has no role until it opens its own claim. */
export function useRole(address?: string): "Owner" | "Charterer" | null {
  const a = address?.toLowerCase();
  if (!a) return null;
  if (a === OWNER) return "Owner";
  if (a === CHARTERER) return "Charterer";
  return null;
}
