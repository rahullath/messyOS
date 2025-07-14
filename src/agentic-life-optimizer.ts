import { StateGraph, END, MemorySaver } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/supabase';
import { DataUnderstandingEngine, generateDataUnderstandingReport } from './lib/intelligence/data-understanding-engine';
import { preprocessUserData } from './lib/intelligence/data-preprocessor';

// Define enhanced state interface
interface AgentState {
  user_data: { tasks: any[]; habits: any[]; health: any[]; finance: any[]; goals: any[] };
  enriched_data: any[];
  data_context: any;
  data_quality_report: any;
  patterns: any[];
  correlations: any[];
  anomalies: any[];
  plan: string;
  actions: string[];
  insights: any[];
  checkpoint_id: string | null;
}

// Initialize LLM
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.3,
  apiKey: process.env.GEMINI_API_KEY,
});

// Initialize Supabase
// For server-side scripts like this, we use createClient instead of the Astro-specific createServerClient.
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Tools
const correlateLifeMetrics = tool(
  async ({ metrics }: { metrics: string[] }) => {
    // Fetch data from Supabase
    const { data: health } = await supabase.from('health').select('*').limit(30);
    const { data: tasks } = await supabase.from('tasks').select('*').limit(30);
    // Example: Calculate correlation between sleep and task completion
    const correlations = computeCorrelations(health ?? [], tasks ?? [], metrics);
    await supabase.from('life_patterns').insert([{ patterns: correlations, timestamp: new Date() }]);
    return JSON.stringify(correlations);
  },
  {
    name: 'correlate_life_metrics',
    description: 'Correlate metrics across domains (e.g., sleep vs. task completion)',
    schema: z.object({ metrics: z.array(z.string()) }),
  }
);

const groceryTracker = tool(
  async () => {
    const { data: finance } = await supabase.from('finance').select('items').limit(30);
    const stock = analyzeGroceryStock(finance ?? []);
    const suggestions = stock.lowStock.map((item: string) => `Order ${item} (low stock)`);
    await supabase.from('agent_actions').insert([{ actions: suggestions }]);
    return suggestions.join(', ');
  },
  {
    name: 'grocery_tracker',
    description: 'Track grocery/cat food stock and suggest orders',
    schema: z.object({}),
  }
);

// Helper: Compute correlations (simplified)
function computeCorrelations(health: any[], tasks: any[], metrics: string[]): any[] {
  // Placeholder: Use mathjs or custom logic for Pearson correlation
  return metrics.map(metric => ({
    metric,
    correlation: Math.random() * 0.5 + 0.5, // Replace with actual correlation
  }));
}

// Helper: Analyze grocery stock (simplified)
function analyzeGroceryStock(finance: {items: any[]}[]): { lowStock: string[] } {
  const items = finance.flatMap(f => f.items || []);
  return { lowStock: items.filter(item => item.quantity < 5).map(item => item.name) };
}

// Enhanced Nodes with Data Understanding
async function dataUnderstandingNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('🧠 Building comprehensive data understanding...');
  
  // Get user ID from the first available data point
  const userId = state.user_data.tasks[0]?.user_id || 
                 state.user_data.habits[0]?.user_id || 
                 state.user_data.health[0]?.user_id || 
                 state.user_data.finance[0]?.user_id;
  
  if (!userId) {
    console.warn('No user ID found in data');
    return { 
      enriched_data: [],
      data_context: {},
      data_quality_report: { overall_score: 0, recommendations: ['No data available'] }
    };
  }

  try {
    // Preprocess and enrich all data
    const preprocessResult = await preprocessUserData(userId);
    
    // Generate comprehensive data understanding report
    const understandingReport = await generateDataUnderstandingReport(userId);
    
    return {
      enriched_data: preprocessResult.enriched_data,
      data_context: preprocessResult.context,
      data_quality_report: understandingReport.qualityReport,
      patterns: understandingReport.context.patterns,
      correlations: understandingReport.context.correlations,
      anomalies: understandingReport.context.anomalies
    };
  } catch (error) {
    console.error('Data understanding error:', error);
    return {
      enriched_data: [],
      data_context: {},
      data_quality_report: { overall_score: 0, recommendations: ['Data processing failed'] },
      patterns: [],
      correlations: [],
      anomalies: []
    };
  }
}

async function analyzeNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('🔍 Analyzing enriched data for insights...');
  
  const insights = [];
  
  // Analyze data quality
  if (state.data_quality_report.overall_score < 0.7) {
    insights.push({
      type: 'data_quality',
      title: 'Data Quality Needs Improvement',
      description: `Overall data quality score: ${(state.data_quality_report.overall_score * 100).toFixed(1)}%`,
      recommendations: state.data_quality_report.recommendations,
      priority: 'high'
    });
  }
  
  // Analyze patterns
  state.patterns.forEach(pattern => {
    if (pattern.confidence > 0.8) {
      insights.push({
        type: 'pattern',
        title: `Strong ${pattern.type} Pattern Detected`,
        description: pattern.description,
        confidence: pattern.confidence,
        domains: pattern.domains,
        priority: 'medium'
      });
    }
  });
  
  // Analyze correlations
  state.correlations.forEach(correlation => {
    if (correlation.correlation_strength > 0.6) {
      insights.push({
        type: 'correlation',
        title: `${correlation.domain_a} - ${correlation.domain_b} Correlation`,
        description: correlation.description,
        strength: correlation.correlation_strength,
        priority: 'medium'
      });
    }
  });
  
  // Analyze anomalies
  const highSeverityAnomalies = state.anomalies.filter(a => a.severity === 'high');
  highSeverityAnomalies.forEach(anomaly => {
    insights.push({
      type: 'anomaly',
      title: `Data Anomaly: ${anomaly.type}`,
      description: anomaly.description,
      suggested_action: anomaly.suggested_action,
      priority: 'high'
    });
  });
  
  return { insights };
}

async function planNode(state: AgentState): Promise<Partial<AgentState>> {
  console.log('📋 Generating intelligent life optimization plan...');
  
  const prompt = `
    You are an advanced life optimization AI. Generate a comprehensive daily plan based on the following enriched data analysis:

    DATA QUALITY SCORE: ${state.data_quality_report.overall_score * 100}%
    
    ENRICHED DATA SUMMARY:
    - Total data points: ${state.enriched_data.length}
    - Data domains: ${[...new Set(state.enriched_data.map(d => d.domain))].join(', ')}
    
    KEY INSIGHTS:
    ${state.insights.map(insight => `- ${insight.title}: ${insight.description}`).join('\n')}
    
    DETECTED PATTERNS:
    ${state.patterns.map(p => `- ${p.description} (confidence: ${p.confidence})`).join('\n')}
    
    CORRELATIONS:
    ${state.correlations.map(c => `- ${c.description} (strength: ${c.correlation_strength})`).join('\n')}
    
    DATA QUALITY RECOMMENDATIONS:
    ${state.data_quality_report.recommendations.join('\n')}
    
    CURRENT USER DATA:
    Tasks: ${JSON.stringify(state.user_data.tasks.slice(0, 5))}
    Habits: ${JSON.stringify(state.user_data.habits.slice(0, 5))}
    Health: ${JSON.stringify(state.user_data.health.slice(0, 5))}
    Finance: ${JSON.stringify(state.user_data.finance.slice(0, 5))}
    Goals: ${JSON.stringify(state.user_data.goals)}

    Generate a personalized daily optimization plan that:
    1. Addresses data quality issues first (if any)
    2. Leverages detected patterns and correlations
    3. Optimizes across all life domains (health, habits, finance, tasks)
    4. Provides specific, actionable recommendations
    5. Considers temporal context and user preferences
    
    Format as a structured daily plan with morning, afternoon, and evening sections.
    Be specific and actionable. Max 200 words.
  `;
  
  const plan = await llm.invoke(prompt);
  return { plan: plan.content as string };
}

async function actionNode(state: AgentState): Promise<Partial<AgentState>> {
  const actions = [];
  // Grocery/cat food orders
  const grocerySuggestions = await groceryTracker.invoke({});
  actions.push(grocerySuggestions);
  // Schedule tasks/workouts
  const planLines = state.plan.split('. ').map(line => line.trim());
  for (const line of planLines) {
    if (line.includes('Assignment') || line.includes('Gym')) {
      await supabase.from('tasks').insert([{ description: line, priority: 'high' }]);
      actions.push(`Scheduled: ${line}`);
    }
  }
  return { actions };
}

async function checkpointNode(state: AgentState): Promise<Partial<AgentState>> {
  const checkpoint_id = state.checkpoint_id || crypto.randomUUID();
  await supabase.from('agent_memories').insert([{
    id: checkpoint_id,
    state: JSON.stringify(state),
    timestamp: new Date().toISOString(),
  } as any]);
  return { checkpoint_id };
}

// Enhanced Workflow with Data Understanding
const workflow = new StateGraph<AgentState>({
  channels: {
    user_data: {
      value: (x: any, y: any) => y,
      default: () => ({ tasks: [], habits: [], health: [], finance: [], goals: [] }),
    },
    enriched_data: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    data_context: {
      value: (x: any, y: any) => y,
      default: () => ({}),
    },
    data_quality_report: {
      value: (x: any, y: any) => y,
      default: () => ({ overall_score: 0, recommendations: [] }),
    },
    patterns: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    correlations: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    anomalies: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    plan: {
      value: (x: any, y: any) => y,
      default: () => "",
    },
    actions: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    insights: {
      value: (x: any, y: any) => y,
      default: () => [],
    },
    checkpoint_id: {
      value: (x: any, y: any) => y,
      default: () => null,
    },
  },
})
  .addNode('data_understanding', dataUnderstandingNode)
  .addNode('analyze', analyzeNode)
  .addNode('plan', planNode)
  .addNode('action', actionNode)
  .addNode('checkpoint', checkpointNode)
  .addEdge('data_understanding', 'analyze')
  .addEdge('analyze', 'plan')
  .addEdge('plan', 'action')
  .addEdge('action', 'checkpoint')
  .addEdge('checkpoint', END);

// Checkpointing
const checkpointer = new MemorySaver();
const app = workflow.compile({ checkpointer });

// Enhanced API Endpoint with Data Understanding
export async function runLifeOptimizer(userId?: string) {
  console.log('🚀 Starting Enhanced Life Optimizer...');
  
  // Get user data from all sources
  const tasksData = await supabase.from('tasks').select('*').limit(50);
  const habitsData = await supabase.from('habits').select('*').limit(50);
  const healthData = await supabase.from('metrics').select('*').in('type', ['sleep_duration', 'heart_rate_avg', 'stress_level']).limit(50);
  const financeData = await supabase.from('metrics').select('*').in('type', ['expense', 'income', 'crypto_value']).limit(50);
  const goalsData = await supabase.from('goals').select('*').limit(20);

  const initialState: AgentState = {
    user_data: {
      tasks: tasksData.data || [],
      habits: habitsData.data || [],
      health: healthData.data || [],
      finance: financeData.data || [],
      goals: goalsData.data || [],
    },
    enriched_data: [],
    data_context: {},
    data_quality_report: { overall_score: 0, recommendations: [] },
    patterns: [],
    correlations: [],
    anomalies: [],
    plan: '',
    actions: [],
    insights: [],
    checkpoint_id: null,
  };

  console.log('📊 Initial data loaded:', {
    tasks: initialState.user_data.tasks.length,
    habits: initialState.user_data.habits.length,
    health: initialState.user_data.health.length,
    finance: initialState.user_data.finance.length,
    goals: initialState.user_data.goals.length
  });

  const result = await app.invoke(initialState, { 
    configurable: { thread_id: `life-optimizer-${userId || 'default'}` } 
  });
  
  console.log('✅ Life optimization completed');
  return result;
}
