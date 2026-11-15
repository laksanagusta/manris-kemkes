export function MitigationProgressIndicator({
  riskTitle,
  value,
}: {
  riskTitle: string;
  value: number | null;
}) {
  if (value === null) return <span className="text-muted-foreground" aria-label={`Progres penanganan ${riskTitle}: tidak tersedia`} title="Tidak ada laporan penanganan pada periode ini atau jumlahnya belum tersedia">—</span>;
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const percent = Math.min(100, Math.max(0, Math.round(normalizedValue)));
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent / 100);

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      role="img"
      aria-label={`Progres penanganan ${riskTitle}: ${percent}%`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 18 18"
        className="size-[18px] shrink-0"
      >
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
        />
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth="2"
          transform="rotate(-90 9 9)"
          className="text-violet-400"
        />
      </svg>
      <span className="text-sm leading-5 font-medium tabular-nums text-foreground">
        {percent}%
      </span>
    </div>
  );
}

