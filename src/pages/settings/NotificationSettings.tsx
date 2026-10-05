import { useEffect, useState } from 'react';
import type { NotificationSettings as NotificationPrefs } from '@/types';
import { notificationPermission, requestNotificationPermission, showNotification } from '@/lib/notifications';
import { useGame } from '@/store/gameStore';
import { useUI } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input, Toggle } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel, Row, setSettings } from './shared';

type Permission = ReturnType<typeof notificationPermission>;

const set = (patch: Partial<Omit<NotificationPrefs, 'quietHours'>> & { quietHours?: Partial<NotificationPrefs['quietHours']> }) => setSettings({ notifications: patch });

export function NotificationSettings() {
  const n = useGame((s) => s.settings.notifications);
  const toast = useUI((s) => s.toast);
  const [permission, setPermission] = useState<Permission>(() => notificationPermission());

  useEffect(() => {
    const refresh = () => setPermission(notificationPermission());
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const enable = async (on: boolean) => {
    if (!on) {
      set({ enabled: false });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      set({ enabled: true });
      toast({ kind: 'success', title: 'Reminders on', message: 'Evolve will nudge you gently — never more than 3 times a day.', icon: 'bell' });
    } else if (result === 'denied') {
      toast({ kind: 'error', title: 'Notifications are blocked', message: 'Allow them for this site in your browser settings, then try again.' });
    } else if (result === 'unsupported') {
      toast({ kind: 'info', title: 'Not supported here', message: 'Install Evolve to your Home Screen to get reminders on this device.' });
    }
  };

  const active = n.enabled && permission === 'granted';

  return (
    <Panel id="notifications" title="Notifications" icon="bell" description="Helpful nudges only. Never more than three a day, never during quiet hours, and never while you’re using the app.">
      <Toggle
        label="Reminders"
        description={
          permission === 'unsupported'
            ? 'This browser doesn’t support notifications. On iPhone, add Evolve to your Home Screen first.'
            : permission === 'denied'
              ? 'Blocked in your browser settings for this site.'
              : 'Daily reminder, near level-up, weekly deadlines and streak milestones.'
        }
        checked={active}
        disabled={permission === 'unsupported'}
        onChange={(v) => void enable(v)}
      />
      {active && (
        <>
          <Toggle label="Daily reminder" description="If you haven’t played yet today." checked={n.dailyReminder} onChange={(dailyReminder) => set({ dailyReminder })} />
          {n.dailyReminder && (
            <Row label="Reminder time" htmlFor="reminder-time">
              <Input id="reminder-time" type="time" value={n.reminderTime} onChange={(e) => e.target.value && set({ reminderTime: e.target.value })} className="h-11 sm:w-36" />
            </Row>
          )}
          <Toggle label="Close to leveling up" description="“You are 40 XP away from Level 13.”" checked={n.levelProximity} onChange={(levelProximity) => set({ levelProximity })} />
          <Toggle label="Weekly challenge deadline" description="A heads-up on the last day of the week." checked={n.weeklyDeadline} onChange={(weeklyDeadline) => set({ weeklyDeadline })} />
          <Toggle label="Streak milestones" description="Celebrate 7, 14, 30 days and beyond." checked={n.streakMilestones} onChange={(streakMilestones) => set({ streakMilestones })} />
          <Toggle label="Quiet hours" description="No notifications overnight." checked={n.quietHours.enabled} onChange={(enabled) => set({ quietHours: { enabled } })} />
          {n.quietHours.enabled && (
            <div className="flex flex-wrap items-center gap-3 py-4">
              <label htmlFor="quiet-start" className="text-sm text-muted">
                From
              </label>
              <Input id="quiet-start" type="time" value={n.quietHours.start} onChange={(e) => e.target.value && set({ quietHours: { start: e.target.value } })} className="h-11 w-36" />
              <label htmlFor="quiet-end" className="text-sm text-muted">
                to
              </label>
              <Input id="quiet-end" type="time" value={n.quietHours.end} onChange={(e) => e.target.value && set({ quietHours: { end: e.target.value } })} className="h-11 w-36" />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-4">
            <p className="flex items-start gap-2 text-[13px] text-muted">
              <Icon name="info" size={15} className="mt-0.5 shrink-0" />
              Reminders are created on your device from your own progress. Nothing is sent to a server.
            </p>
            <Button variant="secondary" size="sm" icon="bell" onClick={() => void showNotification({ type: 'test', title: 'Evolve', body: 'Reminders are working. See you on your next quest.', url: '#/home' })}>
              Test
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}
