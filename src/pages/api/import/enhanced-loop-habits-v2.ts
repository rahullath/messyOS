import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import {
  EnhancedLoopHabitsImporter,
  type ConflictResolution as RootConflictResolution,
  type ImportProgress,
  type ImportSummary,
} from '../../../lib/import/enhanced-loop-habits';
import {
  EnhancedLoopHabitsImporterV2,
  type ConflictResolution as PerHabitConflictResolution,
} from '../../../lib/import/enhanced-loop-habits-v2';

function asImportSummaryFromPerHabit(result: {
  success: boolean;
  importedHabits: number;
  importedEntries: number;
  errors: Array<{ message: string; details?: any; severity?: string }>;
  warnings: Array<{ message: string; details?: any }>;
}, processingTime: number): ImportSummary {
  return {
    success: result.success,
    totalHabits: result.importedHabits,
    importedHabits: result.importedHabits,
    skippedHabits: 0,
    totalEntries: result.importedEntries,
    importedEntries: result.importedEntries,
    failedEntries: result.errors.filter((e) => e.severity === 'error').length,
    conflicts: [],
    errors: result.errors.map((e) => ({
      type: 'database',
      severity: 'error',
      message: e.message,
      details: e.details,
    })),
    warnings: result.warnings.map((w) => ({
      type: 'parsing',
      severity: 'warning',
      message: w.message,
      details: w.details,
    })),
    recommendations: result.success
      ? [
          `Imported ${result.importedHabits} habits with ${result.importedEntries} entries from per-habit files.`,
          'Review low-confidence fuzzy matches in Habits after import.',
        ]
      : ['Import completed with errors. Review warnings and errors before retrying.'],
    processingTime,
    statistics: {
      habitsByCategory: {},
      entriesByMonth: {},
      averageStreakLength: 0,
      mostActiveHabit: '',
    },
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverAuth = createServerAuth(cookies);

  try {
    const user = await serverAuth.requireAuth();
    const formData = await request.formData();
    const importFormat = (formData.get('importFormat') as string | null) || 'root';
    const conflictResolutionsStr = formData.get('conflictResolutions') as string | null;

    let rootConflictResolutions: RootConflictResolution[] | undefined;
    let perHabitConflictResolutions: PerHabitConflictResolution[] | undefined;
    if (conflictResolutionsStr) {
      try {
        const parsed = JSON.parse(conflictResolutionsStr);
        rootConflictResolutions = parsed;
        perHabitConflictResolutions = parsed;
      } catch (error) {
        console.warn('Failed to parse conflict resolutions:', error);
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        const sendProgress = (progress: ImportProgress) => {
          send({ type: 'progress', progress });
        };

        if (importFormat === 'per-habit') {
          const perHabitFiles: File[] = [];
          const receivedFields: Array<{ key: string; kind: string; name?: string }> = [];
          for (const [key, value] of formData.entries()) {
            const maybeFile = value as any;
            receivedFields.push({
              key,
              kind: typeof value,
              name: typeof maybeFile?.name === 'string' ? maybeFile.name : undefined,
            });

            if (key === 'importFormat' || key === 'conflictResolutions') continue;
            if (!maybeFile || typeof maybeFile !== 'object') continue;
            if (typeof maybeFile.name !== 'string') continue;
            if (typeof maybeFile.text !== 'function') continue;
            const lowerName = maybeFile.name.toLowerCase().replace(/\\/g, '/');
            if (!lowerName.endsWith('/checkmarks.csv') && lowerName !== 'checkmarks.csv') continue;
            perHabitFiles.push(maybeFile as File);
          }

          if (perHabitFiles.length === 0) {
            send({
              type: 'error',
              message: 'No per-habit Checkmarks.csv files were provided.',
              details: {
                importFormat,
                receivedFieldCount: receivedFields.length,
                receivedFields: receivedFields.slice(0, 20),
              },
            });
            controller.close();
            return;
          }

          const startedAt = Date.now();
          const importer = new EnhancedLoopHabitsImporterV2(cookies, user.id);

          sendProgress({
            stage: 'validation',
            progress: 10,
            message: 'Validating per-habit files',
            details: `${perHabitFiles.length} Checkmarks.csv files`,
          });

          importer
            .importPerHabitCheckmarks({
              files: perHabitFiles,
              userId: user.id,
              conflictResolution: perHabitConflictResolutions,
            })
            .then((result) => {
              sendProgress({
                stage: 'importing',
                progress: 85,
                message: 'Importing per-habit entries',
              });

              const summary = asImportSummaryFromPerHabit(result, Date.now() - startedAt);
              sendProgress({
                stage: 'complete',
                progress: 100,
                message: 'Per-habit import complete',
              });
              send({ type: 'complete', summary });
              controller.close();
            })
            .catch((error: any) => {
              console.error('Per-habit import error:', error);
              send({ type: 'error', message: error?.message || 'Per-habit import failed' });
              controller.close();
            });

          return;
        }

        const habitsFile = formData.get('habits') as File | null;
        const checkmarksFile = formData.get('checkmarks') as File | null;
        const scoresFile = formData.get('scores') as File | null;

        if (!habitsFile || !checkmarksFile || !scoresFile) {
          send({ type: 'error', message: 'Missing required root CSV files.' });
          controller.close();
          return;
        }

        const importer = new EnhancedLoopHabitsImporter(cookies, user.id, sendProgress);
        Promise.all([habitsFile.text(), checkmarksFile.text(), scoresFile.text()])
          .then(([habits, checkmarks, scores]) =>
            importer.importWithEnhancedHandling(
              { habits, checkmarks, scores },
              rootConflictResolutions
            )
          )
          .then((summary) => {
            if (summary.conflicts.length > 0 && !rootConflictResolutions) {
              send({ type: 'conflicts', conflicts: summary.conflicts });
            } else {
              send({ type: 'complete', summary });
            }
            controller.close();
          })
          .catch((error: any) => {
            console.error('Root import error:', error);
            send({ type: 'error', message: error?.message || 'Import failed' });
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return new Response(
        JSON.stringify({
          type: 'error',
          message: 'Please sign in to continue',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        type: 'error',
        message: 'Import failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
