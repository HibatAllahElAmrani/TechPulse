import { Link } from 'react-router-dom';
import { Star, GitFork, AlertCircle, GitPullRequest } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../api/client';

interface Props {
  project: Project;
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

const langColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
};

export default function ProjectCard({ project }: Props) {
  const m = project.latest_metrics;
  const langColor = project.language ? langColors[project.language] ?? '#888' : '#888';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Link
        to={`/project/${project.owner}/${project.repo}`}
        className="card block hover:border-accent transition-colors"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-100 truncate">
              {project.full_name}
            </h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2 min-h-[2.5rem]">
              {project.description ?? 'No description'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span className="tabular-nums">{formatNumber(m?.stars)}</span>
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-4 h-4" />
            <span className="tabular-nums">{formatNumber(m?.forks)}</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            <span className="tabular-nums">{formatNumber(m?.open_issues)}</span>
          </span>
          <span className="flex items-center gap-1">
            <GitPullRequest className="w-4 h-4" />
            <span className="tabular-nums">{formatNumber(m?.open_prs)}</span>
          </span>
        </div>

        {project.language && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-muted">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            <span className="text-xs text-gray-400">{project.language}</span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
