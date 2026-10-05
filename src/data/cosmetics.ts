import type { AccentId, CosmeticItem, CosmeticSlot } from '@/types';

/**
 * Every cosmetic in the game. Cosmetics are purely visual — nothing here affects XP, levels or
 * progression, and nothing can be bought with real money.
 */

const sigils: CosmeticItem[] = [
  { id: 'sigil:tome', slot: 'sigil', name: 'Tome', description: 'The Scholar’s crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:bolt', slot: 'sigil', name: 'Bolt', description: 'The Athlete’s crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:quill', slot: 'sigil', name: 'Quill', description: 'The Creator’s crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:compass', slot: 'sigil', name: 'Compass', description: 'The Explorer’s crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:rook', slot: 'sigil', name: 'Rook', description: 'The Strategist’s crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:equinox', slot: 'sigil', name: 'Equinox', description: 'The Balanced crest.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:spark', slot: 'sigil', name: 'Spark', description: 'Where every journey starts.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'sigil:flame', slot: 'sigil', name: 'Flame', description: 'Kept alive by showing up.', rarity: 'uncommon', unlock: { type: 'level', level: 5 } },
  { id: 'sigil:crescent', slot: 'sigil', name: 'Crescent', description: 'Calm, steady, rising.', rarity: 'uncommon', unlock: { type: 'level', level: 10 } },
  { id: 'sigil:wave', slot: 'sigil', name: 'Tide', description: 'Momentum that keeps coming back.', rarity: 'rare', unlock: { type: 'shop', price: 300 } },
  { id: 'sigil:prism', slot: 'sigil', name: 'Prism', description: 'One light, many colors.', rarity: 'rare', unlock: { type: 'shop', price: 450 } },
  { id: 'sigil:crown', slot: 'sigil', name: 'Crown', description: 'Earned, never given.', rarity: 'epic', unlock: { type: 'level', level: 25 } },
  { id: 'sigil:oracle', slot: 'sigil', name: 'Oracle', description: 'Sees the long game.', rarity: 'epic', unlock: { type: 'shop', price: 800, minLevel: 8 } },
  { id: 'sigil:hexcore', slot: 'sigil', name: 'Hexcore', description: 'Forged by thirty days of fire.', rarity: 'epic', unlock: { type: 'achievement', achievementId: 'dedicated' } },
  { id: 'sigil:phoenix', slot: 'sigil', name: 'Phoenix', description: 'Every reset is a rebirth.', rarity: 'legendary', unlock: { type: 'shop', price: 2000, minLevel: 20 } },
  { id: 'sigil:infinity', slot: 'sigil', name: 'Infinity', description: 'For those who reached one hundred.', rarity: 'mythic', unlock: { type: 'achievement', achievementId: 'century' } },
];

const backgrounds: CosmeticItem[] = [
  { id: 'bg:void', slot: 'background', name: 'Void', description: 'Quiet and dark.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'bg:midnight', slot: 'background', name: 'Midnight', description: 'Deep blue night.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'bg:nebula', slot: 'background', name: 'Nebula', description: 'Violet starlight.', rarity: 'uncommon', unlock: { type: 'level', level: 3 } },
  { id: 'bg:ember', slot: 'background', name: 'Ember', description: 'Warm forge glow.', rarity: 'uncommon', unlock: { type: 'shop', price: 250 } },
  { id: 'bg:aurora', slot: 'background', name: 'Aurora', description: 'Northern lights.', rarity: 'rare', unlock: { type: 'shop', price: 350 } },
  { id: 'bg:abyss', slot: 'background', name: 'Abyss', description: 'Cold deep water.', rarity: 'rare', unlock: { type: 'level', level: 12 } },
  { id: 'bg:gilded', slot: 'background', name: 'Gilded', description: 'Polished gold.', rarity: 'epic', unlock: { type: 'shop', price: 900 } },
  { id: 'bg:harvest', slot: 'background', name: 'Harvest Moon', description: 'From The Grind event.', rarity: 'epic', unlock: { type: 'event', eventId: 'the_grind' } },
  { id: 'bg:prismatic', slot: 'background', name: 'Prismatic', description: 'Every color at once.', rarity: 'legendary', unlock: { type: 'shop', price: 1800, minLevel: 15 } },
];

const frames: CosmeticItem[] = [
  { id: 'frame:simple', slot: 'frame', name: 'Simple Ring', description: 'Clean and classic.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'frame:hex', slot: 'frame', name: 'Hex Frame', description: 'Six sides, zero excuses.', rarity: 'uncommon', unlock: { type: 'level', level: 5 } },
  { id: 'frame:cyber', slot: 'frame', name: 'Cyber Frame', description: 'Segmented HUD ring.', rarity: 'rare', unlock: { type: 'shop', price: 500 } },
  { id: 'frame:laurel', slot: 'frame', name: 'Laurel', description: 'For the consistent.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'consistent' } },
  { id: 'frame:runic', slot: 'frame', name: 'Runic Ring', description: 'Etched with old marks.', rarity: 'rare', unlock: { type: 'level', level: 15 } },
  { id: 'frame:crystal', slot: 'frame', name: 'Crystal Frame', description: 'Faceted and bright.', rarity: 'epic', unlock: { type: 'shop', price: 750 } },
  { id: 'frame:grind', slot: 'frame', name: 'Grindstone', description: 'From The Grind event.', rarity: 'epic', unlock: { type: 'event', eventId: 'the_grind' } },
  { id: 'frame:gilded', slot: 'frame', name: 'Gilded Frame', description: 'Heavy gold filigree.', rarity: 'legendary', unlock: { type: 'shop', price: 1200, minLevel: 10 } },
  { id: 'frame:mythic', slot: 'frame', name: 'Mythic Prism', description: 'Reserved for Level 100.', rarity: 'mythic', unlock: { type: 'level', level: 100 } },
];

const auras: CosmeticItem[] = [
  { id: 'aura:none', slot: 'aura', name: 'None', description: 'No effect.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'aura:glow', slot: 'aura', name: 'Glow', description: 'A soft accent glow.', rarity: 'uncommon', unlock: { type: 'level', level: 4 } },
  { id: 'aura:pulse', slot: 'aura', name: 'Pulse', description: 'A slow heartbeat ring.', rarity: 'rare', unlock: { type: 'shop', price: 400 } },
  { id: 'aura:orbit', slot: 'aura', name: 'Orbit', description: 'Two motes in orbit.', rarity: 'epic', unlock: { type: 'shop', price: 700 } },
  { id: 'aura:halo', slot: 'aura', name: 'Halo', description: 'Awarded for a 30-day streak.', rarity: 'epic', unlock: { type: 'achievement', achievementId: 'dedicated' } },
  { id: 'aura:embers', slot: 'aura', name: 'Embers', description: 'Rising sparks.', rarity: 'legendary', unlock: { type: 'shop', price: 1100, minLevel: 12 } },
];

const xpEffects: CosmeticItem[] = [
  { id: 'xp:standard', slot: 'xpEffect', name: 'Standard', description: 'XP in your accent color.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'xp:plasma', slot: 'xpEffect', name: 'Plasma XP', description: 'Cyan-violet energy.', rarity: 'rare', unlock: { type: 'shop', price: 600 } },
  { id: 'xp:ember', slot: 'xpEffect', name: 'Ember XP', description: 'Warm, crackling gains.', rarity: 'rare', unlock: { type: 'shop', price: 600 } },
  { id: 'xp:golden', slot: 'xpEffect', name: 'Golden XP Effect', description: 'Every gain glitters.', rarity: 'epic', unlock: { type: 'shop', price: 1000 } },
  { id: 'xp:frost', slot: 'xpEffect', name: 'Frost XP', description: 'Crisp and cold.', rarity: 'epic', unlock: { type: 'level', level: 20 } },
  { id: 'xp:prismatic', slot: 'xpEffect', name: 'Prismatic XP', description: 'Light split into every color.', rarity: 'legendary', unlock: { type: 'shop', price: 2400, minLevel: 25 } },
];

const uiEffects: CosmeticItem[] = [
  { id: 'fx:sparks', slot: 'uiEffect', name: 'Sparks', description: 'Bright sparks on completion.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'fx:ripple', slot: 'uiEffect', name: 'Shockwave', description: 'A clean expanding ring.', rarity: 'uncommon', unlock: { type: 'level', level: 8 } },
  { id: 'fx:shards', slot: 'uiEffect', name: 'Shards', description: 'Crystal fragments burst out.', rarity: 'rare', unlock: { type: 'shop', price: 400 } },
  { id: 'fx:starfall', slot: 'uiEffect', name: 'Starfall', description: 'Stars shower down.', rarity: 'epic', unlock: { type: 'shop', price: 700 } },
];

const themes: CosmeticItem[] = [
  { id: 'theme:electric', slot: 'theme', name: 'Electric', description: 'Blue-violet energy.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:cyan', slot: 'theme', name: 'Cyan', description: 'Clean and cool.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:emerald', slot: 'theme', name: 'Emerald', description: 'Fresh growth.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:amber', slot: 'theme', name: 'Amber', description: 'Warm focus.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:crimson', slot: 'theme', name: 'Crimson', description: 'Bold intensity.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:violet', slot: 'theme', name: 'Violet', description: 'Dreamy and bright.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'theme:mono', slot: 'theme', name: 'Monochrome', description: 'Pure contrast, no color.', rarity: 'rare', unlock: { type: 'level', level: 15 } },
  { id: 'theme:synth', slot: 'theme', name: 'Synthwave', description: 'Neon dusk, tuned to stay calm.', rarity: 'epic', unlock: { type: 'shop', price: 1200 } },
  { id: 'theme:aurum', slot: 'theme', name: 'Obsidian Gold', description: 'Black stone, gold light.', rarity: 'legendary', unlock: { type: 'shop', price: 1500, minLevel: 10 } },
];

const titles: CosmeticItem[] = [
  { id: 'title:novice', slot: 'title', name: 'The Novice', description: 'Every legend starts here.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'title:getting_started', slot: 'title', name: 'Getting Started', description: 'Reach Level 3.', rarity: 'common', unlock: { type: 'level', level: 3 } },
  { id: 'title:early_bird', slot: 'title', name: 'The Early Bird', description: 'Unlocked by Early Riser.', rarity: 'uncommon', unlock: { type: 'achievement', achievementId: 'early_riser' } },
  { id: 'title:consistent', slot: 'title', name: 'The Consistent', description: 'Unlocked by a 7-day streak.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'consistent' } },
  { id: 'title:disciplined', slot: 'title', name: 'The Disciplined', description: 'Unlocked by Dependable.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'dependable' } },
  { id: 'title:scholar', slot: 'title', name: 'The Scholar', description: 'Unlocked by Scholar.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'scholar' } },
  { id: 'title:athlete', slot: 'title', name: 'The Athlete', description: 'Unlocked by Athlete.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'athlete' } },
  { id: 'title:creator', slot: 'title', name: 'The Creator', description: 'Unlocked by Creator.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'creator' } },
  { id: 'title:explorer', slot: 'title', name: 'The Explorer', description: 'Unlocked by Polymath.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'polymath' } },
  { id: 'title:strategist', slot: 'title', name: 'The Strategist', description: 'Unlocked by Goal Crusher.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'goal_crusher' } },
  { id: 'title:calm', slot: 'title', name: 'The Calm', description: 'Unlocked by Still Mind.', rarity: 'uncommon', unlock: { type: 'achievement', achievementId: 'still_mind' } },
  { id: 'title:resilient', slot: 'title', name: 'The Resilient', description: 'Unlocked by Comeback.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'comeback' } },
  { id: 'title:veteran', slot: 'title', name: 'The Veteran', description: 'Unlocked by Veteran.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'veteran' } },
  { id: 'title:grinder', slot: 'title', name: 'The Grinder', description: 'From The Grind event.', rarity: 'epic', unlock: { type: 'event', eventId: 'the_grind' } },
  { id: 'title:boss_slayer', slot: 'title', name: 'Boss Slayer', description: 'Unlocked by Boss Slayer.', rarity: 'epic', unlock: { type: 'achievement', achievementId: 'boss_slayer' } },
  { id: 'title:unstoppable', slot: 'title', name: 'The Unstoppable', description: 'A title worth saving for.', rarity: 'epic', unlock: { type: 'shop', price: 1500, minLevel: 10 } },
  { id: 'title:master', slot: 'title', name: 'The Master', description: 'Reach Level 50.', rarity: 'legendary', unlock: { type: 'level', level: 50 } },
  { id: 'title:legend', slot: 'title', name: 'The Legend', description: 'Reach Level 75.', rarity: 'legendary', unlock: { type: 'level', level: 75 } },
  { id: 'title:mythic', slot: 'title', name: 'The Mythic', description: 'Reach Level 100.', rarity: 'mythic', unlock: { type: 'level', level: 100 } },
];

const badges: CosmeticItem[] = [
  { id: 'badge:spark', slot: 'badge', name: 'Spark', description: 'Your first badge.', rarity: 'common', unlock: { type: 'default' } },
  { id: 'badge:dawn', slot: 'badge', name: 'Dawn', description: 'Unlocked by Early Riser.', rarity: 'uncommon', unlock: { type: 'achievement', achievementId: 'early_riser' } },
  { id: 'badge:flame', slot: 'badge', name: 'Streak Flame', description: 'Unlocked by a 7-day streak.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'consistent' } },
  { id: 'badge:seal', slot: 'badge', name: 'Scholar’s Seal', description: 'Unlocked by Scholar.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'scholar' } },
  { id: 'badge:iron', slot: 'badge', name: 'Iron Will', description: 'Unlocked by Athlete.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'athlete' } },
  { id: 'badge:muse', slot: 'badge', name: 'Muse', description: 'Unlocked by Creator.', rarity: 'rare', unlock: { type: 'achievement', achievementId: 'creator' } },
  { id: 'badge:star', slot: 'badge', name: 'North Star', description: 'A guiding light.', rarity: 'rare', unlock: { type: 'shop', price: 250 } },
  { id: 'badge:grind', slot: 'badge', name: 'The Grind', description: 'Special badge from the October event.', rarity: 'epic', unlock: { type: 'event', eventId: 'the_grind' } },
  { id: 'badge:swords', slot: 'badge', name: 'Crossed Swords', description: 'Unlocked by Boss Slayer.', rarity: 'epic', unlock: { type: 'achievement', achievementId: 'boss_slayer' } },
  { id: 'badge:laurel', slot: 'badge', name: 'Champion’s Laurel', description: 'Unlocked by Champion.', rarity: 'epic', unlock: { type: 'achievement', achievementId: 'champion' } },
  { id: 'badge:diamond', slot: 'badge', name: 'Diamond', description: 'Rare and unbreakable.', rarity: 'epic', unlock: { type: 'shop', price: 900, minLevel: 6 } },
  { id: 'badge:dawn_year', slot: 'badge', name: 'First Light', description: 'From the New Year event.', rarity: 'epic', unlock: { type: 'event', eventId: 'new_year' } },
  { id: 'badge:bloom', slot: 'badge', name: 'Bloom', description: 'From the Spring Reset event.', rarity: 'epic', unlock: { type: 'event', eventId: 'spring_reset' } },
  { id: 'badge:sun', slot: 'badge', name: 'Solstice', description: 'From the Solstice Trials event.', rarity: 'epic', unlock: { type: 'event', eventId: 'solstice' } },
  { id: 'badge:snow', slot: 'badge', name: 'Winterlight', description: 'From the Winter Focus event.', rarity: 'epic', unlock: { type: 'event', eventId: 'winter_focus' } },
  { id: 'badge:crown', slot: 'badge', name: 'Crown', description: 'Reach Level 100.', rarity: 'mythic', unlock: { type: 'level', level: 100 } },
];

export const COSMETICS: CosmeticItem[] = [...sigils, ...backgrounds, ...frames, ...auras, ...xpEffects, ...uiEffects, ...themes, ...titles, ...badges];
export const COSMETIC_MAP = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<string, CosmeticItem>;

export const SLOT_LABEL: Record<CosmeticSlot, string> = {
  sigil: 'Avatars',
  background: 'Backgrounds',
  frame: 'Profile frames',
  aura: 'Avatar effects',
  xpEffect: 'XP animations',
  uiEffect: 'UI effects',
  theme: 'Themes',
  title: 'Titles',
  badge: 'Badges',
};

export const SLOT_ORDER: CosmeticSlot[] = ['sigil', 'background', 'frame', 'aura', 'title', 'badge', 'xpEffect', 'uiEffect', 'theme'];

export const DEFAULT_ITEMS = COSMETICS.filter((c) => c.unlock.type === 'default').map((c) => c.id);

/** Badge glyphs (icon names) used when rendering badges. */
export const BADGE_ICON: Record<string, string> = {
  'badge:spark': 'sparkle',
  'badge:dawn': 'sunrise',
  'badge:flame': 'flame',
  'badge:seal': 'graduation-cap',
  'badge:iron': 'dumbbell',
  'badge:muse': 'palette',
  'badge:star': 'star',
  'badge:grind': 'cog',
  'badge:swords': 'swords',
  'badge:laurel': 'award',
  'badge:diamond': 'diamond',
  'badge:dawn_year': 'sunrise',
  'badge:bloom': 'flower',
  'badge:sun': 'sun',
  'badge:snow': 'snowflake',
  'badge:crown': 'crown',
};

export function themeAccent(itemId: string): AccentId {
  return itemId.replace('theme:', '') as AccentId;
}

export function slotOf(itemId: string): CosmeticSlot | null {
  return COSMETIC_MAP[itemId]?.slot ?? null;
}

export function itemKey(itemId: string): string {
  return itemId.slice(itemId.indexOf(':') + 1);
}
