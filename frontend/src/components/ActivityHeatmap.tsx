import React, { useMemo } from 'react';

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
  quizzes?: number;
  lessons?: number;
}

interface ActivityHeatmapProps {
  activities: ActivityDay[];
  totalActivities: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  activities,
  totalActivities,
}) => {
  // Map date string to count
  const activityMap = useMemo(() => {
    const map = new Map<string, { count: number; quizzes: number; lessons: number }>();
    activities.forEach((a) => {
      map.set(a.date, {
        count: a.count,
        quizzes: a.quizzes || 0,
        lessons: a.lessons || 0,
      });
    });
    return map;
  }, [activities]);

  // Generate a full grid of 52 weeks (364/371 days) ending on today
  const { weeks, monthLabels } = useMemo(() => {
    const now = new Date();
    // Normalize to midnight
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // We want the end date's day of week: 0 is Sun, 1 is Mon, ..., 6 is Sat
    // To align with Github style (Sunday or Monday start, let's do Monday start):
    // In JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    // If Monday=row 0, Sunday=row 6
    const dayOfWeek = (end.getDay() + 6) % 7; // Mon=0, ..., Sun=6

    // Total days: 52 weeks * 7 days
    const totalDays = 52 * 7 + dayOfWeek + 1;
    const start = new Date(end);
    start.setDate(end.getDate() - totalDays + 1);

    const daysList: { dateStr: string; dateObj: Date }[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      daysList.push({
        dateStr: `${y}-${m}-${d}`,
        dateObj: new Date(curr),
      });
      curr.setDate(curr.getDate() + 1);
    }

    // Group into columns of 7 (Monday = row 0, Sunday = row 6)
    const weeksArr: {
      days: { dateStr: string; dateObj: Date; count: number; quizzes: number; lessons: number }[];
    }[] = [];

    let currentWeek: { dateStr: string; dateObj: Date; count: number; quizzes: number; lessons: number }[] = [];

    daysList.forEach((d) => {
      const data = activityMap.get(d.dateStr) || { count: 0, quizzes: 0, lessons: 0 };
      currentWeek.push({
        dateStr: d.dateStr,
        dateObj: d.dateObj,
        count: data.count,
        quizzes: data.quizzes,
        lessons: data.lessons,
      });

      if (currentWeek.length === 7) {
        weeksArr.push({ days: currentWeek });
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeksArr.push({ days: currentWeek });
    }

    // Calculate month labels positions
    const months = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];
    const labels: { text: string; colIndex: number }[] = [];
    let lastMonth = -1;

    weeksArr.forEach((w, colIdx) => {
      const firstDayOfWeek = w.days[0]?.dateObj;
      if (firstDayOfWeek) {
        const m = firstDayOfWeek.getMonth();
        if (m !== lastMonth) {
          labels.push({ text: months[m], colIndex: colIdx });
          lastMonth = m;
        }
      }
    });

    return { weeks: weeksArr, monthLabels: labels };
  }, [activityMap]);

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 hover:ring-1 hover:ring-slate-300';
    if (count === 1) return 'bg-emerald-200 hover:ring-1 hover:ring-emerald-400';
    if (count <= 3) return 'bg-emerald-400 hover:ring-1 hover:ring-emerald-500';
    if (count <= 6) return 'bg-emerald-600 hover:ring-1 hover:ring-emerald-700';
    return 'bg-emerald-800 hover:ring-1 hover:ring-emerald-900';
  };

  const dayNames = ['T2', 'T4', 'T6'];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Bản đồ hoạt động học tập</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              {totalActivities} hoạt động trong năm qua
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận các lượt làm bài trắc nghiệm và hoàn thành bài giảng lý thuyết
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span>Ít</span>
          <div className="w-3 h-3 rounded-xs bg-slate-100"></div>
          <div className="w-3 h-3 rounded-xs bg-emerald-200"></div>
          <div className="w-3 h-3 rounded-xs bg-emerald-400"></div>
          <div className="w-3 h-3 rounded-xs bg-emerald-600"></div>
          <div className="w-3 h-3 rounded-xs bg-emerald-800"></div>
          <span>Nhiều</span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="min-w-[760px]">
          {/* Months header */}
          <div className="flex text-[11px] text-slate-400 font-medium mb-1 pl-7 relative h-4">
            {monthLabels.map((lbl, i) => (
              <span
                key={i}
                className="absolute"
                style={{ left: `${lbl.colIndex * 14 + 28}px` }}
              >
                {lbl.text}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-1">
            {/* Weekday indicators (Mon, Wed, Fri) */}
            <div className="flex flex-col justify-between text-[10px] text-slate-400 font-semibold h-[94px] pr-1.5 select-none shrink-0 py-0.5">
              <span>{dayNames[0]}</span>
              <span>{dayNames[1]}</span>
              <span>{dayNames[2]}</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.days.map((day, dIdx) => {
                    const tooltipText = `${day.count} hoạt động vào ${day.dateStr}${
                      day.count > 0
                        ? ` (${day.quizzes} bài thi, ${day.lessons} bài học)`
                        : ''
                    }`;
                    return (
                      <div
                        key={dIdx}
                        title={tooltipText}
                        className={`w-[11px] h-[11px] rounded-2xs transition-colors cursor-pointer ${getColorClass(
                          day.count
                        )}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
