import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { MetricPoint } from '../api/client';

interface Props {
  data: MetricPoint[];
}

export default function StarsLineChart({ data }: Props) {
  const formatted = data.map((p) => ({
    ...p,
    timestamp: new Date(p.time).getTime(),
    label: new Date(p.time).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="card">
      <h3 className="font-semibold mb-4">Evolution Stars / Forks</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={formatted}>
            <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#8b949e" fontSize={12} />
            <YAxis stroke="#8b949e" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: 6,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="stars"
              stroke="#d29922"
              strokeWidth={2}
              dot={false}
              name="Stars"
            />
            <Line
              type="monotone"
              dataKey="forks"
              stroke="#2f81f7"
              strokeWidth={2}
              dot={false}
              name="Forks"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {formatted.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-8">
          No history yet — data will appear after a few collection cycles.
        </p>
      )}
    </div>
  );
}
