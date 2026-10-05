import type { GameState, MediaRecord } from '@/types';
import { SCHEMA_VERSION } from '@/data/defaults';
import { formatNumber } from '@/lib/format';
import { normalizeState, type RawState } from './normalize';
import { blobToDataURL, dataURLToBlob, type StorageAdapter } from './storage';

/** The JSON backup format. Everything the player owns, in one portable file. */
export interface BackupFile {
  app: 'evolve';
  format: 1;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  data: RawState;
  media: { id: string; type: string; width: number; height: number; createdAt: number; dataUrl: string }[];
}

export const BACKUP_FORMAT = 1;

export async function createBackup(state: GameState, storage: StorageAdapter | null): Promise<BackupFile> {
  const referenced = new Set(state.journal.flatMap((j) => j.photoIds));
  const media: BackupFile['media'] = [];
  if (storage) {
    for (const rec of await storage.allMedia()) {
      if (!referenced.has(rec.id)) continue;
      media.push({ id: rec.id, type: rec.type, width: rec.width, height: rec.height, createdAt: rec.createdAt, dataUrl: await blobToDataURL(rec.blob) });
    }
  }
  return {
    app: 'evolve',
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    exportedAt: new Date().toISOString(),
    data: {
      profile: state.profile,
      settings: state.settings,
      meta: state.meta,
      session: state.session,
      quests: state.quests,
      activities: state.activities,
      transactions: state.transactions,
      achievements: state.achievements,
      goals: state.goals,
      journal: state.journal,
      party: state.party,
      challenges: state.challenges,
      weeklies: state.weeklies,
    },
    media,
  };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `evolve-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export interface ImportSummary {
  name: string;
  level: number;
  totalXP: number;
  quests: number;
  activities: number;
  achievements: number;
  photos: number;
  exportedAt: string | null;
  skipped: number;
}

export type ParsedBackup =
  | { ok: true; state: GameState; media: MediaRecord[]; summary: ImportSummary; summaryText: string }
  | { ok: false; error: string };

const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

/** Validate and parse a backup file. Never throws — returns a friendly error instead. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'This file is too large to be an Evolve backup.' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file isn’t valid JSON. Choose a backup exported from Evolve.' };
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return { ok: false, error: 'This doesn’t look like an Evolve backup.' };
  const file = json as Partial<BackupFile> & { app?: string };
  if (file.app !== 'evolve' && file.app !== 'real-life-xp') return { ok: false, error: 'This doesn’t look like an Evolve backup.' };
  if (typeof file.format === 'number' && file.format > BACKUP_FORMAT) {
    return { ok: false, error: 'This backup was made by a newer version of Evolve. Update the app and try again.' };
  }
  if (typeof file.data !== 'object' || file.data === null) return { ok: false, error: 'The backup is missing its data.' };

  const { state, skipped } = normalizeState(file.data as RawState);
  if (!state.profile) return { ok: false, error: 'This backup doesn’t contain a character.' };

  const referenced = new Set(state.journal.flatMap((j) => j.photoIds));
  const media: MediaRecord[] = [];
  for (const m of Array.isArray(file.media) ? file.media : []) {
    if (!m || typeof m.id !== 'string' || typeof m.dataUrl !== 'string' || !referenced.has(m.id)) continue;
    if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(m.dataUrl)) continue;
    try {
      media.push({
        id: m.id,
        blob: dataURLToBlob(m.dataUrl),
        type: String(m.type || 'image/jpeg'),
        width: Number(m.width) || 0,
        height: Number(m.height) || 0,
        createdAt: Number(m.createdAt) || Date.now(),
      });
    } catch {
      // A corrupt photo is skipped; the rest of the backup still imports.
    }
  }
  const mediaIds = new Set(media.map((m) => m.id));
  state.journal = state.journal.map((j) => ({ ...j, photoIds: j.photoIds.filter((id) => mediaIds.has(id)) }));

  const summary: ImportSummary = {
    name: state.profile.name,
    level: state.profile.level,
    totalXP: state.profile.totalXP,
    quests: state.transactions.filter((t) => t.currency === 'xp' && t.source === 'quest').length,
    activities: state.activities.length,
    achievements: state.achievements.length,
    photos: media.length,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
    skipped,
  };
  const summaryText = `${summary.name} · Level ${summary.level} · ${formatNumber(summary.totalXP)} XP · ${formatNumber(summary.activities)} activities`;
  return { ok: true, state, media, summary, summaryText };
}
