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
