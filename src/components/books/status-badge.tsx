import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'TO_READ' | 'NEXT_UP' | 'READING' | 'PAUSED' | 'FINISHED' | 'DNF';
}

const statusConfig = {
  DNF: { label: 'Did not finish', className: 'bg-stone-100 text-stone-700 border-stone-200' },
  TO_READ: {
    label: 'To Read',
    className: 'bg-slate-100/90 text-slate-700 border-slate-200 backdrop-blur-sm',
  },
  NEXT_UP: {
    label: 'Next Up',
    className: 'bg-amber-100/90 text-amber-800 border-amber-200 backdrop-blur-sm',
  },
  READING: {
    label: 'Reading',
    className: 'bg-blue-100/90 text-blue-800 border-blue-200 backdrop-blur-sm',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-orange-100/90 text-orange-800 border-orange-200 backdrop-blur-sm',
  },
  FINISHED: {
    label: 'Finished',
    className: 'bg-emerald-100/90 text-emerald-800 border-emerald-200 backdrop-blur-sm',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge className={`${config.className} border text-xs font-medium shadow-sm`}>
      {config.label}
    </Badge>
  );
}
