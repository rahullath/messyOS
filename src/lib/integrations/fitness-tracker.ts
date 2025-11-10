// src/lib/integrations/fitness-tracker.ts - Fitness Data Processing for meshOS
// Universal parser for smartwatch exports (Apple Health, Google Fit, Garmin, Fitbit)

import { createSupabaseClient } from '../supabase/client';

export interface FitnessMetric {
  id: string;
  date: string;
  type: FitnessMetricType;
  value: number;
  unit: string;
  source: string; // 'apple_health', 'google_fit', 'garmin', 'fitbit', 'manual'
  confidence: number; // Data quality score 0-1
  metadata: {
    device?: string;
    accuracy?: string;
    recordedAt?: string;
    activityType?: string;
    workoutDuration?: number;
  };
}

export type FitnessMetricType = 
  | 'steps' | 'distance' | 'calories_active' | 'calories_resting'
  | 'heart_rate_avg' | 'heart_rate_max' | 'heart_rate_min' | 'heart_rate_resting'
  | 'sleep_duration' | 'sleep_deep' | 'sleep_light' | 'sleep_rem'
  | 'weight' | 'body_fat' | 'muscle_mass' | 'water_weight'
  | 'blood_pressure_systolic' | 'blood_pressure_diastolic'
  | 'vo2_max' | 'floors_climbed' | 'active_minutes'
  | 'workout_time' | 'recovery_time' | 'stress_level';

export interface WorkoutSession {
  id: string;
  date: string;
  type: WorkoutType;
  duration: number; // minutes
  calories: number;
  distance?: number; // meters
  averageHeartRate?: number;
  maxHeartRate?: number;
  source: string;
  notes?: string;
  metrics: {
    pace?: number; // min/km
    elevation?: number; // meters
    power?: number; // watts
    cadence?: number; // steps/min or rpm
  };
}

export type WorkoutType = 
  | 'running' | 'walking' | 'cycling' | 'swimming' | 'strength'
  | 'yoga' | 'pilates' | 'football' | 'tennis' | 'golf'
  | 'hiking' | 'rowing' | 'elliptical' | 'other';

export interface HealthInsight {
  type: 'trend_analysis' | 'goal_progress' | 'health_warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'alert';
  confidence: number;
  timeframe: string;
  actionItems: string[];
  relatedMetrics: FitnessMetricType[];
  trendData?: Array<{ date: string; value: number }>;
}

export interface HealthGoal {
  id: string;
  type: FitnessMetricType;
  target: number;
  unit: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
  progress: number; // 0-1
  achieved: boolean;
}

class FitnessTracker {
  private supabase = createSupabaseClient();

  /**
   * Parse fitness data export file
   */
  async parseDataExport(
    file: File,
    source: 'apple_health' | 'google_fit' | 'garmin' | 'fitbit',
    userId: string
  ): Promise<{ success: boolean; metrics?: FitnessMetric[]; workouts?: WorkoutSession[]; error?: string }> {
    try {
      const fileContent = await this.readFileContent(file);
      
      switch (source) {
        case 'apple_health':
          return await this.parseAppleHealthExport(fileContent, userId);
        case 'google_fit':
          return await this.parseGoogleFitExport(fileContent, userId);
        case 'garmin':
          return await this.parseGarminExport(fileContent, userId);
        case 'fitbit':
          return await this.parseFitbitExport(fileContent, userId);
        default:
          return { success: false, error: 'Unsupported data source' };
      }
    } catch (error) {
      console.error('Error parsing fitness data:', error);
      return { success: false, error: 'Failed to parse fitness data' };
    }
  }

  /**
   * Parse Apple Health XML export
   */
  private async parseAppleHealthExport(
    xmlContent: string,
    userId: string
  ): Promise<{ success: boolean; metrics?: FitnessMetric[]; workouts?: WorkoutSession[]; error?: string }> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');
      
      const metrics: FitnessMetric[] = [];
      const workouts: WorkoutSession[] = [];

      // Parse health records
      const records = doc.querySelectorAll('Record');
      records.forEach(record => {
        const type = this.mapAppleHealthType(record.getAttribute('type') || '');
        if (!type) return;

        const value = parseFloat(record.getAttribute('value') || '0');
        const unit = record.getAttribute('unit') || '';
        const date = record.getAttribute('startDate') || '';
        const device = record.getAttribute('sourceName') || '';

        metrics.push({
          id: this.generateMetricId(date, type, value),
          date,
          type,
          value,
          unit,
          source: 'apple_health',
          confidence: 0.9,
          metadata: {
            device,
            recordedAt: record.getAttribute('creationDate') || undefined
          }
        });
      });

      // Parse workout sessions
      const workoutRecords = doc.querySelectorAll('Workout');
      workoutRecords.forEach(workout => {
        const workoutType = this.mapAppleWorkoutType(workout.getAttribute('workoutActivityType') || '');
        const duration = parseFloat(workout.getAttribute('duration') || '0');
        const calories = parseFloat(workout.getAttribute('totalEnergyBurned') || '0');
        const distance = parseFloat(workout.getAttribute('totalDistance') || '0');
        const startDate = workout.getAttribute('startDate') || '';

        workouts.push({
          id: this.generateWorkoutId(startDate, workoutType, duration),
          date: startDate,
          type: workoutType,
          duration: Math.round(duration / 60), // Convert to minutes
          calories: Math.round(calories),
          distance: distance > 0 ? Math.round(distance * 1000) : undefined, // Convert to meters
          source: 'apple_health',
          metrics: {}
        });
      });

      // Store data
      await this.storeFitnessData(metrics, workouts, userId);

      return { success: true, metrics, workouts };
    } catch (error) {
      console.error('Error parsing Apple Health data:', error);
      return { success: false, error: 'Failed to parse Apple Health export' };
    }
  }

  /**
   * Parse Google Fit JSON export
   */
  private async parseGoogleFitExport(
    jsonContent: string,
    userId: string
  ): Promise<{ success: boolean; metrics?: FitnessMetric[]; workouts?: WorkoutSession[]; error?: string }> {
    try {
      const data = JSON.parse(jsonContent);
      const metrics: FitnessMetric[] = [];
      const workouts: WorkoutSession[] = [];

      // Parse different data streams
      if (data.bucket) {
        data.bucket.forEach((bucket: any) => {
          bucket.dataset?.forEach((dataset: any) => {
            dataset.point?.forEach((point: any) => {
              const type = this.mapGoogleFitType(dataset.dataSourceId);
              if (!type) return;

              const value = point.value?.[0]?.fpVal || point.value?.[0]?.intVal || 0;
              const startTime = new Date(parseInt(point.startTimeNanos) / 1000000);
              
              metrics.push({
                id: this.generateMetricId(startTime.toISOString(), type, value),
                date: startTime.toISOString(),
                type,
                value,
                unit: this.getUnitForType(type),
                source: 'google_fit',
                confidence: 0.8,
                metadata: {
                  device: point.originDataSourceId
                }
              });
            });
          });
        });
      }

      // Parse activities (workouts)
      if (data.activities) {
        data.activities.forEach((activity: any) => {
          const workoutType = this.mapGoogleFitWorkoutType(activity.activityType);
          const startTime = new Date(parseInt(activity.startTimeMillis));
          const endTime = new Date(parseInt(activity.endTimeMillis));
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes

          workouts.push({
            id: this.generateWorkoutId(startTime.toISOString(), workoutType, duration),
            date: startTime.toISOString(),
            type: workoutType,
            duration,
            calories: activity.calories || 0,
            distance: activity.distance,
            source: 'google_fit',
            metrics: {}
          });
        });
      }

      await this.storeFitnessData(metrics, workouts, userId);
      return { success: true, metrics, workouts };
    } catch (error) {
      console.error('Error parsing Google Fit data:', error);
      return { success: false, error: 'Failed to parse Google Fit export' };
    }
  }

  /**
   * Parse Garmin CSV export
   */
  private async parseGarminExport(
    csvContent: string,
    userId: string
  ): Promise<{ success: boolean; metrics?: FitnessMetric[]; workouts?: WorkoutSession[]; error?: string }> {
    try {
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const metrics: FitnessMetric[] = [];
      const workouts: WorkoutSession[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length < headers.length - 1) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Parse daily metrics
        if (row.Date) {
          const date = this.parseDate(row.Date);
          
          // Steps
          if (row.Steps && parseInt(row.Steps) > 0) {
            metrics.push(this.createMetric(date, 'steps', parseInt(row.Steps), 'count', 'garmin'));
          }
          
          // Distance
          if (row.Distance && parseFloat(row.Distance) > 0) {
            metrics.push(this.createMetric(date, 'distance', parseFloat(row.Distance) * 1000, 'm', 'garmin'));
          }
          
          // Calories
          if (row.Calories && parseInt(row.Calories) > 0) {
            metrics.push(this.createMetric(date, 'calories_active', parseInt(row.Calories), 'kcal', 'garmin'));
          }
          
          // Sleep
          if (row['Sleep Time'] && row['Sleep Time'] !== '--') {
            const sleepHours = this.parseTimeToHours(row['Sleep Time']);
            metrics.push(this.createMetric(date, 'sleep_duration', sleepHours, 'hours', 'garmin'));
          }
        }

        // Parse activities (if activity export)
        if (row['Activity Type'] && row.Date && row.Duration) {
          const workoutType = this.mapGarminActivityType(row['Activity Type']);
          const duration = this.parseTimeToMinutes(row.Duration);
          
          workouts.push({
            id: this.generateWorkoutId(date, workoutType, duration),
            date,
            type: workoutType,
            duration,
            calories: parseInt(row.Calories) || 0,
            distance: row.Distance ? parseFloat(row.Distance) * 1000 : undefined,
            averageHeartRate: row['Avg HR'] ? parseInt(row['Avg HR']) : undefined,
            maxHeartRate: row['Max HR'] ? parseInt(row['Max HR']) : undefined,
            source: 'garmin',
            metrics: {
              pace: row['Avg Pace'] ? this.parsePaceToMinPerKm(row['Avg Pace']) : undefined,
              elevation: row['Elev Gain'] ? parseFloat(row['Elev Gain']) : undefined
            }
          });
        }
      }

      await this.storeFitnessData(metrics, workouts, userId);
      return { success: true, metrics, workouts };
    } catch (error) {
      console.error('Error parsing Garmin data:', error);
      return { success: false, error: 'Failed to parse Garmin export' };
    }
  }

  /**
   * Parse Fitbit JSON export
   */
  private async parseFitbitExport(
    jsonContent: string,
    userId: string
  ): Promise<{ success: boolean; metrics?: FitnessMetric[]; workouts?: WorkoutSession[]; error?: string }> {
    try {
      const data = JSON.parse(jsonContent);
      const metrics: FitnessMetric[] = [];
      const workouts: WorkoutSession[] = [];

      // Parse daily data
      if (data.activities) {
        data.activities.forEach((day: any) => {
          const date = day.dateTime;
          
          // Steps
          if (day.value && parseInt(day.value) > 0) {
            metrics.push(this.createMetric(date, 'steps', parseInt(day.value), 'count', 'fitbit'));
          }
        });
      }

      // Parse sleep data
      if (data.sleep) {
        data.sleep.forEach((sleep: any) => {
          const date = sleep.dateOfSleep;
          const duration = sleep.timeInBed / 60; // Convert to hours
          
          metrics.push(this.createMetric(date, 'sleep_duration', duration, 'hours', 'fitbit'));
          
          if (sleep.levels?.summary) {
            const levels = sleep.levels.summary;
            if (levels.deep) {
              metrics.push(this.createMetric(date, 'sleep_deep', levels.deep.minutes / 60, 'hours', 'fitbit'));
            }
            if (levels.light) {
              metrics.push(this.createMetric(date, 'sleep_light', levels.light.minutes / 60, 'hours', 'fitbit'));
            }
            if (levels.rem) {
              metrics.push(this.createMetric(date, 'sleep_rem', levels.rem.minutes / 60, 'hours', 'fitbit'));
            }
          }
        });
      }

      // Parse heart rate data
      if (data.heartRate) {
        data.heartRate.forEach((hr: any) => {
          const date = hr.dateTime;
          if (hr.value?.restingHeartRate) {
            metrics.push(this.createMetric(date, 'heart_rate_resting', hr.value.restingHeartRate, 'bpm', 'fitbit'));
          }
        });
      }

      // Parse exercise sessions
      if (data.exercises) {
        data.exercises.forEach((exercise: any) => {
          const workoutType = this.mapFitbitActivityType(exercise.activityName);
          const startTime = exercise.startTime;
          const duration = exercise.duration / 60000; // Convert to minutes
          
          workouts.push({
            id: this.generateWorkoutId(startTime, workoutType, duration),
            date: startTime,
            type: workoutType,
            duration: Math.round(duration),
            calories: exercise.calories || 0,
            averageHeartRate: exercise.averageHeartRate,
            source: 'fitbit',
            metrics: {}
          });
        });
      }

      await this.storeFitnessData(metrics, workouts, userId);
      return { success: true, metrics, workouts };
    } catch (error) {
      console.error('Error parsing Fitbit data:', error);
      return { success: false, error: 'Failed to parse Fitbit export' };
    }
  }

  /**
   * Store fitness data in database
   */
  private async storeFitnessData(metrics: FitnessMetric[], workouts: WorkoutSession[], userId: string): Promise<void> {
    try {
      // Store metrics
      for (const metric of metrics) {
        await this.supabase
          .from('fitness_metrics')
          .upsert({
            user_id: userId,
            metric_id: metric.id,
            date: metric.date,
            type: metric.type,
            value: metric.value,
            unit: metric.unit,
            source: metric.source,
            confidence: metric.confidence,
            metadata: metric.metadata,
            processed_at: new Date().toISOString()
          });
      }

      // Store workouts
      for (const workout of workouts) {
        await this.supabase
          .from('fitness_workouts')
          .upsert({
            user_id: userId,
            workout_id: workout.id,
            date: workout.date,
            type: workout.type,
            duration: workout.duration,
            calories: workout.calories,
            distance: workout.distance,
            average_heart_rate: workout.averageHeartRate,
            max_heart_rate: workout.maxHeartRate,
            source: workout.source,
            notes: workout.notes,
            metrics: workout.metrics,
            processed_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error storing fitness data:', error);
    }
  }

  /**
   * Generate health insights from fitness data
   */
  async generateHealthInsights(userId: string, days: number = 30): Promise<HealthInsight[]> {
    try {
      const insights: HealthInsight[] = [];
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get recent metrics
      const { data: metrics } = await this.supabase
        .from('fitness_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString());

      const { data: workouts } = await this.supabase
        .from('fitness_workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString());

      if (!metrics && !workouts) return insights;

      // Analyze step trends
      const stepMetrics = metrics?.filter(m => m.type === 'steps') || [];
      if (stepMetrics.length > 7) {
        const avgSteps = stepMetrics.reduce((sum, m) => sum + m.value, 0) / stepMetrics.length;
        const recentSteps = stepMetrics.slice(-7).reduce((sum, m) => sum + m.value, 0) / 7;
        
        if (recentSteps < avgSteps * 0.8) {
          insights.push({
            type: 'trend_analysis',
            title: 'Declining step activity',
            description: `Your recent daily steps (${Math.round(recentSteps)}) are 20% below your ${days}-day average (${Math.round(avgSteps)}).`,
            severity: 'warning',
            confidence: 0.8,
            timeframe: 'Last 7 days',
            actionItems: [
              'Take walking breaks during the day',
              'Use stairs instead of elevators',
              'Walk or cycle for short errands',
              'Set hourly movement reminders'
            ],
            relatedMetrics: ['steps'],
            trendData: stepMetrics.map(m => ({ date: m.date, value: m.value }))
          });
        } else if (recentSteps > avgSteps * 1.2) {
          insights.push({
            type: 'achievement',
            title: 'Increased activity levels!',
            description: `Great job! Your recent activity is 20% higher than usual. Keep up the momentum!`,
            severity: 'success',
            confidence: 0.9,
            timeframe: 'Last 7 days',
            actionItems: [
              'Maintain current activity level',
              'Consider setting a higher daily step goal',
              'Track your progress weekly'
            ],
            relatedMetrics: ['steps']
          });
        }
      }

      // Analyze sleep patterns
      const sleepMetrics = metrics?.filter(m => m.type === 'sleep_duration') || [];
      if (sleepMetrics.length > 7) {
        const avgSleep = sleepMetrics.reduce((sum, m) => sum + m.value, 0) / sleepMetrics.length;
        const shortSleepDays = sleepMetrics.filter(m => m.value < 7).length;
        
        if (shortSleepDays > sleepMetrics.length * 0.4) {
          insights.push({
            type: 'health_warning',
            title: 'Insufficient sleep detected',
            description: `You've had less than 7 hours of sleep on ${shortSleepDays} of the last ${sleepMetrics.length} days. Average: ${avgSleep.toFixed(1)} hours.`,
            severity: 'alert',
            confidence: 0.9,
            timeframe: `Last ${sleepMetrics.length} days`,
            actionItems: [
              'Establish a consistent bedtime routine',
              'Limit screen time before bed',
              'Create a comfortable sleep environment',
              'Consider sleep hygiene practices'
            ],
            relatedMetrics: ['sleep_duration']
          });
        }
      }

      // Analyze workout consistency
      if (workouts && workouts.length > 0) {
        const workoutDays = new Set(workouts.map(w => w.date.split('T')[0])).size;
        const totalDays = days;
        const consistency = workoutDays / totalDays;
        
        if (consistency >= 0.7) {
          insights.push({
            type: 'achievement',
            title: 'Excellent workout consistency!',
            description: `You've exercised on ${workoutDays} of the last ${totalDays} days. That's ${Math.round(consistency * 100)}% consistency!`,
            severity: 'success',
            confidence: 0.9,
            timeframe: `Last ${days} days`,
            actionItems: [
              'Keep up the excellent routine',
              'Consider varying workout types',
              'Track strength and endurance progress'
            ],
            relatedMetrics: ['workout_time']
          });
        } else if (consistency < 0.3) {
          insights.push({
            type: 'recommendation',
            title: 'Increase workout frequency',
            description: `You exercised ${workoutDays} days in the last ${totalDays} days. Consider increasing frequency for better health benefits.`,
            severity: 'info',
            confidence: 0.8,
            timeframe: `Last ${days} days`,
            actionItems: [
              'Start with 2-3 workouts per week',
              'Try short 15-20 minute sessions',
              'Find activities you enjoy',
              'Schedule workouts like appointments'
            ],
            relatedMetrics: ['workout_time']
          });
        }
      }

      // Heart rate analysis
      const restingHR = metrics?.filter(m => m.type === 'heart_rate_resting') || [];
      if (restingHR.length > 14) {
        const recentAvg = restingHR.slice(-7).reduce((sum, m) => sum + m.value, 0) / 7;
        const previousAvg = restingHR.slice(-14, -7).reduce((sum, m) => sum + m.value, 0) / 7;
        
        if (recentAvg > previousAvg + 5) {
          insights.push({
            type: 'health_warning',
            title: 'Elevated resting heart rate',
            description: `Your resting heart rate has increased by ${Math.round(recentAvg - previousAvg)} bpm over the last week. Consider monitoring stress and recovery.`,
            severity: 'warning',
            confidence: 0.7,
            timeframe: 'Last week',
            actionItems: [
              'Monitor stress levels',
              'Ensure adequate recovery between workouts',
              'Consider consulting a healthcare provider if persistent',
              'Focus on relaxation techniques'
            ],
            relatedMetrics: ['heart_rate_resting']
          });
        }
      }

      return insights.sort((a, b) => {
        const severityOrder = { alert: 4, warning: 3, success: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      console.error('Error generating health insights:', error);
      return [];
    }
  }

  // Helper methods for data parsing
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private generateMetricId(date: string, type: string, value: number): string {
    const hashInput = `${date.split('T')[0]}-${type}-${value}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private generateWorkoutId(date: string, type: string, duration: number): string {
    const hashInput = `${date}-${type}-${duration}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private createMetric(date: string, type: FitnessMetricType, value: number, unit: string, source: string): FitnessMetric {
    return {
      id: this.generateMetricId(date, type, value),
      date,
      type,
      value,
      unit,
      source,
      confidence: 0.8,
      metadata: {}
    };
  }

  private parseDate(dateStr: string): string {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private parseTimeToHours(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
  }

  private parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  private parsePaceToMinPerKm(paceStr: string): number {
    const parts = paceStr.split(':');
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
  }

  private getUnitForType(type: FitnessMetricType): string {
    const unitMap: { [key in FitnessMetricType]: string } = {
      steps: 'count',
      distance: 'm',
      calories_active: 'kcal',
      calories_resting: 'kcal',
      heart_rate_avg: 'bpm',
      heart_rate_max: 'bpm',
      heart_rate_min: 'bpm',
      heart_rate_resting: 'bpm',
      sleep_duration: 'hours',
      sleep_deep: 'hours',
      sleep_light: 'hours',
      sleep_rem: 'hours',
      weight: 'kg',
      body_fat: '%',
      muscle_mass: 'kg',
      water_weight: 'kg',
      blood_pressure_systolic: 'mmHg',
      blood_pressure_diastolic: 'mmHg',
      vo2_max: 'ml/kg/min',
      floors_climbed: 'count',
      active_minutes: 'minutes',
      workout_time: 'minutes',
      recovery_time: 'hours',
      stress_level: 'score'
    };
    return unitMap[type] || 'unknown';
  }

  // Mapping functions for different platforms
  private mapAppleHealthType(appleType: string): FitnessMetricType | null {
    const mapping: { [key: string]: FitnessMetricType } = {
      'HKQuantityTypeIdentifierStepCount': 'steps',
      'HKQuantityTypeIdentifierDistanceWalkingRunning': 'distance',
      'HKQuantityTypeIdentifierActiveEnergyBurned': 'calories_active',
      'HKQuantityTypeIdentifierBasalEnergyBurned': 'calories_resting',
      'HKQuantityTypeIdentifierHeartRate': 'heart_rate_avg',
      'HKQuantityTypeIdentifierRestingHeartRate': 'heart_rate_resting',
      'HKQuantityTypeIdentifierSleepAnalysis': 'sleep_duration',
      'HKQuantityTypeIdentifierBodyMass': 'weight',
      'HKQuantityTypeIdentifierVO2Max': 'vo2_max',
      'HKQuantityTypeIdentifierFlightsClimbed': 'floors_climbed'
    };
    return mapping[appleType] || null;
  }

  private mapAppleWorkoutType(appleType: string): WorkoutType {
    const mapping: { [key: string]: WorkoutType } = {
      'HKWorkoutActivityTypeRunning': 'running',
      'HKWorkoutActivityTypeWalking': 'walking',
      'HKWorkoutActivityTypeCycling': 'cycling',
      'HKWorkoutActivityTypeSwimming': 'swimming',
      'HKWorkoutActivityTypeFunctionalStrengthTraining': 'strength',
      'HKWorkoutActivityTypeYoga': 'yoga',
      'HKWorkoutActivityTypePilates': 'pilates',
      'HKWorkoutActivityTypeSoccer': 'football',
      'HKWorkoutActivityTypeTennis': 'tennis',
      'HKWorkoutActivityTypeGolf': 'golf',
      'HKWorkoutActivityTypeHiking': 'hiking',
      'HKWorkoutActivityTypeRowing': 'rowing',
      'HKWorkoutActivityTypeElliptical': 'elliptical'
    };
    return mapping[appleType] || 'other';
  }

  private mapGoogleFitType(dataSourceId: string): FitnessMetricType | null {
    if (dataSourceId.includes('step_count')) return 'steps';
    if (dataSourceId.includes('distance')) return 'distance';
    if (dataSourceId.includes('calories.expended')) return 'calories_active';
    if (dataSourceId.includes('heart_rate')) return 'heart_rate_avg';
    if (dataSourceId.includes('sleep')) return 'sleep_duration';
    if (dataSourceId.includes('weight')) return 'weight';
    return null;
  }

  private mapGoogleFitWorkoutType(activityType: number): WorkoutType {
    const mapping: { [key: number]: WorkoutType } = {
      8: 'running',
      7: 'walking',
      1: 'cycling',
      56: 'swimming',
      97: 'strength',
      108: 'yoga',
      89: 'pilates',
      15: 'football',
      87: 'tennis',
      32: 'golf',
      35: 'hiking',
      77: 'rowing',
      25: 'elliptical'
    };
    return mapping[activityType] || 'other';
  }

  private mapGarminActivityType(activityType: string): WorkoutType {
    const type = activityType.toLowerCase();
    if (type.includes('running') || type.includes('run')) return 'running';
    if (type.includes('walking') || type.includes('walk')) return 'walking';
    if (type.includes('cycling') || type.includes('bike')) return 'cycling';
    if (type.includes('swimming') || type.includes('swim')) return 'swimming';
    if (type.includes('strength') || type.includes('weight')) return 'strength';
    if (type.includes('yoga')) return 'yoga';
    if (type.includes('football') || type.includes('soccer')) return 'football';
    if (type.includes('tennis')) return 'tennis';
    if (type.includes('golf')) return 'golf';
    if (type.includes('hiking') || type.includes('hike')) return 'hiking';
    if (type.includes('rowing') || type.includes('row')) return 'rowing';
    if (type.includes('elliptical')) return 'elliptical';
    return 'other';
  }

  private mapFitbitActivityType(activityName: string): WorkoutType {
    const name = activityName.toLowerCase();
    if (name.includes('run')) return 'running';
    if (name.includes('walk')) return 'walking';
    if (name.includes('bike') || name.includes('cycling')) return 'cycling';
    if (name.includes('swim')) return 'swimming';
    if (name.includes('weights') || name.includes('strength')) return 'strength';
    if (name.includes('yoga')) return 'yoga';
    if (name.includes('pilates')) return 'pilates';
    if (name.includes('tennis')) return 'tennis';
    if (name.includes('golf')) return 'golf';
    if (name.includes('hike')) return 'hiking';
    if (name.includes('elliptical')) return 'elliptical';
    return 'other';
  }
}

// Export singleton instance
export const fitnessTracker = new FitnessTracker();

// Helper functions
export const parseFitnessData = (file: File, source: 'apple_health' | 'google_fit' | 'garmin' | 'fitbit', userId: string) =>
  fitnessTracker.parseDataExport(file, source, userId);

export const getHealthInsights = (userId: string, days?: number) =>
  fitnessTracker.generateHealthInsights(userId, days);

export default fitnessTracker;