import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { projectsApi } from '../api/client';
import AddProjectForm from '../components/AddProjectForm';
import ProjectCard from '../components/ProjectCard';

export default function DashboardPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-gray-400">
          Real-time visualization of open-source project activity.
        </p>
      </div>

      <AddProjectForm />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      )}

      {error && (
        <div className="card border-accent-red">
          <p className="text-accent-red">
            Could not load projects. Is the backend running on port 4000?
          </p>
        </div>
      )}

      {projects && projects.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          No projects yet. Add your first project above.
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
