import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bell, Trash2, Loader2, TriangleAlert } from 'lucide-react';
import { alertsApi, projectsApi, type CreateAlertInput } from '../api/client';

const METRIC_OPTIONS: { value: CreateAlertInput['metric']; label: string }[] = [
  { value: 'stars',       label: 'Stars' },
  { value: 'forks',       label: 'Forks' },
  { value: 'open_issues', label: 'Open Issues' },
  { value: 'open_prs',    label: 'Open PRs' },
  { value: 'commits_30d', label: 'Commits (30d)' },
];

const OPERATOR_OPTIONS: { value: CreateAlertInput['operator']; label: string }[] = [
  { value: '>',         label: 'Goes above (>)' },
  { value: '<',         label: 'Falls below (<)' },
  { value: 'delta_pct', label: 'Changes by % (delta)' },
];

const CHANNEL_OPTIONS: { value: 'in_app' | 'slack' | 'email'; label: string }[] = [
  { value: 'in_app', label: 'In-app' },
  { value: 'slack',  label: 'Slack' },
  { value: 'email',  label: 'Email' },
];

export default function AlertsPage() {
  const queryClient = useQueryClient();

  // ---- form state ----
  const [projectId, setProjectId]   = useState('');
  const [metric, setMetric]         = useState<CreateAlertInput['metric']>('stars');
  const [operator, setOperator]     = useState<CreateAlertInput['operator']>('>');
  const [threshold, setThreshold]   = useState('');
  const [channels, setChannels]     = useState<('in_app' | 'slack' | 'email')[]>(['in_app']);
  const [formError, setFormError]   = useState<string | null>(null);

  // ---- data fetching ----
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    refetchInterval: 30_000,
  });

  // ---- create mutation ----
  const createMutation = useMutation({
    mutationFn: alertsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      // reset form
      setProjectId('');
      setMetric('stars');
      setOperator('>');
      setThreshold('');
      setChannels(['in_app']);
      setFormError(null);
    },
    onError: () => setFormError('Failed to create alert. Please try again.'),
  });

  // ---- delete mutation ----
  const deleteMutation = useMutation({
    mutationFn: alertsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  // ---- form submit ----
  function handleSubmit() {
    setFormError(null);
    if (!projectId) { setFormError('Please select a project.'); return; }
    const parsed = Number(threshold);
    if (!threshold || isNaN(parsed)) { setFormError('Please enter a valid threshold number.'); return; }
    if (channels.length === 0) { setFormError('Select at least one notification channel.'); return; }

    createMutation.mutate({ project_id: projectId, metric, operator, threshold: parsed, notification_channels: channels });
  }

  // ---- channel checkbox toggle ----
  function toggleChannel(ch: 'in_app' | 'slack' | 'email') {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Alerts</h1>
        <p className="text-gray-400">Get notified when a metric crosses a threshold.</p>
      </div>

      {/* Create form */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent" />
          New Alert
        </h2>

        {/* Project */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Project</label>
          <select
            className="input w-full"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="" disabled className='text-gray-400'>Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>

        {/* Metric + Operator + Threshold */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-400">Metric</label>
            <select
              className="input w-full"
              value={metric}
              onChange={(e) => setMetric(e.target.value as CreateAlertInput['metric'])}
            >
              {METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-400">Operator</label>
            <select
              className="input w-full"
              value={operator}
              onChange={(e) => setOperator(e.target.value as CreateAlertInput['operator'])}
            >
              {OPERATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-400">Threshold</label>
            <input
              type="number"
              className="input w-full"
              placeholder="e.g. 1000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        </div>

        {/* Channels */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Notification channels</label>
          <div className="flex gap-4">
            {CHANNEL_OPTIONS.map((ch) => (
              <label key={ch.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes(ch.value)}
                  onChange={() => toggleChannel(ch.value)}
                  className="accent-accent"
                />
                {ch.label}
              </label>
            ))}
          </div>
        </div>

        {/* Error */}
        {formError && (
          <p className="text-accent-red text-sm flex items-center gap-2">
            <TriangleAlert className="w-4 h-4" /> {formError}
          </p>
        )}

        {/* Submit */}
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Alert
        </button>
      </div>

      {/* Alerts list */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}

      {error && (
        <div className="card border-accent-red">
          <p className="text-accent-red">Could not load alerts. Is the backend running?</p>
        </div>
      )}

      {!isLoading && alerts.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          No active alerts yet. Create one above.
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="card flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-medium">{alert.project_name}</p>
                <p className="text-sm text-gray-400">
                  {alert.metric} {alert.operator} {alert.threshold}
                  {' · '}
                  {alert.notification_channels.join(', ')}
                </p>
                {alert.last_triggered_at ? (
                  <p className="text-xs text-accent-orange">
                    Last triggered: {new Date(alert.last_triggered_at).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Never triggered</p>
                )}
              </div>
              <button
                className="btn-ghost text-accent-red"
                onClick={() => deleteMutation.mutate(alert.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}