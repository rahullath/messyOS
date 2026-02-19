# AI Note Enrichment Service

## Overview

The AI Note Enrichment Service provides intelligent fallback enrichment for habit notes when deterministic parsing produces low-confidence results. It uses Google Gemini AI to extract structured data from ambiguous or complex notes while respecting token balance and providing graceful degradation.

## Key Features

- **Deterministic First**: Always attempts deterministic parsing before considering AI
- **Confidence-Based**: Only uses AI when deterministic confidence < threshold (default 0.5)
- **Token-Aware**: Checks user token balance before making AI calls
- **Graceful Fallback**: Returns deterministic results if AI fails or is unavailable
- **Configurable**: Can be disabled or customized via configuration
- **Batch Support**: Efficiently process multiple notes in one operation

## Requirements Satisfied

- **13.1**: Call AI only when deterministic parsing has low confidence
- **13.2**: Mark enriched data with source: "ai_enriched"
- **13.3**: Handle AI failures gracefully (use deterministic results)
- **13.4**: Respect token balance
- **13.5**: Allow disabling via configuration

## Usage

### Basic Enrichment

```typescript
import { enrichNoteWithAI } from '@/lib/habits/ai-note-enrichment';
import { SemanticType } from '@/lib/habits/taxonomy';

// Enrich a single note
const result = await enrichNoteWithAI(
  userId,
  'had 2-3 pouches, felt stressed',
  SemanticType.NICOTINE_POUCHES
);

if (result.success) {
  console.log('Enriched data:', result.enrichedData);
  console.log('Confidence:', result.enrichedData.confidence);
  console.log('Parse method:', result.enrichedData.parse_method);
  console.log('Tokens used:', result.tokensUsed);
}
```

### Custom Configuration

```typescript
// Disable AI enrichment
const result = await enrichNoteWithAI(
  userId,
  note,
  semanticType,
  { enabled: false }
);

// Custom confidence threshold
const result = await enrichNoteWithAI(
  userId,
  note,
  semanticType,
  { confidenceThreshold: 0.7 } // Higher threshold = more AI usage
);

// Custom token cost
const result = await enrichNoteWithAI(
  userId,
  note,
  semanticType,
  { tokenCost: 20 } // Default is 15
);
```

### Batch Enrichment

```typescript
import { batchEnrichNotes } from '@/lib/habits/ai-note-enrichment';

const notes = [
  { note: '2 pouches 6mg', semanticType: SemanticType.NICOTINE_POUCHES },
  { note: 'reg shower with skincare', semanticType: SemanticType.SHOWER },
  { note: 'ambiguous note' },
];

const results = await batchEnrichNotes(userId, notes);

results.forEach((result, index) => {
  console.log(`Note ${index + 1}:`, {
    success: result.success,
    confidence: result.enrichedData?.confidence,
    fallbackUsed: result.fallbackUsed,
  });
});
```

## Configuration Options

```typescript
interface AIEnrichmentConfig {
  enabled: boolean;              // Enable/disable AI enrichment (default: true)
  confidenceThreshold: number;   // Min confidence to skip AI (default: 0.5)
  tokenCost: number;             // Tokens per enrichment (default: 15)
  maxRetries: number;            // Max retries on failure (default: 1)
}
```

## Token Costs

- **Single enrichment**: 15 tokens (configurable)
- **Batch enrichment**: 15 tokens × number of notes
- **Failed enrichment**: 0 tokens (no charge on failure)

## Workflow

1. **Deterministic Parsing**: Always runs first, provides baseline results
2. **Confidence Check**: If confidence >= threshold, return deterministic results
3. **Configuration Check**: If AI disabled, return deterministic results
4. **Token Balance Check**: Verify sufficient tokens available
5. **AI Enrichment**: Call Gemini AI with structured prompt
6. **Token Deduction**: Deduct tokens on successful enrichment
7. **Result Merging**: Combine AI insights with deterministic results
8. **Fallback**: Return deterministic results on any failure

## Error Handling

The service handles all errors gracefully:

- **Insufficient tokens**: Returns deterministic results with error message
- **AI API failure**: Returns deterministic results with error message
- **Invalid response**: Returns deterministic results with error message
- **Token deduction failure**: Returns enriched data but logs error
- **Configuration errors**: Returns deterministic results

## Parse Method Marking

Results are marked with `parse_method`:

- `'deterministic'`: Parsed using pattern matching only
- `'ai_enriched'`: Enhanced by AI (confidence boosted)
- `'failed'`: Parsing failed (confidence < 0.5, no AI)

## Integration with Import

```typescript
import { enrichNoteWithAI } from '@/lib/habits/ai-note-enrichment';
import { parseNote } from '@/lib/habits/note-parser';

// During Loop Habits import
async function importHabitEntry(userId: string, entry: any) {
  // Try AI enrichment if enabled
  const enrichResult = await enrichNoteWithAI(
    userId,
    entry.notes,
    entry.semanticType
  );
  
  // Store enriched data
  await supabase.from('habit_entries').insert({
    user_id: userId,
    notes: entry.notes,
    parsed: enrichResult.enrichedData,
    numeric_value: enrichResult.enrichedData?.count,
    source: 'loop_per_habit',
  });
}
```

## Testing

Run the test suite:

```bash
npx tsx scripts/test-ai-enrichment.ts
```

Tests cover:
- High confidence deterministic parsing (no AI)
- Low confidence deterministic parsing (AI triggered)
- AI enrichment disabled via config
- Parse method marking
- Graceful degradation on failures
- Batch enrichment
- Configuration overrides
- Original text preservation

## Environment Variables

Required for AI enrichment:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

If not set, AI enrichment will always fallback to deterministic results.

## Performance Considerations

- **Deterministic parsing**: ~1ms per note
- **AI enrichment**: ~500-2000ms per note (network dependent)
- **Batch operations**: Sequential processing to respect rate limits
- **Token balance check**: ~50ms per check (cached)

## Best Practices

1. **Always enable deterministic parsing**: It's fast and free
2. **Set appropriate confidence threshold**: 0.5 is a good default
3. **Use batch operations for imports**: More efficient than individual calls
4. **Monitor token usage**: Track enrichment stats for users
5. **Provide user controls**: Let users enable/disable AI enrichment
6. **Cache enriched results**: Don't re-enrich the same note

## Future Enhancements

- [ ] Support for other AI providers (OpenAI, Anthropic)
- [ ] Caching of AI enrichment results
- [ ] User-specific enrichment preferences
- [ ] Enrichment quality feedback loop
- [ ] Automatic re-enrichment of low-quality results
- [ ] Enrichment analytics dashboard

## Related Files

- `src/lib/habits/note-parser.ts` - Deterministic parsing
- `src/lib/habits/taxonomy.ts` - Semantic type definitions
- `src/lib/tokens/service.ts` - Token management
- `src/lib/ai/gemini.ts` - Gemini AI integration
- `scripts/test-ai-enrichment.ts` - Test suite
