import "server-only";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface IngrConfig {
  clientId: string;
  token: string;
  version: string;
  build: string;
  lat: string;
  lng: string;
  country: string;
  customized: boolean;
}

const DEFAULTS = {
  clientId: process.env.INGR_CLIENT_ID || "ebe4a23e-083b-e5a8-daac-0d497f39770a",
  token: process.env.INGR_USER_TOKEN || "",
  version: process.env.INGR_CLIENT_VERSION || "1.0.2.33",
  build: process.env.INGR_CLIENT_BUILD || "33",
  lat: process.env.INGR_LAT || "39.9224934",
  lng: process.env.INGR_LNG || "41.1851039",
  country: process.env.INGR_COUNTRY || "TR",
};

const KEYS = ["clientId", "token", "version", "build", "lat", "lng", "country"] as const;
type Key = (typeof KEYS)[number];

export async function getIngrConfig(): Promise<IngrConfig> {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db.select().from(appSettings);
  } catch {
    rows = [];
  }
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const pick = (k: Key) => {
    const v = (map.get(`ingr.${k}`) || "").trim();
    return v || (DEFAULTS[k] as string);
  };
  const customized = KEYS.some((k) => (map.get(`ingr.${k}`) || "").trim() !== "");
  return {
    clientId: pick("clientId"),
    token: pick("token"),
    version: pick("version"),
    build: pick("build"),
    lat: pick("lat"),
    lng: pick("lng"),
    country: pick("country"),
    customized,
  };
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 8)}••••••••${token.slice(-4)}`;
}

export async function saveIngrConfig(input: Partial<Record<Key, string>>): Promise<void> {
  for (const k of KEYS) {
    const v = (input[k] ?? "").trim();
    if (!v) continue;
    await db
      .insert(appSettings)
      .values({ key: `ingr.${k}`, value: v, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: v, updatedAt: new Date() } });
  }
}

export async function resetIngrConfig(): Promise<void> {
  for (const k of KEYS) {
    await db.delete(appSettings).where(eq(appSettings.key, `ingr.${k}`));
  }
}
