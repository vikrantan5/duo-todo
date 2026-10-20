export function ProgressRing({
  value, size = 72, stroke = 7, color = "#8B7CFF", trackColor = "rgba(255,255,255,0.08)", label,
}: { value: number; size?: number; stroke?: number; color?: string; trackColor?: string; label?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = c * (pct / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {label ?? <span className="text-sm font-semibold">{pct}%</span>}
      </div>
    </div>
  );
}
