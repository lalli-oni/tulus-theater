import type { SettingsDTO } from '@tulu/shared';
import { prisma } from '../db.js';

const KEY_PROGRESS_STATUS = 'automation.progressStatus';

export async function getSettings(): Promise<SettingsDTO> {
  const row = await prisma.appSetting.findUnique({ where: { key: KEY_PROGRESS_STATUS } });
  // On unless explicitly turned off.
  return { automation: { progressStatus: row?.value !== 'off' } };
}

export async function saveSettings(s: SettingsDTO): Promise<SettingsDTO> {
  const value = s.automation.progressStatus ? 'on' : 'off';
  await prisma.appSetting.upsert({ where: { key: KEY_PROGRESS_STATUS }, create: { key: KEY_PROGRESS_STATUS, value }, update: { value } });
  return getSettings();
}
