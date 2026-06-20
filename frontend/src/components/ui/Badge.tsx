interface Props { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; }

export function Badge({ children, tone = 'neutral' }: Props) {
  const t = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-primary-50 text-primary-700 border-primary-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${t}`}>{children}</span>;
}
