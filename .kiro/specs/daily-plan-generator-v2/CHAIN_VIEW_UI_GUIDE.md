# Chain View UI Guide

## Overview
The Chain View is the primary interface for executing chains in the V2 daily plan generator. It provides a clear, actionable view of what needs to be done to reach your next anchor.

## Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                        [Delete Plan]                             │
├─────────────────────────────────────────────────────────────────┤
│                     Plan Context Display                         │
│  Wake: 7:00 AM | Sleep: 11:00 PM | Energy: Medium               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  [⚡ Chain View - Primary]  [🕐 Timeline]                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬──────────────────────────┐
│                                      │                          │
│  CHAIN VIEW (Main Content)           │  SIDEBAR                 │
│                                      │                          │
│  ┌────────────────────────────────┐ │  ┌────────────────────┐ │
│  │  Next Anchor                   │ │  │  Exit Times        │ │
│  │  ════════════════════════════  │ │  │                    │ │
│  │  Software Engineering Lecture  │ │  │  📍 Leave by 9:00  │ │
│  │  📍 CS Building, Room 101      │ │  │  🚴 30 min bike    │ │
│  │                                │ │  └────────────────────┘ │
│  │  Starts at: 10:00 AM           │ │                          │
│  │                                │ │  ┌────────────────────┐ │
│  │  ⏰ Complete chain by 9:00 AM  │ │  │  Degrade Plan      │ │
│  └────────────────────────────────┘ │  │                    │ │
│                                      │  │  [Degrade]         │ │
│  ┌────────────────────────────────┐ │  └────────────────────┘ │
│  │  📋 Chain Steps                │ │                          │
│  │  ────────────────────────────  │ │                          │
│  │                                │ │                          │
│  │  ✅ Feed cat (5m)              │ │                          │
│  │  ✅ Bathroom (10m)             │ │                          │
│  │  🔵 Hygiene (5m) [Current]    │ │                          │
│  │  ⭕ Shower (15m) [Optional]   │ │                          │
│  │  ⭕ Get dressed (10m)          │ │                          │
│  │  ⭕ Pack bag (10m) [Required] │ │                          │
│  │  ⭕ Exit Readiness Check (2m)  │ │                          │
│  │  ⭕ Leave house (0m)           │ │                          │
│  └────────────────────────────────┘ │                          │
│                                      │                          │
│  ┌────────────────────────────────┐ │                          │
│  │  🛡️ Exit Readiness             │ │                          │
│  │  ────────────────────────────  │ │                          │
│  │  Status: 🚫 Blocked            │ │                          │
│  │                                │ │                          │
│  │  Missing items:                │ │                          │
│  │  ❌ Keys present               │ │                          │
│  │  ❌ Phone charged >= 20%       │ │                          │
│  │  ❌ Water bottle filled        │ │                          │
│  │  ❌ Meds taken                 │ │                          │
│  │  ❌ Cat fed                    │ │                          │
│  │  ❌ Bag packed                 │ │                          │
│  │                                │ │                          │
│  │  Checklist:                    │ │                          │
│  │  ☐ Keys present                │ │                          │
│  │  ☐ Phone charged >= 20%        │ │                          │
│  │  ☐ Water bottle filled         │ │                          │
│  │  ☐ Meds taken                  │ │                          │
│  │  ☐ Cat fed                     │ │                          │
│  │  ☐ Bag packed                  │ │                          │
│  └────────────────────────────────┘ │                          │
│                                      │                          │
└──────────────────────────────────────┴──────────────────────────┘
```

## Visual Elements

### 1. Next Anchor Card
**Purpose**: Show the immovable event you're preparing for

**Visual Treatment**:
- Gradient background (primary/secondary accent colors)
- Large, bold title (3xl font)
- Location with pin icon
- Start time prominently displayed (2xl font)
- Chain Completion Deadline with clock icon

**Example**:
```
┌────────────────────────────────────────────────────┐
│  Next Anchor                                       │
│  ══════════════════════════════════════════════    │
│                                                    │
│  Software Engineering Lecture                      │
│  📍 Computer Science Building, Room 101            │
│                                                    │
│                              Starts at: 10:00 AM   │
│                                                    │
│  ⏰ Complete chain by 9:00 AM                      │
└────────────────────────────────────────────────────┘
```

### 2. Chain Steps List
**Purpose**: Show all steps needed to reach the anchor

**Step States**:
- ✅ **Completed**: Green checkmark, strikethrough text
- 🔵 **In Progress**: Blue circle with pulse animation, highlighted background
- ⭕ **Pending**: Gray circle outline
- ⚠️ **Skipped**: Yellow X icon, skip reason shown

**Step Metadata**:
- Duration badge (e.g., "5m", "15m")
- Start time (for pending steps)
- Required/Optional badge
- Current step indicator

**Example**:
```
┌────────────────────────────────────────────────────┐
│  📋 Chain Steps                                    │
│  ──────────────────────────────────────────────    │
│                                                    │
│  ✅ Feed cat                                       │
│     ⏱️ 5m                                          │
│                                                    │
│  ✅ Bathroom                                       │
│     ⏱️ 10m                                         │
│                                                    │
│  🔵 Hygiene (brush teeth)  [Current] [Required]   │
│     ⏱️ 5m  ⚡ 8:15 AM                              │
│                                                    │
│  ⭕ Shower  [Optional]                             │
│     ⏱️ 15m  ⚡ 8:20 AM                             │
│                                                    │
│  ⭕ Get dressed  [Required]                        │
│     ⏱️ 10m  ⚡ 8:35 AM                             │
│                                                    │
│  ⭕ Pack bag  [Required]                           │
│     ⏱️ 10m  ⚡ 8:45 AM                             │
│                                                    │
│  ⭕ Exit Readiness Check  [Required]               │
│     ⏱️ 2m  ⚡ 8:55 AM                              │
│                                                    │
│  ⭕ Leave house  [Required]                        │
│     ⏱️ 0m  ⚡ 8:57 AM                              │
└────────────────────────────────────────────────────┘
```

### 3. Exit Gate Status
**Purpose**: Ensure nothing is forgotten before leaving

**Blocked State** (Red):
```
┌────────────────────────────────────────────────────┐
│  🛡️ Exit Readiness          🚫 Blocked             │
│  ──────────────────────────────────────────────    │
│                                                    │
│  Missing items:                                    │
│  ❌ Keys present                                   │
│  ❌ Phone charged >= 20%                           │
│  ❌ Water bottle filled                            │
│  ❌ Meds taken                                     │
│  ❌ Cat fed                                        │
│  ❌ Bag packed                                     │
│                                                    │
│  Checklist:                                        │
│  ☐ Keys present                                    │
│  ☐ Phone charged >= 20%                            │
│  ☐ Water bottle filled                             │
│  ☐ Meds taken                                      │
│  ☐ Cat fed                                         │
│  ☐ Bag packed                                      │
└────────────────────────────────────────────────────┘
```

**Ready State** (Green):
```
┌────────────────────────────────────────────────────┐
│  🛡️ Exit Readiness          ✅ Ready to Leave      │
│  ──────────────────────────────────────────────    │
│                                                    │
│  Checklist:                                        │
│  ☑️ Keys present                                   │
│  ☑️ Phone charged >= 20%                           │
│  ☑️ Water bottle filled                            │
│  ☑️ Meds taken                                     │
│  ☑️ Cat fed                                        │
│  ☑️ Bag packed                                     │
└────────────────────────────────────────────────────┘
```

### 4. Tab Navigation
**Purpose**: Switch between Chain View and Timeline View

```
┌─────────────────────────────────────────────────────┐
│  [⚡ Chain View - Primary]  [🕐 Timeline]           │
└─────────────────────────────────────────────────────┘
```

**Active Tab**: Accent color, bottom border
**Inactive Tab**: Muted text, hover effect

### 5. No Anchors State
**Purpose**: Inform user when no chains exist

```
┌────────────────────────────────────────────────────┐
│  ℹ️ No anchors today. Your day is flexible!        │
│     The timeline view shows your planned           │
│     activities.                                    │
└────────────────────────────────────────────────────┘
```

## Color Palette

### Status Colors
- **Completed**: `text-green-500` / `bg-green-500/10`
- **In Progress**: `text-accent-primary` / `bg-accent-primary/10`
- **Pending**: `text-gray-400` / `bg-surface-primary`
- **Skipped**: `text-yellow-500` / `bg-yellow-500/10`
- **Blocked**: `text-red-400` / `bg-red-500/10`
- **Ready**: `text-green-400` / `bg-green-500/10`

### Semantic Colors
- **Primary Accent**: Chain View tab, current step, deadlines
- **Secondary Accent**: Gradient backgrounds
- **Warning**: Chain Completion Deadline
- **Error**: Blocked gate, missing items
- **Info**: No anchors message

## Interactions

### 1. Step Completion
**Action**: Click checkbox next to step
**Result**: 
- Step marked as completed
- Checkbox shows green checkmark
- Step text gets strikethrough
- Next step becomes current

### 2. Gate Condition Toggle
**Action**: Click checkbox next to gate condition
**Result**:
- Condition marked as satisfied
- Checkbox shows checkmark
- Condition text gets strikethrough
- Gate status updates (blocked → ready when all satisfied)
- Blocked reasons list updates

### 3. Tab Switching
**Action**: Click Timeline tab
**Result**:
- Timeline view shown
- Chain View hidden
- Tab indicator moves

### 4. Exit Gate Expansion
**Action**: Click expand button on Exit Gate step
**Result**:
- Gate conditions shown inline
- Expand icon rotates
- Step height increases

## Responsive Behavior

### Desktop (lg+)
- 2/3 main content, 1/3 sidebar
- Side-by-side layout
- Full tab navigation

### Tablet (md)
- 1/2 main content, 1/2 sidebar
- Stacked on smaller tablets
- Compact tab navigation

### Mobile (sm)
- Full width stacked layout
- Sidebar below main content
- Simplified tab navigation
- Larger touch targets

## Accessibility

### Keyboard Navigation
- Tab through chain steps
- Space to toggle checkboxes
- Enter to expand/collapse
- Arrow keys for tab navigation

### Screen Reader
- Announces step status changes
- Reads gate status updates
- Describes current step
- Announces completion deadline

### Visual
- High contrast mode support
- Focus indicators on all interactive elements
- Clear visual hierarchy
- Sufficient color contrast ratios

## Usage Examples

### Example 1: Morning Class
```
Next Anchor: Software Engineering Lecture
Location: CS Building, Room 101
Starts at: 10:00 AM
Complete chain by: 9:00 AM

Chain Steps:
✅ Feed cat (5m)
✅ Bathroom (10m)
🔵 Hygiene (5m) [Current]
⭕ Shower (15m) [Optional]
⭕ Get dressed (10m)
⭕ Pack bag (10m)
⭕ Exit Readiness Check (2m)
⭕ Leave house (0m)

Exit Gate: 🚫 Blocked
Missing: Keys, Phone, Water, Meds, Cat fed, Bag packed
```

### Example 2: Afternoon Appointment
```
Next Anchor: Doctor's Appointment
Location: City Medical Center
Starts at: 2:30 PM
Complete chain by: 1:45 PM

Chain Steps:
✅ Bathroom (10m)
✅ Hygiene (5m)
✅ Get dressed (10m)
✅ Pack bag (10m)
✅ Exit Readiness Check (2m)
🔵 Leave house (0m) [Current]

Exit Gate: ✅ Ready to Leave
All conditions satisfied!
```

### Example 3: No Anchors
```
ℹ️ No anchors today. Your day is flexible!
   The timeline view shows your planned activities.

[Timeline View Active]
```

## Best Practices

### For Users
1. **Check Chain Completion Deadline**: Know when you need to be ready
2. **Focus on Current Step**: Don't worry about future steps
3. **Use Exit Gate**: Prevent forgetting essential items
4. **Mark Steps Complete**: Track progress through the chain
5. **Switch to Timeline**: When you want to see time-based view

### For Developers
1. **Keep Chain View Primary**: When chains exist
2. **Preserve Timeline**: For backward compatibility
3. **Update Gate State**: On every condition toggle
4. **Highlight Current Step**: Make it obvious what to do next
5. **Show Skip Reasons**: When steps are skipped

## Future Enhancements

1. **Multiple Chains**: Display all chains for the day
2. **Chain Progress Bar**: Visual indicator of completion
3. **Time Remaining**: Countdown to Chain Completion Deadline
4. **Smart Suggestions**: AI-powered step recommendations
5. **Voice Commands**: "Mark step complete", "Check exit gate"
6. **Haptic Feedback**: Vibration on step completion (mobile)
7. **Chain Templates**: User-customizable chain templates
8. **Chain Analytics**: Track completion rates and bottlenecks
