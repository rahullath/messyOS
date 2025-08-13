// src/lib/intelligence/performance-optimizer.ts - Performance Optimization Layer
// Adds caching, parallel execution, streaming responses, and smart prompt optimization

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getUserContext, type UnifiedUserContext } from './unified-context';
import { createAutonomousActionsEngine, processConversationForAutonomousActions } from './autonomous-actions';

interface OptimizedResponse {
  response: string;
  executionTime: number;
  cacheHit: boolean;
  actionsExecuted: number;
  tokensUsed?: number;
  streamingEnabled: boolean;
}

interface ConversationCache {
  key: string;
  response: string;
  timestamp: number;
  context_hash: string;
  expiry: number;
}

interface PromptOptimization {
  original_length: number;
  optimized_length: number;
  compression_ratio: number;
  key_points: string[];
}

class PerformanceOptimizer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationCache: Map<string, ConversationCache> = new Map();
  private contextCache: Map<string, { context: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_SIZE = 50;
  private readonly MAX_PROMPT_LENGTH = 8000; // Optimize for Gemini performance
  private readonly STREAMING_THRESHOLD = 100; // Enable streaming for responses > 100 chars

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // Use flash for speed, pro for complex reasoning
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024, // Limit for faster responses
      }
    });
  }

  // Main optimized chat interface
  async optimizedChat(
    cookies: any,
    userId: string,
    userMessage: string,
    enableStreaming = true
  ): Promise<OptimizedResponse> {
    const startTime = Date.now();
    
    // Check conversation cache first
    const cacheKey = this.generateCacheKey(userId, userMessage);
    const cachedResponse = this.getCachedResponse(cacheKey);
    
    if (cachedResponse) {
      return {
        response: cachedResponse.response,
        executionTime: Date.now() - startTime,
        cacheHit: true,
        actionsExecuted: 0,
        streamingEnabled: false
      };
    }

    // Get optimized context (cached or fresh)
    const context = await this.getOptimizedContext(cookies, userId);
    
    // Optimize prompt for performance
    const optimizedPrompt = this.optimizePrompt(userMessage, context);
    
    // Generate response (with streaming if enabled)
    let response: string;
    let tokensUsed = 0;
    
    if (enableStreaming && this.shouldEnableStreaming(userMessage)) {
      response = await this.generateStreamingResponse(optimizedPrompt);
    } else {
      const result = await this.model.generateContent(optimizedPrompt.prompt);
      response = result.response.text();
      tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
    }

    // Process autonomous actions in parallel
    const actionsPromise = this.processAutonomousActions(
      cookies, userId, userMessage, response, context
    );

    // Cache the response
    this.cacheResponse(cacheKey, response, context);

    // Wait for actions to complete
    const actions = await actionsPromise;

    const executionTime = Date.now() - startTime;
    
    console.log(`⚡ Optimized chat completed in ${executionTime}ms, ${actions.length} actions executed`);

    return {
      response,
      executionTime,
      cacheHit: false,
      actionsExecuted: actions.length,
      tokensUsed,
      streamingEnabled: enableStreaming && this.shouldEnableStreaming(userMessage)
    };
  }

  // Get optimized context with intelligent caching
  private async getOptimizedContext(cookies: any, userId: string): Promise<UnifiedUserContext> {
    const cacheKey = `context_${userId}`;
    const cached = this.contextCache.get(cacheKey);
    
    // Use cached context if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📊 Using cached context for user:', userId);
      return cached.context;
    }

    // Fetch fresh context with unified data fetching
    const context = await getUserContext(cookies, userId);
    
    // Cache for future use
    this.contextCache.set(cacheKey, {
      context,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanContextCache();

    return context;
  }

  // Optimize prompts for better performance and accuracy
  private optimizePrompt(userMessage: string, context: UnifiedUserContext): {
    prompt: string;
    optimization: PromptOptimization;
  } {
    const originalPrompt = this.buildFullPrompt(userMessage, context);
    
    if (originalPrompt.length <= this.MAX_PROMPT_LENGTH) {
      return {
        prompt: originalPrompt,
        optimization: {
          original_length: originalPrompt.length,
          optimized_length: originalPrompt.length,
          compression_ratio: 1.0,
          key_points: ['No optimization needed']
        }
      };
    }

    // Compress context intelligently
    const compressedContext = this.compressContext(context);
    const optimizedPrompt = this.buildOptimizedPrompt(userMessage, compressedContext);
    
    const optimization: PromptOptimization = {
      original_length: originalPrompt.length,
      optimized_length: optimizedPrompt.length,
      compression_ratio: optimizedPrompt.length / originalPrompt.length,
      key_points: this.extractKeyPoints(context)
    };

    console.log(`🔧 Prompt optimized: ${originalPrompt.length} → ${optimizedPrompt.length} chars (${Math.round(optimization.compression_ratio * 100)}%)`);

    return { prompt: optimizedPrompt, optimization };
  }

  // Build full system prompt with complete context
  private buildFullPrompt(userMessage: string, context: UnifiedUserContext): string {
    const currentTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `You are Mesh, an advanced AI life optimizer and therapist. You provide intelligent, empathetic, and actionable guidance.

CURRENT CONTEXT:
- Time: ${currentTime}
- User: ${context.profile.email}
- Subscription: ${context.profile.subscription_status}
- Activity Level: ${context.performance_stats.activity_level}
- Consistency Score: ${context.performance_stats.consistency_score}%

TASKS STATUS:
- Active: ${context.tasks.active.length}
- High Priority: ${context.tasks.high_priority.length}
- Overdue: ${context.tasks.overdue.length}
- Completion Rate: ${context.tasks.completion_rate}%

HABITS STATUS:
- Active Habits: ${context.habits.active.length}
- Completion Rate: ${context.habits.completion_rate}%
- Recent Entries: ${context.habits.entries.slice(0, 10).length}

HEALTH STATUS:
- Average Sleep: ${context.health.summary.avg_sleep.toFixed(1)}h
- Average Mood: ${context.health.summary.avg_mood.toFixed(1)}/10
- Average Energy: ${context.health.summary.avg_energy.toFixed(1)}/10

RECENT ACTIVITY:
${this.formatRecentActivity(context)}

AI CAPABILITIES:
You can autonomously:
1. Create tasks: Use JSON format {"action": "create_task", "task": {"title": "...", "category": "...", "priority": "...", "due_date": "YYYY-MM-DD"}}
2. Log habits when mentioned
3. Record metrics when user shares data
4. Create reminders and appointments

CONVERSATION MEMORY:
${context.ai_memory.recent_conversations.slice(0, 3).map(c => 
  `Previous: "${c.user_message}" → "${c.ai_response?.substring(0, 100)}..."`
).join('\n')}

YOUR PERSONALITY:
- Warm, empathetic therapist
- Direct productivity coach  
- Insightful data analyst
- Proactive but not overwhelming
- Remember personal context

USER MESSAGE: ${userMessage}

Respond as Mesh with empathy, intelligence, and actionable advice. Include autonomous actions in JSON format when appropriate.`;
  }

  // Build optimized prompt for large contexts
  private buildOptimizedPrompt(userMessage: string, compressedContext: any): string {
    const currentTime = new Date().toLocaleTimeString('en-GB');
    
    return `You are Mesh, an AI life optimizer. Current time: ${currentTime}

USER PROFILE:
- Activity: ${compressedContext.activity_level}
- Consistency: ${compressedContext.consistency_score}%
- Status: ${compressedContext.status_summary}

KEY DATA:
${compressedContext.key_insights.join('\n')}

AUTONOMOUS ACTIONS:
Create tasks: {"action": "create_task", "task": {...}}
Log habits: Detect habit mentions and log automatically
Record metrics: Extract numerical data from conversation

RECENT CONTEXT:
${compressedContext.recent_summary}

USER MESSAGE: ${userMessage}

Respond with empathy and actionable advice. Include autonomous actions when appropriate.`;
  }

  // Compress context for large prompts
  private compressContext(context: UnifiedUserContext): any {
    const keyInsights = [];
    
    // Task insights
    if (context.tasks.overdue.length > 0) {
      keyInsights.push(`⚠️ ${context.tasks.overdue.length} overdue tasks`);
    }
    if (context.tasks.high_priority.length > 0) {
      keyInsights.push(`🔥 ${context.tasks.high_priority.length} high-priority tasks`);
    }
    
    // Habit insights
    if (context.habits.completion_rate < 50) {
      keyInsights.push(`📉 Habit completion low (${context.habits.completion_rate}%)`);
    }
    
    // Health insights
    if (context.health.summary.avg_sleep < 7) {
      keyInsights.push(`😴 Sleep below optimal (${context.health.summary.avg_sleep.toFixed(1)}h)`);
    }
    
    // Recent activity summary
    const recentTasks = context.tasks.active.slice(0, 3).map(t => t.title);
    const recentHabits = context.habits.active.slice(0, 3).map(h => h.name);
    
    return {
      activity_level: context.performance_stats.activity_level,
      consistency_score: context.performance_stats.consistency_score,
      status_summary: `${context.tasks.active.length} tasks, ${context.habits.active.length} habits`,
      key_insights: keyInsights,
      recent_summary: `Recent tasks: ${recentTasks.join(', ')}. Active habits: ${recentHabits.join(', ')}`
    };
  }

  // Extract key points from context
  private extractKeyPoints(context: UnifiedUserContext): string[] {
    const points = [];
    
    points.push(`${context.tasks.active.length} active tasks`);
    points.push(`${context.habits.active.length} active habits`);
    points.push(`${context.performance_stats.consistency_score}% consistency`);
    
    if (context.tasks.overdue.length > 0) {
      points.push(`${context.tasks.overdue.length} overdue items`);
    }
    
    return points;
  }

  // Format recent activity for context
  private formatRecentActivity(context: UnifiedUserContext): string {
    const activities = [];
    
    // Recent tasks
    context.tasks.active.slice(0, 2).forEach(task => {
      activities.push(`Task: ${task.title} (${task.priority})`);
    });
    
    // Recent habits
    context.habits.entries.slice(0, 2).forEach(entry => {
      const habit = context.habits.active.find(h => h.id === entry.habit_id);
      if (habit) {
        activities.push(`Habit: ${habit.name} logged`);
      }
    });
    
    return activities.join('\n') || 'No recent activity';
  }

  // Generate streaming response for better UX
  private async generateStreamingResponse(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContentStream(prompt);
      
      let response = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        response += chunkText;
        // In a real implementation, you'd emit these chunks to the client
      }
      
      return response;
    } catch (error) {
      console.error('Streaming generation error:', error);
      // Fallback to regular generation
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    }
  }

  // Determine if streaming should be enabled
  private shouldEnableStreaming(userMessage: string): boolean {
    // Enable streaming for longer user messages or complex queries
    return userMessage.length > this.STREAMING_THRESHOLD ||
           /explain|analyze|detailed|comprehensive/.test(userMessage.toLowerCase());
  }

  // Process autonomous actions in parallel
  private async processAutonomousActions(
    cookies: any,
    userId: string,
    userMessage: string,
    aiResponse: string,
    context: UnifiedUserContext
  ) {
    try {
      return await processConversationForAutonomousActions(
        cookies, userId, userMessage, aiResponse
      );
    } catch (error) {
      console.error('Error processing autonomous actions:', error);
      return [];
    }
  }

  // Cache management
  private generateCacheKey(userId: string, message: string): string {
    // Create a hash-like key for the message
    const messageHash = message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .slice(0, 5)
      .join('_');
    
    return `${userId}_${messageHash}`;
  }

  private getCachedResponse(cacheKey: string): ConversationCache | null {
    const cached = this.conversationCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      console.log('💾 Cache hit for conversation');
      return cached;
    }
    
    if (cached) {
      this.conversationCache.delete(cacheKey);
    }
    
    return null;
  }

  private cacheResponse(cacheKey: string, response: string, context: UnifiedUserContext): void {
    // Don't cache very short responses or error responses
    if (response.length < 50 || response.toLowerCase().includes('error')) {
      return;
    }

    // Clean cache if it's getting too large
    if (this.conversationCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.conversationCache.keys().next().value;
      this.conversationCache.delete(oldestKey);
    }

    // Create context hash for cache invalidation
    const contextHash = this.createContextHash(context);

    this.conversationCache.set(cacheKey, {
      key: cacheKey,
      response,
      timestamp: Date.now(),
      context_hash: contextHash,
      expiry: Date.now() + this.CACHE_DURATION
    });
  }

  private createContextHash(context: UnifiedUserContext): string {
    // Simple hash of key context elements
    const hashString = `${context.tasks.total_count}_${context.habits.total_count}_${context.cached_at}`;
    return Buffer.from(hashString).toString('base64').slice(0, 8);
  }

  private cleanContextCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.contextCache.entries()) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.contextCache.delete(key);
      }
    }
  }

  // Performance monitoring
  getPerformanceStats() {
    const conversationCacheHits = Array.from(this.conversationCache.values()).length;
    const contextCacheHits = Array.from(this.contextCache.values()).length;
    
    return {
      conversation_cache: {
        size: this.conversationCache.size,
        hits: conversationCacheHits,
        hit_rate: this.conversationCache.size > 0 ? conversationCacheHits / this.conversationCache.size : 0
      },
      context_cache: {
        size: this.contextCache.size,
        hits: contextCacheHits
      },
      optimization: {
        max_prompt_length: this.MAX_PROMPT_LENGTH,
        streaming_enabled: true,
        cache_duration_minutes: this.CACHE_DURATION / (1000 * 60)
      }
    };
  }

  // Clear all caches
  clearAllCaches(): void {
    this.conversationCache.clear();
    this.contextCache.clear();
    console.log('🧹 All performance caches cleared');
  }

  // Batch optimization for multiple requests
  async batchOptimizedRequests(
    requests: Array<{
      cookies: any;
      userId: string;
      message: string;
    }>
  ): Promise<OptimizedResponse[]> {
    console.log(`🔄 Processing ${requests.length} requests in batch`);
    
    // Process requests in parallel with concurrency limit
    const concurrencyLimit = 3;
    const results: OptimizedResponse[] = [];
    
    for (let i = 0; i < requests.length; i += concurrencyLimit) {
      const batch = requests.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(req => this.optimizedChat(req.cookies, req.userId, req.message, false))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Singleton instance for reuse
let performanceOptimizer: PerformanceOptimizer | null = null;

// Factory function
export function getPerformanceOptimizer(apiKey: string): PerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new PerformanceOptimizer(apiKey);
  }
  return performanceOptimizer;
}

// Convenience function for optimized chat
export async function optimizedAIChat(
  cookies: any,
  userId: string,
  userMessage: string,
  apiKey: string,
  enableStreaming = true
): Promise<OptimizedResponse> {
  const optimizer = getPerformanceOptimizer(apiKey);
  return optimizer.optimizedChat(cookies, userId, userMessage, enableStreaming);
}

// Export types
export type { OptimizedResponse, ConversationCache, PromptOptimization };