import { useEffect, useState } from 'react';
import { currentStreak, dayKey, goalProgress, longestStreak, type GoalProgress } from '../../activity';
import { listActivity } from '../../db/activity';
import { listProgress } from '../../db/progress';
import { useSettings } from '../../settings/SettingsProvider';

export type ActivitySummary = { goal: GoalProgress; streak: number; longest: number };

// 활동 기록과 레슨 완료일을 합쳐 연속 학습일·오늘 목표를 계산한다.
// 활동 표는 7-B부터 쌓여서, 그 전에 끝낸 레슨은 완료일(completedAt)로 학습일을 채워 준다.
// 읽기에 실패하면 null로 두어 화면이 숫자 없이 조용히 넘어가게 한다
export function useActivitySummary(): ActivitySummary | null {
  const { dailyGoal } = useSettings().settings;
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([listActivity(), listProgress()]).then(([rows, progress]) => {
      if (!alive) return;
      const dates = new Set(rows.filter((r) => r.practice + r.review > 0).map((r) => r.date));
      for (const p of progress) if (p.completedAt) dates.add(dayKey(p.completedAt));
      const today = dayKey(Date.now());
      setSummary({
        goal: goalProgress(rows.find((r) => r.date === today), dailyGoal),
        streak: currentStreak(dates, today),
        longest: longestStreak(dates)
      });
    }, () => undefined);
    return () => { alive = false; };
  }, [dailyGoal]);
  return summary;
}
