import { HealthSchema, type Health } from '@tulu/shared';

async function getJson<T>(url: string, parse: (v: unknown) => T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return parse(await res.json());
}

export const api = {
  health: (): Promise<Health> => getJson('/api/health', (v) => HealthSchema.parse(v)),
};
