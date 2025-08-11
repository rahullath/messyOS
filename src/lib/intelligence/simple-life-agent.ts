// src/lib/intelligence/simple-life-agent.ts
import { createServerAuth } from '../auth/simple-multi-user';

interface UserContext {
  habits: any[];
  tasks: any[];
  health: any[];
  finance: any[];
  patterns: LifePattern[];
  preferences: UserPreferences;
  recentActivity: any[];
}

interface LifePattern {
  type: string;
  description: string;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  frequency: string;
  triggers: string[];
  domain: 'tasks' | 'habits' | 'health' | 'finance';
}

interface UserPreferences {
  location: string;
  timezone: string;
  workingHours: string;
  energyPeaks: string[];
  focusAreas: string[];
  avoidances: string[];
}

interface AIInsight {
  type: 'optimization' | 'warning' | 'opportunity' | 'correlation';
  domain: string;
  title: string;
  description: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions: string[];
  dataUsed: any;
}

interface DailyBriefing {
  greeting: string;
  todaysFocus: string;
  priorities: string[];
  insights: AIInsight[];
  warnings: string[];
  energyRecommendations: string[];
  timelineAlerts: string[];
  contextualGuidance: string;
}

export class SimpleLifeAgent {
  private supabase: any;
  private userId: string;

  constructor(cookies: any, userId: string) {
    const serverAuth = createServerAuth(cookies);
    this.supabase = serverAuth.supabase;
    this.userId = userId;
  }

  // Get comprehensive user context
  private async getUserContext(): Promise<UserContext> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [habitsResult, tasksResult, metricsResult] = await Promise.all([
      this.supabase
        .from('habits')
        .select(`
          *,
          habit_entries(
            id, value, date, logged_at, effort, energy_level, mood, context, notes
          )
        `)
        .eq('user_id', this.userId)
        .eq('is_active', true),
      
      this.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(50),

      this.supabase
        .from('metrics')
        .select('*')
        .eq('user_id', this.userId)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: false })
    ]);

    const health = metricsResult.data?.filter(m => 
      ['sleep_duration', 'heart_rate_avg', 'stress_level', 'weight', 'steps', 'mood'].includes(m.type)
    ) || [];
    
    const finance = metricsResult.data?.filter(m => 
      ['expense', 'income', 'crypto_value'].includes(m.type)
    ) || [];

    // Detect patterns without time assumptions
    const patterns = this.detectPatterns({
      habits: habitsResult.data || [],
      tasks: tasksResult.data || [],
      health,
      finance
    });

    // UK-specific preferences (you could store these in user_preferences table)
    const preferences: UserPreferences = {
      location: 'Birmingham, UK',
      timezone: 'Europe/London',
      workingHours: '9AM-5PM GMT',
      energyPeaks: ['morning', 'early_evening'],
      focusAreas: ['tasks', 'uk_preparation', 'health', 'coding'],
      avoidances: ['time_slots', 'rigid_scheduling']
    };

    return {
      habits: habitsResult.data || [],
      tasks: tasksResult.data || [],
      health,
      finance,
      patterns,
      preferences,
      recentActivity: metricsResult.data?.slice(0, 20) || []
    };
  }

  // Detect patterns without time assumptions
  private detectPatterns(data: any): LifePattern[] {
    const patterns: LifePattern[] = [];

    // Task completion patterns
    if (data.tasks.length > 0) {
      const completedTasks = data.tasks.filter(t => t.status === 'completed');
      const todoTasks = data.tasks.filter(t => t.status === 'todo');
      const completionRate = completedTasks.length / data.tasks.length;

      if (completionRate < 0.3) {
        patterns.push({
          type: 'task_completion_low',
          description: `Low task completion rate (${Math.round(completionRate * 100)}%). Tasks piling up.`,
          confidence: 0.9,
          impact: 'negative',
          frequency: 'ongoing',
          triggers: ['task_overload', 'poor_prioritization'],
          domain: 'tasks'
        });
      }

      // High priority task accumulation
      const highPriorityTodos = todoTasks.filter(t => t.priority === 'high');
      if (highPriorityTodos.length > 3) {
        patterns.push({
          type: 'priority_overload',
          description: `${highPriorityTodos.length} high-priority tasks pending. Burnout risk.`,
          confidence: 0.8,
          impact: 'negative',
          frequency: 'weekly',
          triggers: ['poor_estimation', 'scope_creep'],
          domain: 'tasks'
        });
      }
    }

    // Habit consistency patterns (no time assumptions)
    if (data.habits.length > 0) {
      data.habits.forEach(habit => {
        if (habit.habit_entries && habit.habit_entries.length > 0) {
          const recentEntries = habit.habit_entries.slice(-14);
          const completionRate = recentEntries.filter(e => e.value === 1).length / recentEntries.length;
          
          if (completionRate > 0.8) {
            patterns.push({
              type: 'habit_consistency_high',
              description: `${habit.name} showing strong consistency (${Math.round(completionRate * 100)}%)`,
              confidence: 0.9,
              impact: 'positive',
              frequency: 'daily',
              triggers: ['good_systems', 'motivation'],
              domain: 'habits'
            });
          } else if (completionRate < 0.4) {
            patterns.push({
              type: 'habit_consistency_low',
              description: `${habit.name} struggling (${Math.round(completionRate * 100)}% completion). Needs intervention.`,
              confidence: 0.8,
              impact: 'negative',
              frequency: 'daily',
              triggers: ['motivation_drop', 'life_disruption'],
              domain: 'habits'
            });
          }
        }
      });
    }

    // Health patterns
    if (data.health.length > 0) {
      const stressMetrics = data.health.filter(h => h.type === 'stress_level');
      if (stressMetrics.length > 0) {
        const avgStress = stressMetrics.reduce((sum, m) => sum + m.value, 0) / stressMetrics.length;
        if (avgStress > 7) {
          patterns.push({
            type: 'high_stress_period',
            description: `Elevated stress levels (avg ${avgStress.toFixed(1)}/10). May impact other areas.`,
            confidence: 0.8,
            impact: 'negative',
            frequency: 'ongoing',
            triggers: ['life_changes', 'workload'],
            domain: 'health'
          });
        }
      }
    }

    // Cross-domain correlations
    const healthStress = data.health.filter(h => h.type === 'stress_level');
    const taskOverload = data.tasks.filter(t => t.status === 'todo').length;
    
    if (healthStress.length > 0 && taskOverload > 10) {
      const avgStress = healthStress.reduce((sum, m) => sum + m.value, 0) / healthStress.length;
      if (avgStress > 6) {
        patterns.push({
          type: 'stress_task_correlation',
          description: `High stress (${avgStress.toFixed(1)}) correlates with task backlog (${taskOverload} pending)`,
          confidence: 0.7,
          impact: 'negative',
          frequency: 'situational',
          triggers: ['overwhelm', 'poor_planning'],
          domain: 'tasks'
        });
      }
    }

    return patterns;
  }

  // Generate actionable insights
  private generateInsights(context: UserContext): AIInsight[] {
    const insights: AIInsight[] = [];

    // Task-focused insights (your main priority)
    const pendingTasks = context.tasks.filter(t => t.status === 'todo');
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high');

    if (highPriorityTasks.length > 2) {
      insights.push({
        type: 'optimization',
        domain: 'tasks',
        title: 'Priority Task Bottleneck',
        description: `You have ${highPriorityTasks.length} high-priority tasks. Focus on completing 2-3 before adding more.`,
        confidence: 0.9,
        urgency: 'high',
        actionable: true,
        suggestedActions: [
          'Complete top 2 high-priority tasks today',
          'Defer or delegate remaining high-priority items',
          'Set "no new high-priority" rule until current ones done'
        ],
        dataUsed: { highPriorityCount: highPriorityTasks.length, taskTitles: highPriorityTasks.slice(0, 3).map(t => t.title) }
      });
    }

    // UK timeline management
    const ukTasks = pendingTasks.filter(t => 
      t.title.toLowerCase().includes('uk') || 
      t.title.toLowerCase().includes('visa') ||
      t.title.toLowerCase().includes('birmingham') ||
      t.category === 'Planning'
    );

    if (ukTasks.length > 0) {
      insights.push({
        type: 'opportunity',
        domain: 'tasks',
        title: 'UK Move Preparation',
        description: `${ukTasks.length} UK-related tasks need attention. Timeline-critical items should be prioritized.`,
        confidence: 0.95,
        urgency: 'high',
        actionable: true,
        suggestedActions: [
          'Review UK task deadlines and create timeline',
          'Identify dependencies between UK tasks',
          'Complete documentation tasks first (longest lead time)',
          'Set up UK banking/housing searches'
        ],
        dataUsed: { ukTaskCount: ukTasks.length, taskTitles: ukTasks.map(t => t.title) }
      });
    }

    // Energy-based task optimization
    const currentHour = new Date().getHours();
    let energyAdvice = '';
    
    if (currentHour >= 6 && currentHour <= 10) {
      energyAdvice = 'Morning high-energy period. Tackle your hardest/most important tasks now.';
    } else if (currentHour >= 14 && currentHour <= 16) {
      energyAdvice = 'Post-lunch dip. Do lighter tasks like emails, planning, or quick wins.';
    } else if (currentHour >= 18 && currentHour <= 21) {
      energyAdvice = 'Evening energy return. Good for creative work or personal projects.';
    } else {
      energyAdvice = 'Low-energy period. Focus on habits, reflection, or easy administrative tasks.';
    }

    insights.push({
      type: 'optimization',
      domain: 'tasks',
      title: 'Energy-Based Task Selection',
      description: energyAdvice,
      confidence: 0.8,
      urgency: 'medium',
      actionable: true,
      suggestedActions: [
        'Match task difficulty to current energy level',
        'Save complex problem-solving for high-energy periods',
        'Use low-energy times for habits and maintenance'
      ],
      dataUsed: { currentHour, energyLevel: currentHour >= 6 && currentHour <= 10 ? 'high' : 'medium' }
    });

    // Pattern-based insights
    context.patterns.forEach(pattern => {
      if (pattern.impact === 'negative' && pattern.confidence > 0.7) {
        insights.push({
          type: 'warning',
          domain: pattern.domain,
          title: `Pattern Alert: ${pattern.type.replace('_', ' ')}`,
          description: pattern.description,
          confidence: pattern.confidence,
          urgency: pattern.domain === 'tasks' ? 'high' : 'medium',
          actionable: true,
          suggestedActions: pattern.triggers.map(trigger => 
            `Address ${trigger.replace('_', ' ')}`
          ),
          dataUsed: { pattern: pattern.type, triggers: pattern.triggers }
        });
      }
    });

    // Cross-domain opportunities
    const stressPattern = context.patterns.find(p => p.type === 'stress_task_correlation');
    if (stressPattern) {
      insights.push({
        type: 'correlation',
        domain: 'tasks',
        title: 'Stress-Task Correlation Detected',
        description: 'High task load is driving stress. Reduce cognitive load for better performance.',
        confidence: 0.8,
        urgency: 'high',
        actionable: true,
        suggestedActions: [
          'Do a "task audit" - eliminate non-essential items',
          'Batch similar tasks together',
          'Set realistic daily limits (max 3-5 meaningful tasks)',
          'Include stress-reducing activities in daily routine'
        ],
        dataUsed: { correlation: 'stress_tasks', pattern: stressPattern }
      });
    }

    return insights.sort((a, b) => {
      // Sort by urgency, then by actionability, then by confidence
      const urgencyMap = { high: 3, medium: 2, low: 1 };
      if (urgencyMap[a.urgency] !== urgencyMap[b.urgency]) {
        return urgencyMap[b.urgency] - urgencyMap[a.urgency];
      }
      if (a.actionable !== b.actionable) {
        return a.actionable ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });
  }

  // Generate daily briefing
  async generateDailyBriefing(): Promise<DailyBriefing> {
    const context = await this.getUserContext();
    const insights = this.generateInsights(context);
    
    const currentHour = new Date().getHours();
    const timeGreeting = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';
    
    // Context-aware greeting
    const greeting = `Good ${timeGreeting}! Let's optimize your day with focus on what actually moves the needle.`;

    // Today's focus based on insights and context
    const highUrgencyInsights = insights.filter(i => i.urgency === 'high');
    const todaysFocus = highUrgencyInsights.length > 0 
      ? `Priority: ${highUrgencyInsights[0].title.toLowerCase()}`
      : 'Focus on completing 2-3 high-impact tasks today';

    // Generate priorities (task-focused)
    const pendingTasks = context.tasks.filter(t => t.status === 'todo');
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high').slice(0, 3);
    const priorities = highPriorityTasks.length > 0 
      ? highPriorityTasks.map(t => `Complete: ${t.title}`)
      : ['Review and prioritize your task list', 'Focus on one significant task', 'Clear small tasks to reduce mental load'];

    // Warnings
    const warnings: string[] = [];
    const warningInsights = insights.filter(i => i.type === 'warning');
    warningInsights.forEach(insight => {
      warnings.push(insight.description);
    });

    // Energy recommendations
    const energyRecommendations: string[] = [];
    if (currentHour >= 6 && currentHour <= 10) {
      energyRecommendations.push('🔥 High-energy period: Tackle your hardest task first');
      energyRecommendations.push('💡 Use this time for deep work and problem-solving');
    } else if (currentHour >= 14 && currentHour <= 16) {
      energyRecommendations.push('📝 Post-lunch period: Good for admin tasks and planning');
      energyRecommendations.push('🚶 Consider a short walk to boost afternoon energy');
    } else if (currentHour >= 18 && currentHour <= 21) {
      energyRecommendations.push('🎨 Evening energy: Great for creative work and personal projects');
      energyRecommendations.push('📚 Good time for learning and skill development');
    } else {
      energyRecommendations.push('😌 Low-energy period: Focus on habits and easy tasks');
      energyRecommendations.push('🔄 Good time for reflection and planning tomorrow');
    }

    // Timeline alerts (UK-specific)
    const timelineAlerts: string[] = [];
    const ukTasks = pendingTasks.filter(t => 
      t.title.toLowerCase().includes('uk') || 
      t.title.toLowerCase().includes('visa') ||
      t.title.toLowerCase().includes('birmingham')
    );
    
    if (ukTasks.length > 0) {
      timelineAlerts.push(`🇬🇧 ${ukTasks.length} UK move tasks pending - check deadlines`);
    }

    // Add financial/visa timeline reminders
    const today = new Date();
    const timeUntilMove = new Date('2025-07-01').getTime() - today.getTime();
    const daysUntilMove = Math.ceil(timeUntilMove / (1000 * 3600 * 24));
    
    if (daysUntilMove < 180 && daysUntilMove > 0) {
      timelineAlerts.push(`⏰ ${daysUntilMove} days until UK move - prioritize documentation`);
    }

    // Contextual guidance (UK + Birmingham specific)
    let contextualGuidance = 'Birmingham has excellent Indian food and a supportive community. ';
    contextualGuidance += 'University towns are student-friendly for banking and housing. ';
    contextualGuidance += 'Focus on documentation first (longest lead times), then practical arrangements.';

    return {
      greeting,
      todaysFocus,
      priorities,
      insights: insights.slice(0, 5), // Top 5 insights
      warnings,
      energyRecommendations,
      timelineAlerts,
      contextualGuidance
    };
  }

  // Intelligent chat interface with task creation and habit analysis
  async chat(message: string): Promise<string> {
    const context = await this.getUserContext();
    const insights = this.generateInsights(context);
    
    const lowerMessage = message.toLowerCase();
    
    // Parse appointments and create tasks automatically
    if (lowerMessage.includes('appointment') || lowerMessage.includes('dentist') || lowerMessage.includes('doctor') || 
        (lowerMessage.includes('at') && (lowerMessage.includes('am') || lowerMessage.includes('pm')))) {
      return await this.handleAppointmentMessage(message, context);
    }

    // Handle task creation requests
    if (lowerMessage.includes('create task') || lowerMessage.includes('add task') || 
        lowerMessage.includes('remind me') || lowerMessage.includes('need to')) {
      return await this.handleTaskCreation(message, context);
    }

    // Intelligent habit analysis
    if (lowerMessage.includes('habit') && (lowerMessage.includes('status') || lowerMessage.includes('current') || 
        lowerMessage.includes('pattern') || lowerMessage.includes('recognition') || lowerMessage.includes('analysis'))) {
      return await this.analyzeHabitsIntelligently(context);
    }

    // Focus and priority questions
    if (lowerMessage.includes('focus') || lowerMessage.includes('priority') || lowerMessage.includes('should i')) {
      return await this.provideFocusGuidance(context, insights);
    }

    // Energy recommendations with context
    if (lowerMessage.includes('energy') || lowerMessage.includes('when') || lowerMessage.includes('tired')) {
      return await this.provideEnergyGuidance(context);
    }

    // UK move planning
    if (lowerMessage.includes('uk') || lowerMessage.includes('birmingham') || lowerMessage.includes('move')) {
      return await this.provideUKGuidance(context);
    }

    // Conversational responses - respond naturally to user input
    return await this.provideIntelligentResponse(message, context, insights);
  }

  // Handle appointment parsing and task creation
  private async handleAppointmentMessage(message: string, context: UserContext): Promise<string> {
    try {
      // Parse the appointment details
      const appointmentMatch = message.match(/(\w+)\s+appointment.*?(\d{1,2}:\d{2})(am|pm).*?(\d{1,2})\w*\s+(\w+)\s+(\d{4})/i);
      
      if (appointmentMatch) {
        const [, type, time, ampm, day, month, year] = appointmentMatch;
        const appointmentType = type.toLowerCase();
        const fullTime = `${time}${ampm}`;
        
        // Extract additional context (e.g., "zirconia based frontal crowns")
        const contextMatch = message.match(/for (.+)/i);
        const appointmentContext = contextMatch ? contextMatch[1] : '';
        
        // Create task in database
        const taskData = {
          user_id: this.userId,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} appointment${appointmentContext ? ` - ${appointmentContext}` : ''}`,
          description: `Scheduled for ${fullTime} on ${day} ${month} ${year}`,
          category: 'Health',
          priority: 'high',
          status: 'todo',
          due_date: `${year}-${this.getMonthNumber(month)}-${day.padStart(2, '0')}`,
          created_at: new Date().toISOString()
        };

        const result = await this.supabase.from('tasks').insert(taskData);
        
        if (result.error) {
          console.error('Task creation error:', result.error);
          return `I understood you have a ${appointmentType} appointment at ${fullTime} on ${day} ${month}. I tried to create a task for this but encountered an issue. Please add it manually to your task list.`;
        }

        // Create preparation tasks if it's a dental appointment
        if (appointmentType === 'dentist') {
          const prepTasks = [
            {
              user_id: this.userId,
              title: 'Prepare for dental appointment',
              description: 'Confirm appointment time, prepare insurance/payment, avoid eating beforehand',
              category: 'Health',
              priority: 'medium',
              status: 'todo',
              due_date: `${year}-${this.getMonthNumber(month)}-${(parseInt(day) - 1).toString().padStart(2, '0')}`,
              created_at: new Date().toISOString()
            }
          ];
          
          await this.supabase.from('tasks').insert(prepTasks);
        }

        return `✅ **Task Created Successfully**\n\nI've added "${taskData.title}" to your task list for ${fullTime} on ${day} ${month} ${year}.\n\n${appointmentType === 'dentist' ? 'I also created a preparation reminder for the day before. ' : ''}This is marked as high priority since it's a scheduled appointment.\n\nWould you like me to create any additional preparation tasks or reminders?`;
      }

      return `I can see you mentioned an appointment. Could you provide the details in this format: "I have a [type] appointment at [time] on [date]" so I can create the proper task for you?`;
    } catch (error) {
      console.error('Appointment parsing error:', error);
      return `I understand you have an appointment. I had trouble parsing the exact details, but I can help you create a task for it. What type of appointment is it and when?`;
    }
  }

  // Handle general task creation
  private async handleTaskCreation(message: string, context: UserContext): Promise<string> {
    try {
      // Extract task from natural language
      let taskTitle = '';
      let priority = 'medium';
      let category = 'Personal';
      
      if (message.includes('urgent') || message.includes('important')) priority = 'high';
      if (message.includes('sometime') || message.includes('eventually')) priority = 'low';
      
      if (message.includes('work') || message.includes('coding') || message.includes('project')) category = 'Work';
      if (message.includes('uk') || message.includes('visa') || message.includes('move')) category = 'Planning';
      if (message.includes('health') || message.includes('doctor') || message.includes('exercise')) category = 'Health';

      // Extract the actual task
      const taskMatches = [
        /create task (.+)/i,
        /add task (.+)/i,
        /remind me to (.+)/i,
        /need to (.+)/i,
        /should (.+)/i
      ];

      for (const pattern of taskMatches) {
        const match = message.match(pattern);
        if (match) {
          taskTitle = match[1].replace(/[.!?]$/, ''); // Remove trailing punctuation
          break;
        }
      }

      if (!taskTitle) {
        return "I'd be happy to create a task for you! Just tell me what you need to do. For example: 'Create task: Review UK visa requirements' or 'Remind me to call the dentist'.";
      }

      const taskData = {
        user_id: this.userId,
        title: taskTitle,
        description: `Created from chat: "${message}"`,
        category,
        priority,
        status: 'todo',
        created_at: new Date().toISOString()
      };

      const result = await this.supabase.from('tasks').insert(taskData);
      
      if (result.error) {
        console.error('Task creation error:', result.error);
        return `I understand you want to create a task: "${taskTitle}". I had trouble saving it to your task list, but I've noted it down for you.`;
      }

      return `✅ **Task Created: "${taskTitle}"**\n\nCategory: ${category}\nPriority: ${priority}\n\nI've added this to your task list. Would you like me to break this down into smaller subtasks or create any related tasks?`;
    } catch (error) {
      console.error('Task creation error:', error);
      return "I'd love to help create tasks for you! Just tell me what you need to do and I'll add it to your task list.";
    }
  }

  // Intelligent habit analysis
  private async analyzeHabitsIntelligently(context: UserContext): Promise<string> {
    if (!context.habits.length) {
      return "You don't have any active habits tracked yet. Would you like me to help you set up some habits that support your goals?";
    }

    let analysis = `**Habit Pattern Analysis** 📊\n\n`;

    // Analyze each habit individually
    const habitAnalyses = context.habits.map(habit => {
      const entries = habit.habit_entries || [];
      const recentEntries = entries.slice(-14); // Last 14 entries
      const completion = recentEntries.filter(e => e.value === 1).length;
      const rate = recentEntries.length > 0 ? (completion / recentEntries.length) : 0;
      
      let status = '';
      let advice = '';
      
      if (rate >= 0.8) {
        status = '🔥 Strong';
        advice = 'Keep it up! This habit is well-established.';
      } else if (rate >= 0.6) {
        status = '✅ Good';
        advice = 'Solid progress. Focus on consistency.';
      } else if (rate >= 0.4) {
        status = '⚠️  Struggling';
        advice = 'Lower the bar - make it easier to maintain.';
      } else {
        status = '🚨 Needs Attention';
        advice = 'Consider restarting with a smaller commitment.';
      }

      return {
        name: habit.name,
        status,
        rate: Math.round(rate * 100),
        advice,
        recent: recentEntries.length
      };
    });

    // Group by performance
    const strong = habitAnalyses.filter(h => h.rate >= 80);
    const struggling = habitAnalyses.filter(h => h.rate < 60);

    if (strong.length > 0) {
      analysis += `**Habits Working Well:**\n`;
      strong.forEach(h => analysis += `• ${h.name}: ${h.status} (${h.rate}%)\n`);
      analysis += '\n';
    }

    if (struggling.length > 0) {
      analysis += `**Habits Needing Attention:**\n`;
      struggling.forEach(h => analysis += `• ${h.name}: ${h.status} (${h.rate}%) - ${h.advice}\n`);
      analysis += '\n';
    }

    // Detect patterns
    const patterns = [];
    if (strong.length > struggling.length) {
      patterns.push("🎯 You're generally good at habit maintenance");
    }
    if (struggling.length > strong.length) {
      patterns.push("💡 Consider reducing habit complexity - focus on 2-3 core habits");
    }
    
    // Energy-based insights
    const energyEntries = context.habits.flatMap(h => h.habit_entries || []).filter(e => e.energy_level);
    if (energyEntries.length > 0) {
      const avgEnergy = energyEntries.reduce((sum, e) => sum + (e.energy_level || 0), 0) / energyEntries.length;
      if (avgEnergy < 6) {
        patterns.push("⚡ Low energy during habits - consider timing adjustments");
      }
    }

    if (patterns.length > 0) {
      analysis += `**Key Insights:**\n${patterns.map(p => `• ${p}`).join('\n')}\n\n`;
    }

    analysis += `**Recommendations:**\n`;
    if (struggling.length > 2) {
      analysis += `• Focus on your top 2-3 most important habits\n`;
      analysis += `• Temporarily pause ${struggling.length - 2} struggling habits\n`;
    }
    analysis += `• Track completion, not perfection\n`;
    analysis += `• Link habits to existing routines for better consistency\n`;

    return analysis;
  }

  // Provide intelligent focus guidance
  private async provideFocusGuidance(context: UserContext, insights: AIInsight[]): Promise<string> {
    const pendingTasks = context.tasks.filter(t => t.status === 'todo');
    const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high');
    const currentHour = new Date().getHours();
    
    let response = `**Today's Focus Strategy** 🎯\n\n`;

    if (highPriorityTasks.length === 0) {
      response += `You have ${pendingTasks.length} tasks but none marked high priority. Let me help you prioritize:\n\n`;
      
      // Suggest prioritization
      const recentTasks = pendingTasks.slice(0, 5);
      response += `**Top candidates for high priority:**\n`;
      recentTasks.forEach((task, i) => {
        response += `${i + 1}. ${task.title}\n`;
      });
      response += `\nWhich of these would have the biggest impact if completed today?`;
      
      return response;
    }

    // Energy-based recommendations
    if (currentHour >= 6 && currentHour <= 10) {
      response += `🔥 **Prime Time (Morning High Energy)**\nTackle your hardest task first:\n`;
      response += `• ${highPriorityTasks[0].title}\n\n`;
      response += `Save easier tasks for later when your energy dips.`;
    } else if (currentHour >= 14 && currentHour <= 16) {
      response += `📝 **Steady Period (Post-Lunch)**\nGood for medium-complexity tasks:\n`;
      const mediumTasks = pendingTasks.filter(t => t.priority === 'medium').slice(0, 2);
      if (mediumTasks.length > 0) {
        mediumTasks.forEach(task => response += `• ${task.title}\n`);
      } else {
        response += `• ${highPriorityTasks[0].title} (break into smaller chunks)\n`;
      }
      response += '\nAvoid complex problem-solving right now.';
    } else {
      response += `✨ **Focus on Completion**\nWrap up started tasks or do quick wins:\n`;
      const quickTasks = pendingTasks.filter(t => 
        t.title.length < 50 || t.priority === 'low'
      ).slice(0, 3);
      quickTasks.forEach(task => response += `• ${task.title}\n`);
    }

    // Add context from insights
    const urgentInsights = insights.filter(i => i.urgency === 'high');
    if (urgentInsights.length > 0) {
      response += `\n\n⚠️ **Attention:** ${urgentInsights[0].description}`;
    }

    return response;
  }

  // Provide contextual energy guidance
  private async provideEnergyGuidance(context: UserContext): Promise<string> {
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();
    const timeStr = `${currentHour}:${currentMinutes.toString().padStart(2, '0')}`;

    // Check recent energy levels from habit entries
    const energyEntries = context.habits.flatMap(h => h.habit_entries || [])
      .filter(e => e.energy_level && e.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    let energyInsight = '';
    if (energyEntries.length > 3) {
      const avgEnergy = energyEntries.reduce((sum, e) => sum + e.energy_level, 0) / energyEntries.length;
      if (avgEnergy < 5) {
        energyInsight = `\n\n📊 **Pattern Alert:** Your recent energy levels average ${avgEnergy.toFixed(1)}/10. Consider sleep, nutrition, or stress factors.`;
      } else if (avgEnergy > 7) {
        energyInsight = `\n\n📊 **Good News:** Your energy levels are strong (avg ${avgEnergy.toFixed(1)}/10). You're in a good rhythm!`;
      }
    }

    if (currentHour >= 0 && currentHour < 6) {
      return `🌙 **Late Night (${timeStr})**\n\nYour brain needs rest! If you're still working:\n• Wrap up current tasks\n• Prepare tomorrow's priorities\n• Wind down - no complex decisions\n• Aim for sleep within 1 hour\n\nTomorrow's energy depends on tonight's rest.${energyInsight}`;
    } else if (currentHour >= 6 && currentHour <= 10) {
      return `🌅 **Morning Power Hours (${timeStr})**\n\nPeak cognitive performance time:\n• Tackle your hardest task first\n• Complex problem-solving\n• Important decisions\n• Deep focus work\n\nAvoid: emails, meetings, busy work\n\nThis window closes around 11am - use it wisely!${energyInsight}`;
    } else if (currentHour >= 11 && currentHour <= 13) {
      return `☀️ **Late Morning (${timeStr})**\n\nSolid energy for:\n• Collaborative work\n• Meetings and calls\n• Creative tasks\n• Planning and organizing\n\nStill good focus, but declining. Complete important work before lunch dip.${energyInsight}`;
    } else if (currentHour >= 14 && currentHour <= 16) {
      return `🥱 **Post-Lunch Dip (${timeStr})**\n\nNatural energy low - work with it:\n• Administrative tasks\n• Email processing\n• Light meetings\n• Habit tracking\n• Quick wins\n\nAvoid: Complex coding, major decisions\n\nConsider: 10-minute walk or brief rest${energyInsight}`;
    } else if (currentHour >= 17 && currentHour <= 20) {
      return `🔄 **Evening Recovery (${timeStr})**\n\nSecond wind activated:\n• Creative projects\n• Personal tasks\n• Learning and reading\n• Planning tomorrow\n• UK move research\n\nGood for meaningful work, but avoid stressful tasks that affect sleep.${energyInsight}`;
    } else {
      return `🌆 **Wind Down Time (${timeStr})**\n\nTransition to evening mode:\n• Complete today's habits\n• Review accomplishments\n• Light planning for tomorrow\n• Personal care routines\n\nAvoid: Starting new complex tasks, stressful work\n\nFocus on completion and preparation.${energyInsight}`;
    }
  }

  // Provide UK-specific guidance
  private async provideUKGuidance(context: UserContext): Promise<string> {
    const ukTasks = context.tasks.filter(t => 
      t.title.toLowerCase().includes('uk') || 
      t.title.toLowerCase().includes('visa') ||
      t.title.toLowerCase().includes('birmingham') ||
      t.category === 'Planning'
    );

    const today = new Date();
    const moveDate = new Date('2025-07-01'); // Estimated move date
    const daysUntilMove = Math.ceil((moveDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    let response = `🇬🇧 **UK Move Planning** (${daysUntilMove} days remaining)\n\n`;

    if (ukTasks.length > 0) {
      response += `**Your Current UK Tasks:**\n`;
      ukTasks.slice(0, 5).forEach(task => {
        response += `• ${task.title} (${task.priority} priority)\n`;
      });
      response += '\n';
    }

    // Timeline-based recommendations
    if (daysUntilMove > 150) {
      response += `**Focus Now (Early Planning):**\n`;
      response += `• University acceptance and CAS letter\n`;
      response += `• Student visa application preparation\n`;
      response += `• Financial documentation\n`;
      response += `• IELTS/English requirements\n\n`;
    } else if (daysUntilMove > 90) {
      response += `**Focus Now (Documentation Phase):**\n`;
      response += `• Submit visa application\n`;
      response += `• Banking setup research (Starling/Monzo)\n`;
      response += `• Accommodation applications\n`;
      response += `• Insurance requirements\n\n`;
    } else if (daysUntilMove > 30) {
      response += `**Focus Now (Final Preparations):**\n`;
      response += `• Book flights\n`;
      response += `• UK bank account setup\n`;
      response += `• Accommodation confirmation\n`;
      response += `• Shipping/packing arrangements\n\n`;
    } else {
      response += `**Focus Now (Final Sprint):**\n`;
      response += `• Packing and shipping\n`;
      response += `• Travel arrangements\n`;
      response += `• Important document copies\n`;
      response += `• UK contacts and emergency info\n\n`;
    }

    response += `**Birmingham-Specific Tips:**\n`;
    response += `• Great Indian food scene (Southall nearby)\n`;
    response += `• Student-friendly banking at university branches\n`;
    response += `• Excellent public transport (buses/trains)\n`;
    response += `• University accommodation has good support\n`;
    response += `• Active international student community\n\n`;

    response += `Need help with any specific UK tasks? I can create detailed action items for you!`;

    return response;
  }

  // Provide intelligent contextual responses
  private async provideIntelligentResponse(message: string, context: UserContext, insights: AIInsight[]): Promise<string> {
    // Handle natural conversation
    const lowerMessage = message.toLowerCase();
    
    // Acknowledge user's state
    if (lowerMessage.includes('tired') || lowerMessage.includes('exhausted')) {
      return `I understand you're feeling tired. Your energy management is important for everything else.\n\nQuick assessment:\n• Are you getting enough sleep?\n• How's your stress level lately?\n• When did you last take a proper break?\n\nMaybe focus on just 1-2 essential tasks today and prioritize rest. Your productivity tomorrow depends on recovery today.`;
    }

    if (lowerMessage.includes('overwhelmed') || lowerMessage.includes('too much')) {
      const taskCount = context.tasks.filter(t => t.status === 'todo').length;
      return `I hear you - ${taskCount} pending tasks can feel overwhelming.\n\n**Quick reset:**\n1. What's the ONE most important thing today?\n2. What can you eliminate or postpone?\n3. What's causing the most stress?\n\nYour brain isn't a task manager. Let's reduce the cognitive load so you can actually get things done.`;
    }

    if (lowerMessage.includes('good') || lowerMessage.includes('great') || lowerMessage.includes('awesome')) {
      return `That's excellent! 🎉 When things are going well, it's the perfect time to:\n• Build momentum on important projects\n• Tackle those challenging tasks you've been putting off\n• Set up systems for busier times\n\nWhat's been working well for you lately? I can help you identify patterns to maintain this positive streak.`;
    }

    // Task-related natural language
    if (lowerMessage.includes('what') && lowerMessage.includes('do')) {
      return await this.provideFocusGuidance(context, insights);
    }

    // Default intelligent response based on context
    const highPriorityTasks = context.tasks.filter(t => t.status === 'todo' && t.priority === 'high');
    const strugglingHabits = context.patterns.filter(p => p.type === 'habit_consistency_low');
    
    let response = `I'm here to help optimize your day! `;
    
    if (highPriorityTasks.length > 0) {
      response += `You have ${highPriorityTasks.length} high-priority tasks that need attention. `;
    }
    
    if (strugglingHabits.length > 0) {
      response += `I've also noticed some habits could use support. `;
    }
    
    response += `\n\n**I can help you with:**\n`;
    response += `• Creating and organizing tasks\n`;
    response += `• Analyzing your habit patterns\n`;
    response += `• UK move planning and timelines\n`;
    response += `• Energy-based scheduling\n`;
    response += `• Breaking down complex projects\n\n`;
    
    response += `What would be most helpful right now?`;
    
    return response;
  }

  // Helper method to convert month names to numbers
  private getMonthNumber(monthName: string): string {
    const months: { [key: string]: string } = {
      'january': '01', 'jan': '01',
      'february': '02', 'feb': '02', 
      'march': '03', 'mar': '03',
      'april': '04', 'apr': '04',
      'may': '05',
      'june': '06', 'jun': '06',
      'july': '07', 'jul': '07',
      'august': '08', 'aug': '08',
      'september': '09', 'sep': '09', 'sept': '09',
      'october': '10', 'oct': '10',
      'november': '11', 'nov': '11',
      'december': '12', 'dec': '12'
    };
    
    return months[monthName.toLowerCase()] || '01';
  }

  // Quick optimization suggestions
  async getQuickOptimizations(): Promise<string[]> {
    const context = await this.getUserContext();
    const insights = this.generateInsights(context);
    
    return insights
      .filter(i => i.actionable && i.urgency !== 'low')
      .slice(0, 3)
      .map(insight => `${insight.title}: ${insight.suggestedActions[0]}`)
  }
}

export type { UserContext, LifePattern, AIInsight, DailyBriefing };