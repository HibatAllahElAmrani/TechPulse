import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Star, GitFork, AlertCircle, GitPullRequest, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { projectsApi } from '../api/client';
import { useProjectSocket, type MetricsUpdate } from '../hooks/useProjectSocket';
import MetricCard from '../components/MetricCard';
import StarsLineChart from '../components/StarsLineChart';
import CommitHeatmap from '../components/CommitHeatmap';
import ContributorsBubble from '../components/ContributorsBubble';

export default function ProjectDetailPage() {
  const { owner, repo } = useParams();

  // Find project by owner/repo (simple approach: list all & filter)
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const project = useMemo(
    () => projects?.find((p) => p.owner === owner && p.repo === repo),
    [projects, owner, repo]
  );

  const projectId = project?.id ?? null;

  // Live metrics state (overrides DB values when WebSocket pushes update)
  const [liveMetrics, setLiveMetrics] = useState<MetricsUpdate['metrics'] | null>(null);

  const { connected } = useProjectSocket(projectId, (data) => {
    setLiveMetrics(data.metrics);
  });

  // Reset live override when switching projects
  useEffect(() => {
    setLiveMetrics(null);
  }, [projectId]);

  const metrics = liveMetrics ?? project?.latest_metrics ?? null;

  const { data: history = [] } = useQuery({
    queryKey: ['metrics', projectId],
    queryFn: () => projectsApi.metrics(projectId!, '30d'),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });

  const { data: contributors = [] } = useQuery({
    queryKey: ['contributors', projectId],
    queryFn: () => projectsApi.contributors(projectId!),
    enabled: !!projectId,
  });

  const { data: heatmap = [] } = useQuery({
    queryKey: ['heatmap', projectId],
    queryFn: () => projectsApi.heatmap(projectId!),
    enabled: !!projectId,
  });

  if (!projects) {
    return <p className="text-gray-400">Loading…</p>;
  }
  if (!project) {
    return (
      <div className="card">
        <p className="text-gray-300">
          Project not found in your watchlist.{' '}
          <Link to="/" className="text-accent">
            Go back
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.full_name}</h1>
            <p className="text-gray-400 text-sm">{project.description ?? 'No description'}</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-sm ${connected ? 'text-accent-green' : 'text-gray-500'}`}>
          {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Star} label="Stars" value={metrics?.stars ?? 0} color="text-accent-orange" />
        <MetricCard icon={GitFork} label="Forks" value={metrics?.forks ?? 0} color="text-accent" />
        <MetricCard icon={AlertCircle} label="Open Issues" value={metrics?.open_issues ?? 0} color="text-accent-red" />
        <MetricCard icon={GitPullRequest} label="Open PRs" value={metrics?.open_prs ?? 0} color="text-accent-green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StarsLineChart data={history} />
        <CommitHeatmap data={heatmap} />
      </div>

      <ContributorsBubble contributors={contributors} />
    </div>
  );
}
