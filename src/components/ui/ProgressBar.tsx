interface ProgressBarProps {
  current: number;
  target: number;
  className?: string;
}

export function ProgressBar({ current, target, className = "" }: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const color = percentage >= 75 ? "bg-emerald-500" : percentage >= 50 ? "bg-blue-500" : percentage >= 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
