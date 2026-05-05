import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { getEnv } from '../config/env.js';

export interface RepoMetrics {
  github_id: number;
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  homepage: string | null;
  is_archived: boolean;
  is_fork: boolean;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  project_created_at: string;
  last_pushed_at: string;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * GitHub service - wraps Octokit with token pooling support.
 * For MVP, we use a single token (env GITHUB_PERSONAL_TOKEN or per-user OAuth token).
 * In production, a token pool would rotate user tokens.
 */
export class GitHubService {
  private octokit: Octokit;
  private gql: typeof graphql;

  constructor(token?: string) {
    const authToken = token ?? getEnv().GITHUB_PERSONAL_TOKEN;
    this.octokit = new Octokit({
      auth: authToken,
      userAgent: 'oss-pulse/0.1.0',
    });
    this.gql = graphql.defaults({
      headers: authToken ? { authorization: `token ${authToken}` } : {},
    });
  }

  /**
   * Fetch core repository metrics (stars, forks, issues...).
   */
  async getRepoMetrics(owner: string, repo: string): Promise<RepoMetrics> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return {
      github_id: data.id,
      owner: data.owner.login,
      repo: data.name,
      description: data.description,
      language: data.language,
      homepage: data.homepage,
      is_archived: data.archived,
      is_fork: data.fork,
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.subscribers_count,
      open_issues: data.open_issues_count,
      project_created_at: data.created_at,
      last_pushed_at: data.pushed_at ?? data.updated_at,
    };
  }

  /**
   * Fetch open PR count via GraphQL (more efficient than listing all PRs).
   */
  async getOpenPRCount(owner: string, repo: string): Promise<number> {
    const result: { repository: { pullRequests: { totalCount: number } } } =
      await this.gql(
        `query($owner:String!,$repo:String!){
          repository(owner:$owner,name:$repo){
            pullRequests(states:OPEN){ totalCount }
          }
        }`,
        { owner, repo }
      );
    return result.repository.pullRequests.totalCount;
  }

  /**
   * Fetch contributors (top N by contribution count).
   */
  async getContributors(owner: string, repo: string, perPage = 30) {
    const { data } = await this.octokit.repos.listContributors({
      owner,
      repo,
      per_page: perPage,
    });
    return data.map((c) => ({
      login: c.login ?? 'unknown',
      github_id: c.id,
      avatar_url: c.avatar_url,
      contributions: c.contributions,
    }));
  }

  /**
   * Fetch commits for the last 30 days (for heatmap).
   * Returns aggregated count per day.
   */
  async getCommitsByDay(
    owner: string,
    repo: string,
    sinceDays = 30
  ): Promise<Map<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);

    const counts = new Map<string, number>();
    const iterator = this.octokit.paginate.iterator(
      this.octokit.repos.listCommits,
      {
        owner,
        repo,
        since: since.toISOString(),
        per_page: 100,
      }
    );

    for await (const { data } of iterator) {
      for (const commit of data) {
        const date = commit.commit.author?.date ?? commit.commit.committer?.date;
        if (!date) continue;
        const day = date.substring(0, 10);
        counts.set(day, (counts.get(day) ?? 0) + 1);
      }
    }
    return counts;
  }

  /**
   * Get current rate limit info (for monitoring).
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const { data } = await this.octokit.rateLimit.get();
    return {
      remaining: data.rate.remaining,
      limit: data.rate.limit,
      resetAt: new Date(data.rate.reset * 1000),
    };
  }
}

// Singleton instance using personal token (MVP)
let defaultInstance: GitHubService | null = null;
export function getDefaultGitHubService(): GitHubService {
  if (!defaultInstance) defaultInstance = new GitHubService();
  return defaultInstance;
}
