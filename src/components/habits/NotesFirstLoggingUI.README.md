# NotesFirstLoggingUI Component

A structured chip-based interface for logging habits with rich context. This component generates contextual chip suggestions based on habit semantic types, allowing users to quickly compose parseable notes.

## Features

- **Semantic Type Detection**: Automatically infers habit type from name and unit
- **Dynamic Chip Generation**: Shows relevant chips based on habit type
- **Smart Selection**: Single-select for type/method, multi-select for other categories
- **Free-Form Text**: Allows additional notes alongside chips
- **Live Preview**: Shows composed note before submission
- **API Integration**: Wires directly to enhanced logging endpoint

## Usage

### Basic Usage

```tsx
import NotesFirstLoggingUI from './components/habits/NotesFirstLoggingUI';
import type { Habit } from './types/habits';

function MyComponent({ habit }: { habit: Habit }) {
  const handleSubmit = async (notes: string, value?: number) => {
    const response = await fetch(`/api/habits/${habit.id}/log-enhanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: value || 1,
        notes,
        date: new Date().toISOString().split('T')[0],
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to log habit');
    }
  };

  return (
    <NotesFirstLoggingUI
      habit={habit}
      onSubmit={handleSubmit}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

### With Modal

See `NotesFirstLoggingUIExample.tsx` for a complete modal implementation.

## Chip Categories by Semantic Type

### Nicotine (NICOTINE_POUCHES, VAPING_PUFFS)
- **Strength**: 3mg, 6mg, 13.5mg, 50mg
- **Count**: 1, 2, 3+
- **Timing**: Morning, Afternoon, Evening

### Shower (SHOWER)
- **Type**: Reg shower, Head shower, Proper cleanse, Only water
- **Includes**: + Skincare, + Oral hygiene

### Cannabis (POT_USE)
- **Method**: Vaporizer, Bong, Edibles, AVB
- **Sessions**: 0.5 sesh, 1 sesh, 1.5 sesh, 2+ sesh
- **Context**: Shared, Alone

### Meals (MEALS_COOKED)
- **Count**: 1 meal, 2 meals, 3 meals
- **Type**: Cooked, Takeout, Simple

## Note Composition

The component composes notes by joining selected chip values with commas:

```
Selected chips: ["6mg", "2", "morning"]
Free text: "felt good"
Composed note: "6mg, 2, morning, felt good"
```

This format is designed to be parseable by the deterministic notes parser (`src/lib/habits/note-parser.ts`).

## Props

### `habit: Habit` (required)
The habit object to log. Must include `name` and optionally `target_unit` for semantic type inference.

### `onSubmit: (notes: string, value?: number) => Promise<void>` (required)
Callback function called when the form is submitted. Receives the composed note string and optional value.

### `onCancel?: () => void` (optional)
Callback function called when the cancel button is clicked.

### `className?: string` (optional)
Additional CSS classes to apply to the root element.

## Requirements Coverage

- ✅ **9.1**: Display structured chip suggestions based on semantic type
- ✅ **9.2**: Nicotine chips: strength, count, timing
- ✅ **9.3**: Shower chips: type, includes_skincare, includes_oral
- ✅ **9.4**: Cannabis chips: method, sessions, shared/alone
- ✅ **9.5**: Meal chips: count, type
- ✅ **9.6**: Compose note string from chips
- ✅ **9.7**: Allow free-form text alongside chips

## Testing

Run the test script to verify functionality:

```bash
npx tsx scripts/test-notes-first-logging-ui.tsx
```

## Integration with Parser

The composed notes are designed to be parsed by `src/lib/habits/note-parser.ts`:

```typescript
import { parseNote } from './lib/habits/note-parser';

const note = "6mg, 2, morning";
const parsed = parseNote(note, SemanticType.NICOTINE_POUCHES);

// Result:
// {
//   strength_mg: 6,
//   count: 2,
//   nicotine: { method: 'pouch', strength_mg: 6, count: 2 },
//   confidence: 0.9,
//   parse_method: 'deterministic'
// }
```

## Styling

The component uses Tailwind CSS classes. Key style features:

- Selected chips: Blue background with white text
- Unselected chips: Gray background with hover effect
- Preview box: Light gray background with border
- Responsive layout with proper spacing

## Future Enhancements

Potential improvements for future iterations:

1. **Custom chip values**: Allow users to input custom values for chips
2. **Chip presets**: Save frequently used chip combinations
3. **Voice input**: Add voice-to-text for free-form notes
4. **Smart suggestions**: Suggest chips based on time of day or recent patterns
5. **Validation**: Warn if composed note might not parse well
