import { addDays, toDateKey } from '@/lib/date';
import { canTakeRestDay, restAllowance, restDaysUsed, takeRestDay } from '@/lib/engine/gameEngine';
import { REST_DAY_XP } from '@/lib/engine/rewards';
import { dispatch, useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet as SheetPanel } from '@/components/ui/Overlay';

export default function RestDaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const now = Date.now();
  const today = toDateKey(now);
  const yesterday = addDays(today, -1);
  const allowance = restAllowance(state);
  const used = restDaysUsed(state, today);
  const todayCheck = canTakeRestDay(state, today, now);
  const yesterdayCheck = canTakeRestDay(state, yesterday, now);
  const protecting = state.meta.streakReset?.protectableDay === yesterday;

  const take = (day: string) => {
    const res = dispatch((s, n) => takeRestDay(s, day, n));
    if (!res.error) onClose();
  };

  return (
    <SheetPanel open={open} onClose={onClose} title="Rest day" description="Rest is part of progress.">
      <div className="space-y-5 pb-1">
        <div className="flex gap-4 rounded-2xl border border-success/25 bg-success/8 p-4">
          <Icon name="battery-charging" size={26} className="mt-0.5 shrink-0 text-success" />
          <div className="space-y-1.5 text-sm leading-relaxed text-muted">
            <p className="text-fg">Recovery days keep your streak safe without asking anything of you.</p>
            <p>
              A rest day bridges your streak and grants a small +{REST_DAY_XP} XP. You have{' '}
              <span className="font-semibold text-fg">
                {Math.max(0, allowance - used)} of {allowance}
              </span>{' '}
              rest days left this week.
            </p>
          </div>
        </div>

        {protecting && (
          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-sm text-fg">Missed yesterday? Cover it with a rest day and your {state.meta.streakReset?.previous}-day streak continues.</p>
            <Button variant="success" block className="mt-3" icon="shield-check" disabled={!yesterdayCheck.ok} onClick={() => take(yesterday)}>
              Use a rest day for yesterday
            </Button>
          </div>
        )}

        <Button variant="primary" cta size="lg" block icon="moon" disabled={!todayCheck.ok} onClick={() => take(today)}>
          Take today off
        </Button>
        {!todayCheck.ok && <p className="text-center text-[13px] text-muted">{todayCheck.reason}</p>}
        {!protecting && yesterdayCheck.ok && (
          <button type="button" onClick={() => take(yesterday)} className="mx-auto block text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline">
            Mark yesterday as a rest day instead
          </button>
        )}
      </div>
    </SheetPanel>
  );
}
