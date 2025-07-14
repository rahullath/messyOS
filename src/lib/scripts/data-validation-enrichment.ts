// Comprehensive Data Validation and Enrichment Script
// Ensures all data in the system is properly validated, cleaned, and enriched

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

interface ValidationResult {
  domain: string;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  issues: ValidationIssue[];
  enrichment_applied: boolean;
}

interface ValidationIssue {
  record_id: string;
  issue_type: 'missing_field' | 'invalid_value' | 'inconsistent_data' | 'duplicate' | 'outlier';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggested_fix: string;
}

interface EnrichmentRule {
  domain: string;
  field: string;
  rule_type: 'categorize' | 'normalize' | 'calculate' | 'infer';
  logic: (record: any) => any;
}

export class DataValidationEnrichment {
  private supabase;
  private userId: string;

  constructor(userId: string) {
    this.supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.userId = userId;
  }

  // Main validation and enrichment process
  async runFullValidationEnrichment(): Promise<{
    validation_results: ValidationResult[];
    enrichment_summary: any;
    overall_score: number;
    recommendations: string[];
  }> {
    console.log('🔍 Starting comprehensive data validation and enrichment...');

    const validationResults: ValidationResult[] = [];
    
    // Validate and enrich each domain
    validationResults.push(await this.validateHabitsData());
    validationResults.push(await this.validateHealthData());
    validationResults.push(await this.validateFinanceData());
    validationResults.push(await this.validateTasksData());
    validationResults.push(await this.validateContentData());

    // Calculate overall scores
    const totalRecords = validationResults.reduce((sum, r) => sum + r.total_records, 0);
    const validRecords = validationResults.reduce((sum, r) => sum + r.valid_records, 0);
    const overallScore = totalRecords > 0 ? validRecords / totalRecords : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(validationResults);

    const enrichmentSummary = {
      domains_processed: validationResults.length,
      total_records: totalRecords,
      valid_records: validRecords,
      enrichment_applied: validationResults.filter(r => r.enrichment_applied).length,
      issues_found: validationResults.reduce((sum, r) => sum + r.issues.length, 0)
    };

    console.log('✅ Validation and enrichment completed:', enrichmentSummary);

    return {
      validation_results: validationResults,
      enrichment_summary: enrichmentSummary,
      overall_score: overallScore,
      recommendations
    };
  }

  // Validate habits data
  private async validateHabitsData(): Promise<ValidationResult> {
    console.log('🎯 Validating habits data...');

    const { data: habits } = await this.supabase
      .from('habits')
      .select('*')
      .eq('user_id', this.userId);

    const { data: habitEntries } = await this.supabase
      .from('habit_entries')
      .select('*')
      .eq('user_id', this.userId);

    const allRecords = [...(habits || []), ...(habitEntries || [])];
    const issues: ValidationIssue[] = [];
    let validRecords = 0;

    // Validate habits
    habits?.forEach(habit => {
      let isValid = true;

      // Check required fields
      if (!habit.name || habit.name.trim() === '') {
        issues.push({
          record_id: habit.id,
          issue_type: 'missing_field',
          description: 'Habit name is missing or empty',
          severity: 'high',
          suggested_fix: 'Add a descriptive name for the habit'
        });
        isValid = false;
      }

      if (!habit.category) {
        issues.push({
          record_id: habit.id,
          issue_type: 'missing_field',
          description: 'Habit category is missing',
          severity: 'medium',
          suggested_fix: 'Assign a category (Health, Productivity, etc.)'
        });
        isValid = false;
      }

      // Check for reasonable target values
      if (habit.target_value && (habit.target_value < 0 || habit.target_value > 1000)) {
        issues.push({
          record_id: habit.id,
          issue_type: 'invalid_value',
          description: `Unrealistic target value: ${habit.target_value}`,
          severity: 'medium',
          suggested_fix: 'Set a realistic target value'
        });
        isValid = false;
      }

      if (isValid) validRecords++;
    });

    // Validate habit entries
    habitEntries?.forEach(entry => {
      let isValid = true;

      // Check for valid timestamps
      if (!entry.logged_at || isNaN(new Date(entry.logged_at).getTime())) {
        issues.push({
          record_id: entry.id,
          issue_type: 'invalid_value',
          description: 'Invalid or missing logged_at timestamp',
          severity: 'high',
          suggested_fix: 'Ensure proper timestamp format'
        });
        isValid = false;
      }

      // Check for reasonable values
      if (entry.value !== null && (entry.value < 0 || entry.value > 100)) {
        issues.push({
          record_id: entry.id,
          issue_type: 'invalid_value',
          description: `Unrealistic habit value: ${entry.value}`,
          severity: 'medium',
          suggested_fix: 'Use values between 0-100 or appropriate scale'
        });
        isValid = false;
      }

      if (isValid) validRecords++;
    });

    // Apply enrichment
    await this.enrichHabitsData(habits || []);

    return {
      domain: 'habits',
      total_records: allRecords.length,
      valid_records: validRecords,
      invalid_records: allRecords.length - validRecords,
      issues,
      enrichment_applied: true
    };
  }

  // Validate health data
  private async validateHealthData(): Promise<ValidationResult> {
    console.log('❤️ Validating health data...');

    const { data: healthMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['sleep_duration', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 'stress_level', 'steps', 'weight', 'mood']);

    const issues: ValidationIssue[] = [];
    let validRecords = 0;

    healthMetrics?.forEach(metric => {
      let isValid = true;

      // Check required fields
      if (!metric.type) {
        issues.push({
          record_id: metric.id,
          issue_type: 'missing_field',
          description: 'Metric type is missing',
          severity: 'high',
          suggested_fix: 'Specify the metric type'
        });
        isValid = false;
      }

      if (metric.value === null || metric.value === undefined) {
        issues.push({
          record_id: metric.id,
          issue_type: 'missing_field',
          description: 'Metric value is missing',
          severity: 'high',
          suggested_fix: 'Provide a valid metric value'
        });
        isValid = false;
      }

      // Validate specific metric types
      if (metric.type && metric.value !== null) {
        const validationResult = this.validateHealthMetricValue(metric.type, metric.value);
        if (!validationResult.isValid) {
          issues.push({
            record_id: metric.id,
            issue_type: 'invalid_value',
            description: validationResult.message,
            severity: validationResult.severity,
            suggested_fix: validationResult.suggestedFix
          });
          isValid = false;
        }
      }

      // Check timestamp
      if (!metric.recorded_at || isNaN(new Date(metric.recorded_at).getTime())) {
        issues.push({
          record_id: metric.id,
          issue_type: 'invalid_value',
          description: 'Invalid or missing recorded_at timestamp',
          severity: 'high',
          suggested_fix: 'Ensure proper timestamp format'
        });
        isValid = false;
      }

      if (isValid) validRecords++;
    });

    // Apply enrichment
    await this.enrichHealthData(healthMetrics || []);

    return {
      domain: 'health',
      total_records: healthMetrics?.length || 0,
      valid_records: validRecords,
      invalid_records: (healthMetrics?.length || 0) - validRecords,
      issues,
      enrichment_applied: true
    };
  }

  // Validate finance data
  private async validateFinanceData(): Promise<ValidationResult> {
    console.log('💰 Validating finance data...');

    const { data: financeMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'income', 'crypto_value']);

    const issues: ValidationIssue[] = [];
    let validRecords = 0;

    financeMetrics?.forEach(metric => {
      let isValid = true;

      // Check required fields
      if (!metric.type) {
        issues.push({
          record_id: metric.id,
          issue_type: 'missing_field',
          description: 'Finance type is missing',
          severity: 'high',
          suggested_fix: 'Specify expense, income, or crypto_value'
        });
        isValid = false;
      }

      if (metric.value === null || metric.value === undefined || metric.value < 0) {
        issues.push({
          record_id: metric.id,
          issue_type: 'invalid_value',
          description: 'Invalid or negative financial value',
          severity: 'high',
          suggested_fix: 'Provide a positive financial value'
        });
        isValid = false;
      }

      // Check for missing categories on expenses
      if (metric.type === 'expense' && !metric.category) {
        issues.push({
          record_id: metric.id,
          issue_type: 'missing_field',
          description: 'Expense category is missing',
          severity: 'medium',
          suggested_fix: 'Categorize the expense (Food, Transport, etc.)'
        });
        isValid = false;
      }

      // Check for unrealistic values
      if (metric.value && metric.value > 100000) {
        issues.push({
          record_id: metric.id,
          issue_type: 'outlier',
          description: `Unusually large amount: ₹${metric.value}`,
          severity: 'medium',
          suggested_fix: 'Verify the amount is correct'
        });
      }

      if (isValid) validRecords++;
    });

    // Apply enrichment
    await this.enrichFinanceData(financeMetrics || []);

    return {
      domain: 'finance',
      total_records: financeMetrics?.length || 0,
      valid_records: validRecords,
      invalid_records: (financeMetrics?.length || 0) - validRecords,
      issues,
      enrichment_applied: true
    };
  }

  // Validate tasks data
  private async validateTasksData(): Promise<ValidationResult> {
    console.log('📋 Validating tasks data...');

    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId);

    const issues: ValidationIssue[] = [];
    let validRecords = 0;

    tasks?.forEach(task => {
      let isValid = true;

      // Check required fields
      if (!task.title || task.title.trim() === '') {
        issues.push({
          record_id: task.id,
          issue_type: 'missing_field',
          description: 'Task title is missing or empty',
          severity: 'high',
          suggested_fix: 'Add a descriptive title for the task'
        });
        isValid = false;
      }

      if (!task.status) {
        issues.push({
          record_id: task.id,
          issue_type: 'missing_field',
          description: 'Task status is missing',
          severity: 'medium',
          suggested_fix: 'Set status to todo, in_progress, completed, or cancelled'
        });
        isValid = false;
      }

      // Check for overdue tasks
      if (task.due_date && task.status !== 'completed' && new Date(task.due_date) < new Date()) {
        issues.push({
          record_id: task.id,
          issue_type: 'inconsistent_data',
          description: 'Task is overdue but not marked as completed or cancelled',
          severity: 'medium',
          suggested_fix: 'Update task status or extend due date'
        });
      }

      if (isValid) validRecords++;
    });

    // Apply enrichment
    await this.enrichTasksData(tasks || []);

    return {
      domain: 'tasks',
      total_records: tasks?.length || 0,
      valid_records: validRecords,
      invalid_records: (tasks?.length || 0) - validRecords,
      issues,
      enrichment_applied: true
    };
  }

  // Validate content data
  private async validateContentData(): Promise<ValidationResult> {
    console.log('🎬 Validating content data...');

    const { data: content } = await this.supabase
      .from('content_entries')
      .select('*')
      .eq('user_id', this.userId);

    const issues: ValidationIssue[] = [];
    let validRecords = 0;

    content?.forEach(item => {
      let isValid = true;

      // Check required fields
      if (!item.title || item.title.trim() === '') {
        issues.push({
          record_id: item.id,
          issue_type: 'missing_field',
          description: 'Content title is missing or empty',
          severity: 'high',
          suggested_fix: 'Add a title for the content'
        });
        isValid = false;
      }

      if (!item.type) {
        issues.push({
          record_id: item.id,
          issue_type: 'missing_field',
          description: 'Content type is missing',
          severity: 'medium',
          suggested_fix: 'Specify type (movie, book, series, etc.)'
        });
        isValid = false;
      }

      // Check rating bounds
      if (item.rating && (item.rating < 1 || item.rating > 10)) {
        issues.push({
          record_id: item.id,
          issue_type: 'invalid_value',
          description: `Invalid rating: ${item.rating} (should be 1-10)`,
          severity: 'medium',
          suggested_fix: 'Use rating scale 1-10'
        });
        isValid = false;
      }

      if (isValid) validRecords++;
    });

    // Apply enrichment
    await this.enrichContentData(content || []);

    return {
      domain: 'content',
      total_records: content?.length || 0,
      valid_records: validRecords,
      invalid_records: (content?.length || 0) - validRecords,
      issues,
      enrichment_applied: true
    };
  }

  // Health metric validation
  private validateHealthMetricValue(type: string, value: number): {
    isValid: boolean;
    message: string;
    severity: 'low' | 'medium' | 'high';
    suggestedFix: string;
  } {
    switch (type) {
      case 'sleep_duration':
        if (value < 0 || value > 24 * 60) {
          return {
            isValid: false,
            message: `Invalid sleep duration: ${value} minutes`,
            severity: 'high',
            suggestedFix: 'Sleep duration should be 0-1440 minutes (0-24 hours)'
          };
        }
        break;

      case 'heart_rate_avg':
      case 'heart_rate_min':
      case 'heart_rate_max':
        if (value < 30 || value > 220) {
          return {
            isValid: false,
            message: `Unrealistic heart rate: ${value} bpm`,
            severity: 'medium',
            suggestedFix: 'Heart rate should be 30-220 bpm'
          };
        }
        break;

      case 'stress_level':
        if (value < 0 || value > 100) {
          return {
            isValid: false,
            message: `Invalid stress level: ${value}`,
            severity: 'medium',
            suggestedFix: 'Stress level should be 0-100'
          };
        }
        break;

      case 'steps':
        if (value < 0 || value > 100000) {
          return {
            isValid: false,
            message: `Unrealistic step count: ${value}`,
            severity: 'medium',
            suggestedFix: 'Step count should be 0-100,000'
          };
        }
        break;

      case 'weight':
        if (value < 30 || value > 300) {
          return {
            isValid: false,
            message: `Unrealistic weight: ${value} kg`,
            severity: 'medium',
            suggestedFix: 'Weight should be 30-300 kg'
          };
        }
        break;

      case 'mood':
        if (value < 1 || value > 10) {
          return {
            isValid: false,
            message: `Invalid mood rating: ${value}`,
            severity: 'medium',
            suggestedFix: 'Mood should be rated 1-10'
          };
        }
        break;
    }

    return { isValid: true, message: '', severity: 'low', suggestedFix: '' };
  }

  // Enrichment methods
  private async enrichHabitsData(habits: any[]): Promise<void> {
    console.log('🔧 Enriching habits data...');

    for (const habit of habits) {
      const updates: any = {};

      // Auto-categorize if missing
      if (!habit.category) {
        updates.category = this.categorizeHabit(habit.name);
      }

      // Set default color if missing
      if (!habit.color) {
        updates.color = this.getDefaultHabitColor(habit.category || updates.category);
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await this.supabase
          .from('habits')
          .update(updates)
          .eq('id', habit.id);
      }
    }
  }

  private async enrichHealthData(metrics: any[]): Promise<void> {
    console.log('🔧 Enriching health data...');

    for (const metric of metrics) {
      const updates: any = {};

      // Add unit if missing
      if (!metric.unit) {
        updates.unit = this.getHealthMetricUnit(metric.type);
      }

      // Add category if missing
      if (!metric.category) {
        updates.category = 'Health';
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await this.supabase
          .from('metrics')
          .update(updates)
          .eq('id', metric.id);
      }
    }
  }

  private async enrichFinanceData(metrics: any[]): Promise<void> {
    console.log('🔧 Enriching finance data...');

    for (const metric of metrics) {
      const updates: any = {};

      // Auto-categorize expenses if missing
      if (metric.type === 'expense' && !metric.category) {
        updates.category = this.categorizeExpense(metric.metadata?.description || '');
      }

      // Add subcategory if missing
      if (metric.type === 'expense' && !metric.metadata?.subcategory) {
        const metadata = metric.metadata || {};
        metadata.subcategory = this.getExpenseSubcategory(
          updates.category || metric.category,
          metric.metadata?.description || ''
        );
        updates.metadata = metadata;
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await this.supabase
          .from('metrics')
          .update(updates)
          .eq('id', metric.id);
      }
    }
  }

  private async enrichTasksData(tasks: any[]): Promise<void> {
    console.log('🔧 Enriching tasks data...');

    for (const task of tasks) {
      const updates: any = {};

      // Auto-categorize if missing
      if (!task.category) {
        updates.category = this.categorizeTask(task.title, task.description);
      }

      // Set default priority if missing
      if (!task.priority) {
        updates.priority = this.inferTaskPriority(task.title, task.due_date);
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await this.supabase
          .from('tasks')
          .update(updates)
          .eq('id', task.id);
      }
    }
  }

  private async enrichContentData(content: any[]): Promise<void> {
    console.log('🔧 Enriching content data...');

    for (const item of content) {
      const updates: any = {};

      // Infer genre if missing
      if (!item.genre || item.genre.length === 0) {
        updates.genre = this.inferContentGenre(item.title, item.type);
      }

      // Set default status if missing
      if (!item.status) {
        updates.status = 'planned';
      }

      // Update if we have changes
      if (Object.keys(updates).length > 0) {
        await this.supabase
          .from('content_entries')
          .update(updates)
          .eq('id', item.id);
      }
    }
  }

  // Helper methods for categorization and enrichment
  private categorizeHabit(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('gym') || lower.includes('exercise') || lower.includes('workout')) return 'Fitness';
    if (lower.includes('read') || lower.includes('study') || lower.includes('learn')) return 'Learning';
    if (lower.includes('meditat') || lower.includes('mindful')) return 'Mindfulness';
    if (lower.includes('water') || lower.includes('sleep') || lower.includes('health')) return 'Health';
    if (lower.includes('work') || lower.includes('code') || lower.includes('project')) return 'Productivity';
    return 'Personal';
  }

  private getDefaultHabitColor(category: string): string {
    const colors: Record<string, string> = {
      'Fitness': '#ef4444',
      'Learning': '#3b82f6',
      'Mindfulness': '#8b5cf6',
      'Health': '#10b981',
      'Productivity': '#f59e0b',
      'Personal': '#6b7280'
    };
    return colors[category] || '#6b7280';
  }

  private getHealthMetricUnit(type: string): string {
    const units: Record<string, string> = {
      'sleep_duration': 'minutes',
      'heart_rate_avg': 'bpm',
      'heart_rate_min': 'bpm',
      'heart_rate_max': 'bpm',
      'stress_level': 'score',
      'steps': 'count',
      'weight': 'kg',
      'mood': 'rating'
    };
    return units[type] || 'value';
  }

  private categorizeExpense(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('grocery')) return 'Food & Grocery';
    if (lower.includes('transport') || lower.includes('uber') || lower.includes('metro')) return 'Transportation';
    if (lower.includes('rent') || lower.includes('housing')) return 'Housing';
    if (lower.includes('medicine') || lower.includes('doctor') || lower.includes('health')) return 'Healthcare';
    if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('game')) return 'Entertainment';
    return 'Other';
  }

  private getExpenseSubcategory(category: string, description: string): string {
    const lower = description.toLowerCase();
    
    switch (category) {
      case 'Food & Grocery':
        if (lower.includes('restaurant') || lower.includes('dining')) return 'Dining Out';
        if (lower.includes('grocery') || lower.includes('supermarket')) return 'Groceries';
        return 'General';
      case 'Transportation':
        if (lower.includes('uber') || lower.includes('ola')) return 'Ride Sharing';
        if (lower.includes('metro') || lower.includes('bus')) return 'Public Transport';
        return 'General';
      case 'Healthcare':
        if (lower.includes('medicine') || lower.includes('pharmacy')) return 'Medicine';
        if (lower.includes('doctor') || lower.includes('consultation')) return 'Consultation';
        return 'General';
      default:
        return 'General';
    }
  }

  private categorizeTask(title: string, description?: string): string {
    const text = `${title} ${description || ''}`.toLowerCase();
    if (text.includes('work') || text.includes('project') || text.includes('meeting')) return 'Work';
    if (text.includes('health') || text.includes('doctor') || text.includes('exercise')) return 'Health';
    if (text.includes('learn') || text.includes('study') || text.includes('course')) return 'Learning';
    if (text.includes('finance') || text.includes('bank') || text.includes('pay')) return 'Finance';
    if (text.includes('travel') || text.includes('trip') || text.includes('vacation')) return 'Planning';
    return 'Personal';
  }

  private inferTaskPriority(title: string, dueDate?: string): 'low' | 'medium' | 'high' | 'urgent' {
    const text = title.toLowerCase();
    
    // Check for urgent keywords
    if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) return 'urgent';
    
    // Check due date proximity
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue <= 1) return 'urgent';
      if (daysUntilDue <= 3) return 'high';
      if (daysUntilDue <= 7) return 'medium';
    }
    
    // Check for high priority keywords
    if (text.includes('important') || text.includes('critical') || text.includes('deadline')) return 'high';
    
    return 'medium';
  }

  private inferContentGenre(title: string, type: string): string[] {
    const text = title.toLowerCase();
    const genres: string[] = [];
    
    // Common genre keywords
    if (text.includes('action') || text.includes('fight') || text.includes('war')) genres.push('Action');
    if (text.includes('comedy') || text.includes('funny') || text.includes('humor')) genres.push('Comedy');
    if (text.includes('drama') || text.includes('emotional')) genres.push('Drama');
    if (text.includes('horror') || text.includes('scary') || text.includes('thriller')) genres.push('Horror');
    if (text.includes('romance') || text.includes('love')) genres.push('Romance');
    if (text.includes('sci-fi') || text.includes('science') || text.includes('future')) genres.push('Sci-Fi');
    if (text.includes('fantasy') || text.includes('magic') || text.includes('dragon')) genres.push('Fantasy');
    if (text.includes('documentary') || text.includes('real') || text.includes('true')) genres.push('Documentary');
    
    // Default genres by type
    if (genres.length === 0) {
      switch (type) {
        case 'movie':
          genres.push('Drama');
          break;
        case 'series':
          genres.push('Drama');
          break;
        case 'book':
          genres.push('Fiction');
          break;
        case 'anime':
          genres.push('Animation');
          break;
        default:
          genres.push('General');
      }
    }
    
    return genres;
  }

  // Generate recommendations based on validation results
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    // Overall data quality recommendations
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    const highSeverityIssues = results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'high').length, 0
    );
    
    if (highSeverityIssues > 0) {
      recommendations.push(`🚨 Address ${highSeverityIssues} high-severity data issues immediately`);
    }
    
    if (totalIssues > 10) {
      recommendations.push('📊 Consider implementing automated data validation rules');
    }
    
    // Domain-specific recommendations
    results.forEach(result => {
      const validityRate = result.valid_records / result.total_records;
      
      if (validityRate < 0.8) {
        recommendations.push(`🔧 Improve ${result.domain} data quality (${(validityRate * 100).toFixed(1)}% valid)`);
      }
      
      if (result.issues.length > 0) {
        const commonIssues = result.issues.reduce((acc, issue) => {
          acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommonIssue = Object.entries(commonIssues)
          .sort(([,a], [,b]) => b - a)[0];
        
        if (mostCommonIssue) {
          recommendations.push(`📝 Focus on fixing ${mostCommonIssue[0]} issues in ${result.domain} data`);
        }
      }
    });
    
    // Data completeness recommendations
    const emptyDomains = results.filter(r => r.total_records === 0);
    if (emptyDomains.length > 0) {
      recommendations.push(`📈 Start collecting data for: ${emptyDomains.map(d => d.domain).join(', ')}`);
    }
    
    return recommendations;
  }
}

// Export utility functions
export async function runDataValidation(userId: string) {
  const validator = new DataValidationEnrichment(userId);
  return await validator.runFullValidationEnrichment();
}

export async function validateSpecificDomain(userId: string, domain: string) {
  const validator = new DataValidationEnrichment(userId);
  
  switch (domain) {
    case 'habits':
      return await validator['validateHabitsData']();
    case 'health':
      return await validator['validateHealthData']();
    case 'finance':
      return await validator['validateFinanceData']();
    case 'tasks':
      return await validator['validateTasksData']();
    case 'content':
      return await validator['validateContentData']();
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}