import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { projectsApi } from '../api/client';

export default function AddProjectForm() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: projectsApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIdentifier('');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error ?? 'Failed to add project');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError(null);
    mutation.mutate(identifier.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label className="text-sm font-medium text-gray-200 mb-2 block">
        Add a GitHub project
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="owner/repo  or  https://github.com/owner/repo"
          className="input flex-1"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !identifier.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Add
        </button>
      </div>
      {error && <p className="text-sm text-accent-red mt-2">{error}</p>}
      <p className="text-xs text-gray-500 mt-2">
        Examples: <code className="font-mono">facebook/react</code>,{' '}
        <code className="font-mono">vercel/next.js</code>
      </p>
    </form>
  );
}
