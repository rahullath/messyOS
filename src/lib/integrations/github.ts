// src/lib/integrations/github.ts - GitHub Integration for meshOS
// Tracks coding activity, analyzes commits, and provides learning suggestions

import { createSupabaseClient } from '../supabase/client';

export interface GitHubProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  repository: {
    name: string;
    full_name: string;
    private: boolean;
    language: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  language: string;
  stars: number;
  forks: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  topics: string[];
}

export interface CodingActivity {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
  repositories_touched: number;
  languages_used: string[];
  productivity_score: number;
}

export interface LearningInsight {
  type: 'language_suggestion' | 'project_idea' | 'skill_gap' | 'productivity_tip';
  title: string;
  description: string;
  confidence: number;
  actionable_steps: string[];
  related_repos?: string[];
}

class GitHubIntegration {
  private supabase = createSupabaseClient();
  private baseUrl = 'https://api.github.com';

  /**
   * Initiate GitHub OAuth flow
   */
  async initiateOAuth(): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitHub OAuth not configured. Please set GITHUB_CLIENT_ID in environment variables.');
    }

    const scopes = ['user:email', 'repo', 'read:user'];
    const state = Math.random().toString(36).substring(7);
    
    // Store state for verification
    localStorage.setItem('github_oauth_state', state);
    
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/auth/github/callback`);

    return authUrl.toString();
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify state
      const storedState = localStorage.getItem('github_oauth_state');
      if (state !== storedState) {
        return { success: false, error: 'Invalid OAuth state' };
      }

      // Exchange code for token
      const response = await fetch('/api/auth/github/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      if (data.success) {
        // Store token securely and sync user data
        await this.syncUserProfile(data.access_token);
        localStorage.removeItem('github_oauth_state');
        return { success: true };
      }

      return { success: false, error: data.error || 'OAuth exchange failed' };
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      return { success: false, error: 'Failed to complete GitHub authentication' };
    }
  }

  /**
   * Sync user's GitHub profile and repositories
   */
  async syncUserProfile(accessToken: string): Promise<GitHubProfile | null> {
    try {
      // Get user profile
      const profileResponse = await fetch(`${this.baseUrl}/user`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch GitHub profile');
      }

      const profile = await profileResponse.json();

      // Store profile in database
      const { error } = await this.supabase
        .from('github_profiles')
        .upsert({
          user_id: (await this.supabase.auth.getUser()).data.user?.id,
          github_id: profile.id,
          username: profile.login,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          public_repos: profile.public_repos,
          followers: profile.followers,
          following: profile.following,
          github_created_at: profile.created_at,
          access_token: accessToken, // Store encrypted in production
          last_synced: new Date().toISOString()
        });

      if (error) throw error;

      // Sync repositories in background
      this.syncRepositories(accessToken);

      return {
        id: profile.id,
        username: profile.login,
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };
    } catch (error) {
      console.error('Error syncing GitHub profile:', error);
      return null;
    }
  }

  /**
   * Sync user's repositories
   */
  async syncRepositories(accessToken: string): Promise<GitHubRepository[]> {
    try {
      const repositories: GitHubRepository[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const response = await fetch(
          `${this.baseUrl}/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!response.ok) break;

        const repos = await response.json();
        if (repos.length === 0) break;

        // Store repositories
        for (const repo of repos) {
          const { error } = await this.supabase
            .from('github_repositories')
            .upsert({
              user_id: (await this.supabase.auth.getUser()).data.user?.id,
              github_repo_id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              private: repo.private,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              size: repo.size,
              topics: repo.topics || [],
              github_created_at: repo.created_at,
              github_updated_at: repo.updated_at,
              github_pushed_at: repo.pushed_at,
              last_synced: new Date().toISOString()
            });

          if (!error) {
            repositories.push({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              private: repo.private,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              created_at: repo.created_at,
              updated_at: repo.updated_at,
              pushed_at: repo.pushed_at,
              size: repo.size,
              topics: repo.topics || []
            });
          }
        }

        page++;
      }

      return repositories;
    } catch (error) {
      console.error('Error syncing repositories:', error);
      return [];
    }
  }

  /**
   * Sync recent commits from user's repositories
   */
  async syncRecentCommits(accessToken: string, days: number = 30): Promise<GitHubCommit[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get user's repositories
      const { data: repos } = await this.supabase
        .from('github_repositories')
        .select('name, full_name, language')
        .eq('user_id', (await this.supabase.auth.getUser()).data.user?.id);

      if (!repos) return [];

      const commits: GitHubCommit[] = [];

      // Get commits from each repository (limit to most active repos)
      for (const repo of repos.slice(0, 20)) {
        try {
          const response = await fetch(
            `${this.baseUrl}/repos/${repo.full_name}/commits?since=${since.toISOString()}&author=${repo.full_name.split('/')[0]}`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );

          if (!response.ok) continue;

          const repoCommits = await response.json();

          for (const commit of repoCommits.slice(0, 50)) {
            // Get detailed commit info
            const detailResponse = await fetch(commit.url, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (detailResponse.ok) {
              const detail = await detailResponse.json();

              const commitData: GitHubCommit = {
                sha: commit.sha,
                message: commit.commit.message,
                author: {
                  name: commit.commit.author.name,
                  email: commit.commit.author.email,
                  date: commit.commit.author.date
                },
                url: commit.html_url,
                additions: detail.stats?.additions || 0,
                deletions: detail.stats?.deletions || 0,
                changed_files: detail.files?.length || 0,
                repository: {
                  name: repo.name,
                  full_name: repo.full_name,
                  private: false, // We'll only sync public repos for privacy
                  language: repo.language
                }
              };

              // Store commit
              await this.supabase
                .from('github_commits')
                .upsert({
                  user_id: (await this.supabase.auth.getUser()).data.user?.id,
                  sha: commit.sha,
                  message: commit.commit.message,
                  author_name: commit.commit.author.name,
                  author_email: commit.commit.author.email,
                  committed_at: commit.commit.author.date,
                  additions: detail.stats?.additions || 0,
                  deletions: detail.stats?.deletions || 0,
                  changed_files: detail.files?.length || 0,
                  repository_name: repo.name,
                  repository_full_name: repo.full_name,
                  repository_language: repo.language,
                  commit_url: commit.html_url
                });

              commits.push(commitData);
            }
          }
        } catch (error) {
          console.error(`Error syncing commits for ${repo.full_name}:`, error);
        }
      }

      return commits;
    } catch (error) {
      console.error('Error syncing commits:', error);
      return [];
    }
  }

  /**
   * Calculate daily coding activity
   */
  async calculateCodingActivity(userId: string, days: number = 30): Promise<CodingActivity[]> {
    try {
      const { data: commits } = await this.supabase
        .from('github_commits')
        .select('*')
        .eq('user_id', userId)
        .gte('committed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('committed_at', { ascending: true });

      if (!commits) return [];

      // Group by date
      const dailyActivity: { [date: string]: CodingActivity } = {};

      commits.forEach(commit => {
        const date = commit.committed_at.split('T')[0];
        
        if (!dailyActivity[date]) {
          dailyActivity[date] = {
            date,
            commits: 0,
            additions: 0,
            deletions: 0,
            repositories_touched: 0,
            languages_used: [],
            productivity_score: 0
          };
        }

        const activity = dailyActivity[date];
        activity.commits++;
        activity.additions += commit.additions;
        activity.deletions += commit.deletions;

        // Track unique repositories
        const repoSet = new Set(commits
          .filter(c => c.committed_at.startsWith(date))
          .map(c => c.repository_name)
        );
        activity.repositories_touched = repoSet.size;

        // Track languages
        if (commit.repository_language && !activity.languages_used.includes(commit.repository_language)) {
          activity.languages_used.push(commit.repository_language);
        }

        // Calculate productivity score (commits + lines changed + repo diversity)
        activity.productivity_score = Math.round(
          (activity.commits * 10) + 
          (Math.sqrt(activity.additions + activity.deletions) * 2) +
          (activity.repositories_touched * 5) +
          (activity.languages_used.length * 3)
        );
      });

      return Object.values(dailyActivity).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error calculating coding activity:', error);
      return [];
    }
  }

  /**
   * Generate learning insights based on coding patterns
   */
  async generateLearningInsights(userId: string): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];

      // Get recent activity data
      const activity = await this.calculateCodingActivity(userId, 90);
      const { data: repos } = await this.supabase
        .from('github_repositories')
        .select('*')
        .eq('user_id', userId);

      if (!repos || activity.length === 0) return insights;

      // Language diversity analysis
      const languageUsage: { [lang: string]: number } = {};
      activity.forEach(day => {
        day.languages_used.forEach(lang => {
          languageUsage[lang] = (languageUsage[lang] || 0) + 1;
        });
      });

      const totalDays = activity.length;
      const primaryLanguages = Object.entries(languageUsage)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      // Suggest complementary languages
      if (primaryLanguages.length > 0) {
        const [topLang] = primaryLanguages[0];
        const complementaryLanguages = this.getComplementaryLanguages(topLang);
        
        if (complementaryLanguages.length > 0) {
          insights.push({
            type: 'language_suggestion',
            title: `Expand your ${topLang} skills`,
            description: `Based on your ${topLang} activity, consider learning ${complementaryLanguages.join(', ')} to broaden your tech stack.`,
            confidence: 0.8,
            actionable_steps: [
              `Start a small ${complementaryLanguages[0]} project`,
              `Complete an online tutorial`,
              `Contribute to open source projects using ${complementaryLanguages[0]}`
            ]
          });
        }
      }

      // Productivity pattern analysis
      const avgCommitsPerDay = activity.reduce((sum, day) => sum + day.commits, 0) / totalDays;
      const avgProductivityScore = activity.reduce((sum, day) => sum + day.productivity_score, 0) / totalDays;

      if (avgCommitsPerDay < 2) {
        insights.push({
          type: 'productivity_tip',
          title: 'Increase daily coding consistency',
          description: `Your average of ${avgCommitsPerDay.toFixed(1)} commits per day could be improved with regular coding habits.`,
          confidence: 0.9,
          actionable_steps: [
            'Set a daily coding goal (even 30 minutes)',
            'Use GitHub contribution calendar as motivation',
            'Break large features into smaller, daily commits'
          ]
        });
      }

      // Project diversity analysis
      const repoCount = repos.length;
      const recentRepos = repos.filter(r => {
        const pushDate = new Date(r.github_pushed_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return pushDate > monthAgo;
      }).length;

      if (recentRepos < 2 && repoCount > 5) {
        insights.push({
          type: 'project_idea',
          title: 'Revive dormant projects',
          description: `You have ${repoCount - recentRepos} repositories that haven't been updated recently. Consider updating or archiving them.`,
          confidence: 0.7,
          actionable_steps: [
            'Review old repositories for improvement opportunities',
            'Update documentation and dependencies',
            'Archive projects you no longer maintain'
          ],
          related_repos: repos
            .filter(r => new Date(r.github_pushed_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .slice(0, 3)
            .map(r => r.full_name)
        });
      }

      // Skill gap analysis based on trending technologies
      const trendingTechs = ['AI/ML', 'WebAssembly', 'GraphQL', 'Serverless', 'Kubernetes'];
      const userTechs = Object.keys(languageUsage);
      const gapTechs = trendingTechs.filter(tech => 
        !userTechs.some(userTech => userTech.toLowerCase().includes(tech.toLowerCase()))
      );

      if (gapTechs.length > 0) {
        insights.push({
          type: 'skill_gap',
          title: 'Trending technology opportunities',
          description: `Consider exploring ${gapTechs.slice(0, 2).join(' and ')} to stay current with industry trends.`,
          confidence: 0.6,
          actionable_steps: [
            `Research ${gapTechs[0]} fundamentals`,
            'Build a learning project incorporating new technology',
            'Join relevant communities and follow thought leaders'
          ]
        });
      }

      return insights.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error generating learning insights:', error);
      return [];
    }
  }

  /**
   * Get complementary languages for a given primary language
   */
  private getComplementaryLanguages(primaryLanguage: string): string[] {
    const complementaryMap: { [key: string]: string[] } = {
      'JavaScript': ['TypeScript', 'Python', 'Go'],
      'Python': ['JavaScript', 'Rust', 'Go'],
      'Java': ['Kotlin', 'Scala', 'Python'],
      'C++': ['Rust', 'Go', 'Python'],
      'TypeScript': ['Python', 'Go', 'Rust'],
      'Go': ['Rust', 'Python', 'JavaScript'],
      'Rust': ['Go', 'Python', 'C++'],
      'PHP': ['Python', 'JavaScript', 'Go'],
      'Ruby': ['Python', 'JavaScript', 'Go'],
      'Swift': ['Kotlin', 'Dart', 'JavaScript'],
      'Kotlin': ['Swift', 'Dart', 'Python']
    };

    return complementaryMap[primaryLanguage] || ['Python', 'JavaScript', 'Go'];
  }

  /**
   * Get user's GitHub integration status
   */
  async getIntegrationStatus(userId: string): Promise<{
    connected: boolean;
    profile?: GitHubProfile;
    lastSync?: string;
    repoCount?: number;
    commitCount?: number;
  }> {
    try {
      const { data: profile } = await this.supabase
        .from('github_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return { connected: false };
      }

      const { count: repoCount } = await this.supabase
        .from('github_repositories')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      const { count: commitCount } = await this.supabase
        .from('github_commits')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      return {
        connected: true,
        profile: {
          id: profile.github_id,
          username: profile.username,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          public_repos: profile.public_repos,
          followers: profile.followers,
          following: profile.following,
          created_at: profile.github_created_at,
          updated_at: profile.last_synced
        },
        lastSync: profile.last_synced,
        repoCount: repoCount || 0,
        commitCount: commitCount || 0
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      return { connected: false };
    }
  }

  /**
   * Trigger full sync of GitHub data
   */
  async triggerFullSync(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('github_profiles')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (!profile?.access_token) {
        return false;
      }

      // Sync profile, repositories, and commits
      await Promise.all([
        this.syncUserProfile(profile.access_token),
        this.syncRepositories(profile.access_token),
        this.syncRecentCommits(profile.access_token, 90)
      ]);

      return true;
    } catch (error) {
      console.error('Error triggering full sync:', error);
      return false;
    }
  }
}

// Export singleton instance
export const githubIntegration = new GitHubIntegration();

// Helper functions
export const connectGitHub = () => githubIntegration.initiateOAuth();
export const getGitHubActivity = (userId: string, days?: number) => 
  githubIntegration.calculateCodingActivity(userId, days);
export const getGitHubInsights = (userId: string) => 
  githubIntegration.generateLearningInsights(userId);
export const getGitHubStatus = (userId: string) => 
  githubIntegration.getIntegrationStatus(userId);

export default githubIntegration;