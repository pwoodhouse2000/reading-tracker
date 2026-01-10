import { Badge } from '@/components/ui/badge';

type ReadingStatus = 'TO_READ' | 'NEXT_UP' | 'READING' | 'PAUSED' | 'FINISHED';

interface StatusBadgeProps {
  status: ReadingStatus;
}

const statusConfig: Record<
  ReadingStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  TO_READ: { label: 'To Read', variant: 'outline' },
  NEXT_UP: { label: 'Next Up', variant: 'secondary' },
  READING: { label: 'Reading', variant: 'default' },
  PAUSED: { label: 'Paused', variant: 'destructive' },
  FINISHED: { label: 'Finished', variant: 'secondary' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
