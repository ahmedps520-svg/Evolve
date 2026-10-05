import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types';
import { emptyState } from '@/data/defaults';
import { addDays, diffDays, toDateKey, weekStart } from '@/lib/date';
import { calculateLevel, calculateRequiredXP, calculateXPProgress, totalXPForLevel } from '@/lib/xp';
import {
  activeEvents,
  canTakeRestDay,
  challengeProgress,
  claimWeekly,
  completeOnboarding,
  completeQuest,
  createGoal,
  createQuest,
  equipItem,
  finishSession,
  generateDailyQuests,
  healthyMinutes,
  logActivity,
  pauseSession,
  progressQuest,
  purchaseItem,
  questsForToday,
  resumeSession,
  rerollQuest,
  setGoalProgress,
  startSession,
  syncDay,
  takeRestDay,
  toggleMilestone,
  updateProfile,
  updateSettings,
} from './index';

/** Local-time timestamp helper: (y, m, d, h, min). */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const xpOf = (s: GameState) => s.profile!.totalXP;

function onboard(now = at(2026, 10, 5, 9), difficulty: 'casual' | 'normal' | 'hardcore' = 'normal') {
  return completeOnboarding(emptyState(), { name: 'Ahmed', focusAreas: ['studying', 'fitness', 'reading'], difficulty, classId: 'scholar' }, now).state;
}

describe('level curve', () => {
  it('follows XP_REQUIRED = round(100 × level^1.35)', () => {
    expect(calculateRequiredXP(1)).toBe(100);
    expect(calculateRequiredXP(2)).toBe(Math.round(100 * 2 ** 1.35));
    expect(calculateRequiredXP(12)).toBe(Math.round(100 * 12 ** 1.35));
  });

  it('maps total XP to levels and progress', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(totalXPForLevel(18))).toBe(18);
    expect(calculateLevel(totalXPForLevel(18) - 1)).toBe(17);
    const p = calculateXPProgress(totalXPForLevel(5) + 10);
    expect(p.level).toBe(5);
    expect(p.current).toBe(10);
    expect(p.required).toBe(calculateRequiredXP(5));
    expect(p.percent).toBeGreaterThan(0);
  });

  it('is strictly increasing', () => {
    for (let l = 1; l < 200; l++) expect(calculateRequiredXP(l + 1)).toBeGreaterThan(calculateRequiredXP(l));
  });
});

describe('dates', () => {
  it('handles DST transitions without skipping days', () => {
    // US DST ends Nov 1 2026 and starts Mar 8 2026 (America/New_York set in vitest config).
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
    expect(diffDays('2026-10-25', '2026-11-08')).toBe(14);
  });

  it('computes local week starts', () => {
    expect(weekStart('2026-10-05', 1)).toBe('2026-10-05'); // Monday
    expect(weekStart('2026-10-11', 1)).toBe('2026-10-05'); // Sunday → previous Monday
    expect(weekStart('2026-10-11', 0)).toBe('2026-10-11'); // Sunday-start weeks
  });
});

describe('onboarding', () => {
  it('starts at level 1 with 0 XP, 100 coins, 3 starter quests and 1 achievement', () => {
    const s = onboard();
    expect(s.profile!.level).toBe(1);
    expect(s.profile!.totalXP).toBe(0);
    expect(s.profile!.coins).toBe(100);
    expect(s.quests).toHaveLength(3);
    expect(s.quests.every((q) => q.kind === 'starter')).toBe(true);
    expect(s.achievements.map((a) => a.id)).toEqual(['journey_begins']);
    expect(s.weeklies).toHaveLength(1);
    expect(s.weeklies[0].challenges).toHaveLength(3);
    expect(s.weeklies[0].challenges[0].bossId).toBeTruthy();
  });

  it('uses the classic starter trio for study/fitness/reading players', () => {
    const s = onboard();
    expect(s.quests.map((q) => [q.title, q.xpReward])).toEqual([
      ['Study Session', 100],
      ['Move', 80],
      ['Read', 50],
    ]);
  });
});

describe('quests and XP', () => {
  it('completing a quest awards XP, levels up, pays coins and unlocks First Step', () => {
    let s = onboard();
    const quest = s.quests.find((q) => q.title === 'Study Session')!;
    const res = logActivity(s, { category: 'study', duration: 30, questId: quest.id }, at(2026, 10, 5, 10));
    s = res.state;
    // 30 XP (activity) + 100 XP (quest) + 25 XP (First Step) + 25 (Field Notes)
    expect(xpOf(s)).toBe(30 + 100 + 25 + 25);
    expect(s.profile!.level).toBe(2);
    expect(s.quests.find((q) => q.id === quest.id)!.completed).toBe(true);
    expect(s.achievements.map((a) => a.id)).toEqual(expect.arrayContaining(['first_step', 'field_notes']));
    expect(res.events.some((e) => e.type === 'levelUp' && e.to === 2 && e.coins === 50)).toBe(true);
    expect(res.events.some((e) => e.type === 'questComplete')).toBe(true);
    // 100 starter + 50 level + 10 + 10 achievement coins
    expect(s.profile!.coins).toBe(170);
    // Every XP gain is a transaction
    const sum = s.transactions.filter((t) => t.currency === 'xp').reduce((a, t) => a + t.amount, 0);
    expect(sum).toBe(xpOf(s));
  });

  it('auto-progresses matching minute quests from logged activities', () => {
    let s = onboard();
    s = logActivity(s, { category: 'reading', duration: 10 }, at(2026, 10, 5, 11)).state;
    const read = s.quests.find((q) => q.title === 'Read')!;
    expect(read.progress).toBe(10);
    expect(read.completed).toBe(false);
    s = logActivity(s, { category: 'reading', duration: 10 }, at(2026, 10, 5, 11, 30)).state;
    expect(s.quests.find((q) => q.id === read.id)!.completed).toBe(true);
  });

  it('progresses count-based quests and completes at target', () => {
    let s = onboard();
    s = createQuest(s, { title: 'Read 20 pages', category: 'reading', difficulty: 'medium', target: { amount: 20, unit: 'pages' } }, at(2026, 10, 5, 9)).state;
    const q = s.quests.find((x) => x.title === 'Read 20 pages')!;
    s = progressQuest(s, q.id, 12, at(2026, 10, 5, 10)).state;
    expect(s.quests.find((x) => x.id === q.id)!.progress).toBe(12);
    const res = progressQuest(s, q.id, 12, at(2026, 10, 5, 10, 5));
    expect(res.state.quests.find((x) => x.id === q.id)!.completed).toBe(true);
    expect(res.events.find((e) => e.type === 'questComplete')).toBeTruthy();
  });

  it('prevents absurd custom XP values', () => {
    const s = onboard();
    const res = createQuest(s, { title: 'Drink water', category: 'custom', difficulty: 'easy', xpReward: 500_000 }, at(2026, 10, 5, 9));
    const q = res.state.quests.find((x) => x.title === 'Drink water')!;
    expect(q.xpReward).toBe(60);
    const legendary = createQuest(s, { title: 'Marathon', category: 'running', difficulty: 'legendary', xpReward: 999_999 }, at(2026, 10, 5, 9));
    expect(legendary.state.quests.find((x) => x.title === 'Marathon')!.xpReward).toBe(1000);
    expect(createQuest(s, { title: '   ', category: 'custom', difficulty: 'easy' }, at(2026, 10, 5)).error).toBeTruthy();
  });

  it('cannot complete the same quest twice', () => {
    let s = onboard();
    s = createQuest(s, { title: 'Clean my room', category: 'cleaning', difficulty: 'easy' }, at(2026, 10, 5, 9)).state;
    const q = s.quests.find((x) => x.title === 'Clean my room')!;
    s = completeQuest(s, q.id, at(2026, 10, 5, 10)).state;
    const again = completeQuest(s, q.id, at(2026, 10, 5, 10, 1));
    expect(again.error).toBeTruthy();
    expect(again.state).toBe(s);
  });
});

describe('healthy limits and momentum', () => {
  it('halves XP past the soft cap and stops it past the hard cap', () => {
    expect(healthyMinutes(0, 120, 90, 150)).toEqual({ effective: 105, level: 'soft' });
    expect(healthyMinutes(120, 60, 90, 150)).toEqual({ effective: 15, level: 'hard' });
    expect(healthyMinutes(0, 30, 90, 150)).toEqual({ effective: 30, level: 'none' });
    let s = onboard();
    const res = logActivity(s, { category: 'exercise', duration: 200 }, at(2026, 10, 5, 10));
    s = res.state;
    const a = s.activities[0];
    // 90 full + 60 half = 120 effective minutes × 12 XP / 10 min
    expect(a.xpEarned).toBe(144);
    expect(a.capped).toBe(true);
    expect(res.events.some((e) => e.type === 'healthyCap' && e.level === 'hard')).toBe(true);
  });

  it('rejects absurd durations', () => {
    const s = onboard();
    expect(logActivity(s, { category: 'study', duration: 6000 }, at(2026, 10, 5)).error).toBeTruthy();
    expect(logActivity(s, { category: 'study', duration: 0 }, at(2026, 10, 5)).error).toBeTruthy();
  });

  it('builds a capped momentum multiplier for back-to-back sessions', () => {
    let s = onboard();
    const t0 = at(2026, 10, 5, 13);
    const multipliers: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = logActivity(s, { category: 'coding', duration: 20 }, t0 + i * 30 * 60_000);
      s = res.state;
      const m = res.events.find((e) => e.type === 'momentum');
      multipliers.push(m && m.type === 'momentum' ? m.multiplier : 1);
    }
    expect(multipliers).toEqual([1, 1.05, 1.1, 1.15, 1.15]);
    expect(s.transactions.filter((t) => t.source === 'momentum').length).toBe(4);
    // The chain breaks after a long gap.
    const later = logActivity(s, { category: 'coding', duration: 20 }, t0 + 8 * 60 * 60_000);
    expect(later.events.some((e) => e.type === 'momentum')).toBe(false);
  });
});

describe('daily goal', () => {
  it('awards the bonus once per day', () => {
    let s = onboard(at(2026, 10, 5, 8), 'casual'); // 200 XP goal
    s = logActivity(s, { category: 'study', duration: 120 }, at(2026, 10, 5, 12)).state;
    const bonus = () => s.transactions.filter((t) => t.source === 'daily_goal' && t.currency === 'xp');
    expect(bonus()).toHaveLength(1);
    expect(bonus()[0].amount).toBe(50);
    s = logActivity(s, { category: 'study', duration: 60 }, at(2026, 10, 5, 16)).state;
    expect(bonus()).toHaveLength(1);
  });

  it('lowering the goal below today’s XP completes it', () => {
    let s = onboard();
    s = logActivity(s, { category: 'study', duration: 60 }, at(2026, 10, 5, 12)).state;
    s = updateProfile(s, { dailyGoal: 100 }, at(2026, 10, 5, 13)).state;
    expect(s.transactions.some((t) => t.source === 'daily_goal')).toBe(true);
  });
});

describe('streaks and rest days', () => {
  it('counts consecutive active days and never breaks on the current day', () => {
    let s = onboard(at(2026, 10, 1, 9));
    for (const d of [1, 2, 3]) {
      s = syncDay(s, at(2026, 10, d, 8)).state;
      s = logActivity(s, { category: 'reading', duration: 15 }, at(2026, 10, d, 20)).state;
    }
    expect(s.profile!.currentStreak).toBe(3);
    // Next morning, nothing logged yet: still 3.
    s = syncDay(s, at(2026, 10, 4, 7)).state;
    expect(s.profile!.currentStreak).toBe(3);
    expect(s.achievements.some((a) => a.id === 'kindling')).toBe(true);
  });

  it('detects a broken streak kindly and lets a rest day protect it', () => {
    let s = onboard(at(2026, 10, 1, 9));
    for (const d of [1, 2, 3]) {
      s = syncDay(s, at(2026, 10, d, 8)).state;
      s = logActivity(s, { category: 'reading', duration: 15 }, at(2026, 10, d, 20)).state;
    }
    // Skip Oct 4 entirely, open on Oct 5.
    const res = syncDay(s, at(2026, 10, 5, 9));
    s = res.state;
    expect(s.profile!.currentStreak).toBe(0);
    expect(res.events.some((e) => e.type === 'streakReset' && e.previous === 3)).toBe(true);
    expect(s.meta.streakReset?.protectableDay).toBe('2026-10-04');
    s = takeRestDay(s, '2026-10-04', at(2026, 10, 5, 9, 5)).state;
    expect(s.profile!.currentStreak).toBe(3);
    expect(s.meta.streakReset).toBeNull();
    s = logActivity(s, { category: 'reading', duration: 15 }, at(2026, 10, 5, 20)).state;
    expect(s.profile!.currentStreak).toBe(4);
  });

  it('limits rest days per week and refuses them on active days', () => {
    let s = onboard(at(2026, 10, 5, 9), 'hardcore'); // 1 rest day per week
    expect(canTakeRestDay(s, '2026-10-05', at(2026, 10, 5, 10)).ok).toBe(true);
    s = takeRestDay(s, '2026-10-05', at(2026, 10, 5, 10)).state;
    expect(s.transactions.some((t) => t.source === 'rest' && t.amount === 15)).toBe(true);
    s = syncDay(s, at(2026, 10, 6, 9)).state;
    expect(canTakeRestDay(s, '2026-10-06', at(2026, 10, 6, 10)).ok).toBe(false);
    s = logActivity(s, { category: 'study', duration: 20 }, at(2026, 10, 6, 11)).state;
    const r = canTakeRestDay(s, '2026-10-06', at(2026, 10, 6, 12));
    expect(r.ok).toBe(false);
  });
});

describe('daily quests', () => {
  it('generates a deterministic board per day and expires it quietly', () => {
    let s = onboard(at(2026, 10, 5, 9));
    s = syncDay(s, at(2026, 10, 6, 8)).state;
    const board = s.quests.filter((q) => q.kind === 'daily' && q.dueDate === '2026-10-06');
    expect(board).toHaveLength(3);
    const again = generateDailyQuests(s.profile!, '2026-10-06', at(2026, 10, 6, 8), s.quests);
    expect(again.map((q) => q.templateId)).toEqual(board.map((q) => q.templateId));
    s = syncDay(s, at(2026, 10, 7, 8)).state;
    const expired = s.quests.filter((q) => q.dueDate === '2026-10-06');
    expect(expired.every((q) => q.status === 'expired')).toBe(true);
    expect(questsForToday(s.quests, '2026-10-07').filter((q) => q.kind === 'daily')).toHaveLength(3);
  });

  it('allows one reroll per day', () => {
    let s = onboard(at(2026, 10, 5, 9));
    s = syncDay(s, at(2026, 10, 6, 8)).state;
    const q = s.quests.find((x) => x.kind === 'daily')!;
    const r1 = rerollQuest(s, q.id, at(2026, 10, 6, 9));
    expect(r1.error).toBeUndefined();
    const q2 = r1.state.quests.find((x) => x.kind === 'daily' && x.rerolled)!;
    expect(q2.templateId).not.toBe(q.templateId);
    expect(rerollQuest(r1.state, q2.id, at(2026, 10, 6, 9)).error).toBeTruthy();
  });

  it('resets repeating quests each scheduled day and tracks quest streaks', () => {
    let s = onboard(at(2026, 10, 5, 9));
    s = createQuest(s, { title: 'Practice guitar', category: 'practice', difficulty: 'medium', repeatSchedule: { type: 'daily' } }, at(2026, 10, 5, 9)).state;
    const id = s.quests.find((q) => q.title === 'Practice guitar')!.id;
    for (const d of [5, 6, 7]) {
      s = syncDay(s, at(2026, 10, d, 8)).state;
      expect(s.quests.find((q) => q.id === id)!.completed).toBe(false);
      s = completeQuest(s, id, at(2026, 10, d, 18)).state;
    }
    expect(s.quests.find((q) => q.id === id)!.streak).toBe(3);
    s = syncDay(s, at(2026, 10, 9, 8)).state; // missed the 8th
    expect(s.quests.find((q) => q.id === id)!.streak).toBe(0);
  });
});

describe('weekly challenges', () => {
  it('tracks the boss and pays out on claim', () => {
    let s = onboard(at(2026, 10, 5, 9));
    const boss = s.weeklies[0].challenges[0];
    expect(claimWeekly(s, boss.id, at(2026, 10, 5, 10)).error).toBeTruthy();
    for (let i = 0; i < 6; i++) {
      s = logActivity(s, { category: 'study', duration: 240 }, at(2026, 10, 5 + i, 10)).state;
      s = syncDay(s, at(2026, 10, 6 + i, 8)).state;
    }
    expect(challengeProgress(s, s.weeklies[0].weekKey, boss)).toBeGreaterThanOrEqual(boss.target);
    const before = xpOf(s);
    const res = claimWeekly(s, boss.id, at(2026, 10, 10, 12));
    expect(res.error).toBeUndefined();
    expect(xpOf(res.state)).toBeGreaterThanOrEqual(before + boss.xpReward);
    expect(claimWeekly(res.state, boss.id, at(2026, 10, 10, 12)).error).toBeTruthy();
  });

  it('resets automatically each week', () => {
    let s = onboard(at(2026, 10, 5, 9));
    s = syncDay(s, at(2026, 10, 12, 9)).state;
    expect(s.weeklies.map((w) => w.weekKey)).toEqual(['2026-10-05', '2026-10-12']);
  });
});

describe('achievements', () => {
  it('Early Riser counts 5–8 AM, not late nights', () => {
    let s = onboard(at(2026, 10, 5, 1));
    s = createQuest(s, { title: 'Night task', category: 'custom', difficulty: 'easy' }, at(2026, 10, 5, 1)).state;
    s = completeQuest(s, s.quests.find((q) => q.title === 'Night task')!.id, at(2026, 10, 5, 2)).state;
    expect(s.achievements.some((a) => a.id === 'early_riser')).toBe(false);
    s = createQuest(s, { title: 'Morning task', category: 'custom', difficulty: 'easy' }, at(2026, 10, 5, 6)).state;
    s = completeQuest(s, s.quests.find((q) => q.title === 'Morning task')!.id, at(2026, 10, 5, 6, 30)).state;
    expect(s.achievements.some((a) => a.id === 'early_riser')).toBe(true);
  });
});

describe('level coins and curve changes', () => {
  it('never pays level coins twice when the curve changes', () => {
    let s = onboard();
    s = logActivity(s, { category: 'study', duration: 240 }, at(2026, 10, 5, 12)).state;
    const level = s.profile!.level;
    const coins = s.profile!.coins;
    s = updateSettings(s, { xp: { curve: { base: 100, exponent: 2 } } }, at(2026, 10, 5, 13)).state;
    expect(s.profile!.level).toBeLessThanOrEqual(level);
    s = updateSettings(s, { xp: { curve: { base: 100, exponent: 1.35 } } }, at(2026, 10, 5, 13)).state;
    expect(s.profile!.level).toBe(level);
    expect(s.profile!.coins).toBe(coins);
  });
});

describe('shop', () => {
  it('buys cosmetics with coins only when affordable and level-appropriate', () => {
    let s = onboard();
    expect(purchaseItem(s, 'frame:cyber', at(2026, 10, 5)).error).toMatch(/more coins/);
    s = { ...s, profile: { ...s.profile!, coins: 5000 } };
    expect(purchaseItem(s, 'sigil:phoenix', at(2026, 10, 5)).error).toMatch(/Level 20/);
    s = purchaseItem(s, 'frame:cyber', at(2026, 10, 5)).state;
    expect(s.profile!.coins).toBe(4500);
    expect(s.meta.inventory).toContain('frame:cyber');
    s = equipItem(s, 'frame:cyber', at(2026, 10, 5)).state;
    expect(s.profile!.avatar.frame).toBe('frame:cyber');
    expect(equipItem(s, 'frame:gilded', at(2026, 10, 5)).error).toBeTruthy();
  });
});

describe('focus sessions', () => {
  it('logs validated focus time as an activity', () => {
    let s = onboard(at(2026, 10, 5, 9));
    const quest = s.quests.find((q) => q.title === 'Study Session')!;
    const t0 = at(2026, 10, 5, 10);
    s = startSession(s, { questId: quest.id, category: 'study', label: quest.title, minutes: 30 }, t0).state;
    s = pauseSession(s, t0 + 10 * 60_000).state;
    s = resumeSession(s, t0 + 15 * 60_000).state;
    const res = finishSession(s, t0 + 35 * 60_000, true);
    expect(res.error).toBeUndefined();
    const a = res.state.activities.at(-1)!;
    expect(a.source).toBe('focus');
    expect(a.duration).toBe(30);
    expect(res.state.quests.find((q) => q.id === quest.id)!.completed).toBe(true);
    expect(res.state.session).toBeNull();
  });

  it('does not award XP for very short or tampered sessions', () => {
    let s = onboard(at(2026, 10, 5, 9));
    const t0 = at(2026, 10, 5, 10);
    s = startSession(s, { category: 'study', label: 'Study', minutes: 25 }, t0).state;
    const short = finishSession(s, t0 + 2 * 60_000, true);
    expect(short.error).toBeTruthy();
    expect(short.state.activities).toHaveLength(0);
    // Clock moved backwards during the session.
    const tampered = finishSession(s, t0 - 60 * 60_000, true);
    expect(tampered.error).toBeTruthy();
    expect(tampered.state.activities).toHaveLength(0);
  });
});

describe('goals', () => {
  it('pays milestone XP and completes the goal with a bonus', () => {
    let s = onboard();
    s = createGoal(s, { title: 'Learn Spanish', target: 'Conversational', milestones: [{ title: 'Learn 100 words' }, { title: 'Complete 10 lessons' }] }, at(2026, 10, 5)).state;
    const g = s.goals[0];
    const milestoneXP = (st: GameState) => st.transactions.filter((t) => t.source === 'milestone').reduce((a, t) => a + t.amount, 0);
    s = toggleMilestone(s, g.id, g.milestones[0].id, at(2026, 10, 6)).state;
    expect(milestoneXP(s)).toBe(75);
    expect(s.achievements.some((a) => a.id === 'stepping_stone')).toBe(true);
    const xpAfter = xpOf(s);
    // Unchecking refunds the milestone XP before the goal is complete.
    s = toggleMilestone(s, g.id, g.milestones[0].id, at(2026, 10, 6)).state;
    expect(milestoneXP(s)).toBe(0);
    expect(xpOf(s)).toBe(xpAfter - 75);
    s = toggleMilestone(s, g.id, g.milestones[0].id, at(2026, 10, 6)).state;
    const res = toggleMilestone(s, g.id, g.milestones[1].id, at(2026, 10, 7));
    expect(res.state.goals[0].status).toBe('completed');
    expect(res.events.some((e) => e.type === 'goalComplete')).toBe(true);
    expect(toggleMilestone(res.state, g.id, g.milestones[0].id, at(2026, 10, 8)).error).toBeTruthy();
  });

  it('supports manual progress for goals without milestones', () => {
    let s = onboard();
    s = createGoal(s, { title: 'Run a 10K' }, at(2026, 10, 5)).state;
    s = setGoalProgress(s, s.goals[0].id, 40, at(2026, 10, 5)).state;
    expect(s.goals[0].progress).toBe(40);
    s = setGoalProgress(s, s.goals[0].id, 100, at(2026, 10, 6)).state;
    expect(s.goals[0].status).toBe('completed');
  });
});

describe('special events', () => {
  it('runs The Grind in October', () => {
    expect(activeEvents('2026-10-05', 1).map((e) => e.def.id)).toContain('the_grind');
    expect(activeEvents('2026-11-05', 1).map((e) => e.def.id)).not.toContain('the_grind');
  });
});

describe('timezone safety', () => {
  it('stores the local day with every transaction', () => {
    const s = logActivity(onboard(at(2026, 10, 5, 9)), { category: 'study', duration: 30 }, at(2026, 10, 5, 23, 30)).state;
    expect(s.transactions.at(-1)!.dateKey).toBe(toDateKey(at(2026, 10, 5, 23, 30)));
    expect(s.activities[0].dateKey).toBe('2026-10-05');
  });
});
