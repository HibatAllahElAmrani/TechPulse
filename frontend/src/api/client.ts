import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
});

export interface Project {
  id: string;
  owner: string;
  repo: string;
  full_name: string;
  description: string | null;
  language: string | null;
  is_archived: boolean;
  last_pushed_at: string;
  latest_metrics: {
    stars: number;
    forks: number;
    open_issues: number;
    open_prs: number;
    time: string;
  } | null;
}

export interface MetricPoint {
  time: string;
  stars: number;
  forks: number;
  open_issues: number;
  open_prs: number;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export interface CommitDay {
  day: string;
  commit_count: number;
}

export interface Alert {
  id: string;
  project_id: string;
  project_name: string;
  metric: 'stars' | 'forks' | 'open_issues' | 'open_prs' | 'commits_30d';
  operator: '>' | '<' | 'delta_pct';
  threshold: number;
  notification_channels: ('in_app'| 'slack' | 'email')[];
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface CreateAlertInput {
  project_id: string;
  metric: Alert['metric'];
  operator: Alert['operator'];
  threshold: number;
  notification_channels: Alert['notification_channels'];
}

export const projectsApi = {
  list: () => api.get<{ projects: Project[] }>('/projects').then((r) => r.data.projects),

  add: (identifier: string) =>
    api.post<Project>('/projects', { identifier }).then((r) => r.data),

  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),

  metrics: (id: string, range: '7d' | '30d' | '90d' = '30d') =>
    api
      .get<{ points: MetricPoint[] }>(`/projects/${id}/metrics`, { params: { range } })
      .then((r) => r.data.points),

  contributors: (id: string) =>
    api
      .get<{ contributors: Contributor[] }>(`/projects/${id}/contributors`)
      .then((r) => r.data.contributors),

  heatmap: (id: string) =>
    api
      .get<{ days: CommitDay[] }>(`/projects/${id}/commits/heatmap`)
      .then((r) => r.data.days),

  remove: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};

export const alertsApi = {
  create: (data: CreateAlertInput) =>
    api.post<Alert>('/alerts', data).then((r) => r.data),

  list: () =>
    api.get<{ alerts: Alert[] }>('/alerts').then((r) => r.data.alerts),

  delete: (id: string) =>
    api.delete(`/alerts/${id}`).then((r) => r.data),
};
