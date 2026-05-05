import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { CommitDay } from '../api/client';

interface Props {
  data: CommitDay[];
}

const CELL = 12;
const GAP = 2;
const WEEKS = 13; // ~3 months

export default function CommitHeatmap({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Build a date->count map
    const counts = new Map<string, number>();
    for (const d of data) counts.set(d.day, d.commit_count);

    // Generate WEEKS*7 days ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; count: number }[] = [];
    const totalDays = WEEKS * 7;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().substring(0, 10);
      days.push({ date: d, count: counts.get(key) ?? 0 });
    }

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, maxCount * 0.25, maxCount * 0.5, maxCount])
      .range(['#161b22', '#0e4429', '#26a641', '#39d353']);

    const width = WEEKS * (CELL + GAP);
    const height = 7 * (CELL + GAP);
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');

    g.selectAll('rect')
      .data(days)
      .enter()
      .append('rect')
      .attr('x', (_d, i) => Math.floor(i / 7) * (CELL + GAP))
      .attr('y', (_d, i) => (i % 7) * (CELL + GAP))
      .attr('width', CELL)
      .attr('height', CELL)
      .attr('rx', 2)
      .attr('fill', (d) => colorScale(d.count))
      .append('title')
      .text((d) => `${d.date.toISOString().substring(0, 10)}: ${d.count} commits`);
  }, [data]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Commit Activity (90 days)</h3>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm" style={{ background: '#161b22' }} />
          <span className="w-3 h-3 rounded-sm" style={{ background: '#0e4429' }} />
          <span className="w-3 h-3 rounded-sm" style={{ background: '#26a641' }} />
          <span className="w-3 h-3 rounded-sm" style={{ background: '#39d353' }} />
          <span>More</span>
        </div>
      </div>
      <svg ref={svgRef} className="w-full" style={{ maxHeight: 140 }} />
    </div>
  );
}
