/**
 * AI Note Enrichment Service
 * 
 * Provides AI-powered enrichment as a fallback when deterministic parsing
 * produces low-confidence results. This service respects token balance,
 * handles failures gracefully, and can be disabled via configuration.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseNote, type ParsedNoteData } from './note-parser';
import { type SemanticType } from './taxonomy';
import { tokenService } from '../tokens/service';

/**
 * Configuration for AI enrichment
 */
export interface AIEnrichmentConfig {
  enabled: boolean;
  confidenceThreshold: number; // Only enrich if deterministic confidence < this
  tokenCost: number; // Cost per enrichment call
  maxRetries: number; // Max retries on failure
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AIEnrichmentConfig = {
  enabled: true,
  confidenceThreshold: 0.5,
  tokenCost: 15, // 15 tokens per AI enrichment
  maxRetries: 1,
};

/**
 * AI enrichment result
 */
export interface AIEnrichmentResult {
  success: boolean;
  enrichedData?: ParsedNoteData;
  error?: string;
  tokensUsed?: number;
  fallbackUsed: boolean; // True if deterministic result was used
}

/**
 * Enrich a habit note using AI when deterministic parsing has low confidence
 * 
 * This function:
 * 1. First attempts deterministic parsing
 * 2. If confidence < threshold, checks token balance
 * 3. If sufficient tokens, calls AI for enrichment
 * 4. Marks enriched data with parse_method: 'ai_enriched'
 * 5. Falls back to deterministic results on any failure
 * 
 * @param userId - User ID for token balance check
 * @param note - The habit note to enrich
 * @param semanticType - Optional semantic type hint
 * @param config - Optional configuration overrides
 * @returns Enrichment result with parsed data
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export async function enrichNoteWithAI(
  userId: string,
  note: string,
  semanticType?: SemanticType,
  config: Partial<AIEnrichmentConfig> = {}
): Promise<AIEnrichmentResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Step 1: Always try deterministic parsing first
  const deterministicResult = parseNote(note, semanticType);
  
  // Step 2: Check if AI enrichment is needed
  // Requirement 13.1: Call AI only when deterministic parsing has low confidence
  if (deterministicResult.confidence >= finalConfig.confidenceThreshold) {
    return {
      success: true,
      enrichedData: deterministicResult,
      fallbackUsed: false,
    };
  }
  
  // Step 3: Check if AI enrichment is enabled
  // Requirement 13.5: Allow disabling via configuration
  if (!finalConfig.enabled) {
    return {
      success: true,
      enrichedData: deterministicResult,
      fallbackUsed: true,
      error: 'AI enrichment is disabled',
    };
  }
  
  // Step 4: Check token balance
  // Requirement 13.4: Respect token balance
  try {
    const balance = await tokenService.getTokenBalance(userId);
    
    if (!balance || balance.balance < finalConfig.tokenCost) {
      console.log(`Insufficient tokens for AI enrichment. Required: ${finalConfig.tokenCost}, Available: ${balance?.balance || 0}`);
      
      // Requirement 13.3: Use deterministic results when AI fails
      return {
        success: true,
        enrichedData: deterministicResult,
        fallbackUsed: true,
        error: 'Insufficient token balance',
      };
    }
  } catch (error) {
    console.error('Error checking token balance:', error);
    
    // Requirement 13.3: Handle AI failures gracefully
    return {
      success: true,
      enrichedData: deterministicResult,
      fallbackUsed: true,
      error: 'Failed to check token balance',
    };
  }
  
  // Step 5: Attempt AI enrichment
  try {
    const enrichedData = await callAIForEnrichment(note, semanticType, deterministicResult);
    
    // Step 6: Deduct tokens on success
    const deductionResult = await tokenService.deductTokens(
      userId,
      finalConfig.tokenCost,
      'AI habit note enrichment',
      'ai_note_enrichment',
      undefined,
      { note_preview: note.substring(0, 50) }
    );
    
    if (!deductionResult.success) {
      console.error('Failed to deduct tokens after AI enrichment:', deductionResult.error);
      // Still return enriched data even if token deduction fails
    }
    
    // Requirement 13.2: Mark enriched data with source: "ai_enriched"
    enrichedData.parse_method = 'ai_enriched';
    
    return {
      success: true,
      enrichedData,
      tokensUsed: finalConfig.tokenCost,
      fallbackUsed: false,
    };
    
  } catch (error) {
    console.error('AI enrichment failed:', error);
    
    // Requirement 13.3: Use deterministic results when AI fails
    return {
      success: true,
      enrichedData: deterministicResult,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : 'AI enrichment failed',
    };
  }
}

/**
 * Call AI service to enrich note data
 * 
 * Uses Google Gemini to extract structured data from the note.
 * Combines deterministic results with AI insights for best accuracy.
 * 
 * @param note - The habit note to enrich
 * @param semanticType - Optional semantic type hint
 * @param deterministicResult - Results from deterministic parsing
 * @returns Enriched parsed note data
 */
async function callAIForEnrichment(
  note: string,
  semanticType: SemanticType | undefined,
  deterministicResult: ParsedNoteData
): Promise<ParsedNoteData> {
  // Initialize Gemini
  const apiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  // Build prompt with context
  const prompt = buildEnrichmentPrompt(note, semanticType, deterministicResult);
  
  // Call AI
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse AI response
  try {
    const aiData = JSON.parse(text);
    
    // Merge AI results with deterministic results
    // AI takes precedence for fields it successfully extracted
    const enrichedData: ParsedNoteData = {
      ...deterministicResult,
      ...aiData,
      confidence: Math.max(deterministicResult.confidence, aiData.confidence || 0.7),
      parse_method: 'ai_enriched',
      original_text: note,
    };
    
    return enrichedData;
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('AI returned invalid JSON');
  }
}

/**
 * Build enrichment prompt for AI
 * 
 * Creates a structured prompt that guides the AI to extract
 * relevant information based on semantic type and deterministic results.
 * 
 * @param note - The habit note
 * @param semanticType - Optional semantic type
 * @param deterministicResult - Deterministic parsing results
 * @returns Prompt string for AI
 */
function buildEnrichmentPrompt(
  note: string,
  semanticType: SemanticType | undefined,
  deterministicResult: ParsedNoteData
): string {
  const semanticContext = semanticType 
    ? `This is a ${semanticType} habit note.` 
    : 'The habit type is unknown.';
  
  const deterministicContext = deterministicResult.confidence > 0.3
    ? `Deterministic parsing found: ${JSON.stringify(deterministicResult, null, 2)}`
    : 'Deterministic parsing found minimal information.';
  
  return `You are a habit note parser. Extract structured data from this habit note.

${semanticContext}

Note: "${note}"

${deterministicContext}

Extract the following information if present:
- Quantities: count, count_range, strength_mg, duration_minutes
- Substances: nicotine (method, strength_mg, count), cannabis (method, sessions, shared), caffeine (product, brand)
- Hygiene: shower (type, includes_skincare, includes_oral), oral_hygiene (sessions), skincare (done)
- Sleep: slept_from, slept_to (ISO time format)
- Social: context, duration_minutes, location
- Tags: any relevant tags

Return ONLY a valid JSON object matching the ParsedNoteData interface. Include a confidence score (0.0-1.0).

Example response:
{
  "count": 2,
  "strength_mg": 6,
  "nicotine": {
    "method": "pouch",
    "strength_mg": 6,
    "count": 2
  },
  "confidence": 0.85
}

Your response (JSON only, no markdown):`;
}

/**
 * Batch enrich multiple notes
 * 
 * Enriches multiple notes in a single operation, useful for
 * bulk imports or re-processing historical data.
 * 
 * @param userId - User ID for token balance
 * @param notes - Array of notes with semantic types
 * @param config - Optional configuration
 * @returns Array of enrichment results
 */
export async function batchEnrichNotes(
  userId: string,
  notes: Array<{ note: string; semanticType?: SemanticType }>,
  config: Partial<AIEnrichmentConfig> = {}
): Promise<AIEnrichmentResult[]> {
  const results: AIEnrichmentResult[] = [];
  
  // Check total token cost upfront
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const totalCost = notes.length * finalConfig.tokenCost;
  
  const balance = await tokenService.getTokenBalance(userId);
  
  if (!balance || balance.balance < totalCost) {
    console.log(`Insufficient tokens for batch enrichment. Required: ${totalCost}, Available: ${balance?.balance || 0}`);
    
    // Return deterministic results for all notes
    for (const { note, semanticType } of notes) {
      const deterministicResult = parseNote(note, semanticType);
      results.push({
        success: true,
        enrichedData: deterministicResult,
        fallbackUsed: true,
        error: 'Insufficient token balance for batch',
      });
    }
    
    return results;
  }
  
  // Process each note
  for (const { note, semanticType } of notes) {
    const result = await enrichNoteWithAI(userId, note, semanticType, config);
    results.push(result);
    
    // Stop if we run out of tokens mid-batch
    if (result.fallbackUsed && result.error?.includes('token')) {
      // Process remaining notes with deterministic parsing only
      for (let i = results.length; i < notes.length; i++) {
        const { note: remainingNote, semanticType: remainingType } = notes[i];
        const deterministicResult = parseNote(remainingNote, remainingType);
        results.push({
          success: true,
          enrichedData: deterministicResult,
          fallbackUsed: true,
          error: 'Batch stopped due to insufficient tokens',
        });
      }
      break;
    }
  }
  
  return results;
}

/**
 * Get AI enrichment statistics for a user
 * 
 * Returns usage statistics for AI enrichment feature.
 * 
 * @param userId - User ID
 * @returns Statistics object
 */
export async function getEnrichmentStats(userId: string): Promise<{
  totalEnrichments: number;
  tokensSpent: number;
  averageConfidenceGain: number;
}> {
  // This would query token_transactions table for ai_note_enrichment entries
  // For now, return placeholder
  return {
    totalEnrichments: 0,
    tokensSpent: 0,
    averageConfidenceGain: 0,
  };
}
