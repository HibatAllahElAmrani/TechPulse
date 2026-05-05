import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: number;
  delta?: number;
  color?: string;
}

export default function MetricCard({ icon: Icon, label, value, delta, color = 'text-accent' }: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' });
    return controls.stop;
  }, [value, count]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <motion.div className="text-3xl font-bold tabular-nums">{rounded}</motion.div>
      {delta !== undefined && delta !== 0 && (
        <div className={`text-xs mt-1 ${delta > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
        </div>
      )}
    </div>
  );
}
