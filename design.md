# GoRep — App Design

## Brand & Color Choices

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| primary | #FF6B35 | #FF8C5A | Energetic orange — action buttons, accents |
| background | #FAFAFA | #121214 | Clean off-white / deep dark |
| surface | #FFFFFF | #1C1C1E | Cards, modals |
| foreground | #1A1A2E | #F5F5F7 | Primary text |
| muted | #8E8E93 | #8E8E93 | Secondary text, labels |
| border | #E5E5EA | #38383A | Dividers |
| success | #34C759 | #30D158 | Completed workouts, streaks |
| warning | #FF9F0A | #FFD60A | Medium energy, caution |
| error | #FF3B30 | #FF453A | Low energy, missed days |

## Screen List

### 1. Onboarding Flow (shown once on first launch)
- **Welcome Screen**: App name, tagline "Stop planning. Start doing.", single CTA "Get Started"
- **Profile Setup Screen**: Scrollable form collecting age, gender, fitness level
- **Equipment Screen**: Grid of equipment toggles (bodyweight, dumbbells, barbell, resistance bands, pull-up bar, jump rope, yoga mat, kettlebell, treadmill, stationary bike)
- **Preferences Screen**: Activity preference chips (running, cycling, yoga, HIIT, strength training, stretching, walking, swimming, bodyweight exercises, core work)

### 2. Main App Screens (tab bar)
- **Home Screen (Tab 1)**: The core 3-button interface
- **History Screen (Tab 2)**: Simple workout log / progress tracking
- **Profile Screen (Tab 3)**: View/edit profile, equipment, preferences

## Primary Content & Functionality

### Home Screen — "The Decision Eliminator"
- Large greeting: "What's your move today?"
- **Step 1**: Energy/Motivation selector — 3 large tappable cards: Low (🔋), Medium (⚡), High (🔥)
- **Step 2**: Time Available selector — 3 large tappable cards: 10 min, 20 min, 30 min
- **Step 3**: Big CTA button: "Tell Me What To Do" (disabled until steps 1 & 2 selected)
- Selected states clearly highlighted with primary color
- Last workout summary card at bottom (optional, subtle)

### Workout Display Screen (pushed from Home)
- Workout title and type badge
- Duration and intensity indicators
- Numbered exercise list with:
  - Exercise name (bold)
  - Sets x Reps or Duration
  - Brief form cue (one line)
- "Complete Workout" button at bottom
- "Skip This One" link (generates alternative)

### History Screen
- Weekly streak counter at top
- Simple list of completed workouts (date, type, duration)
- Weekly summary card (total workouts, total minutes, workout types)
- No complex charts — keep it minimal

### Profile Screen
- User info display (age, gender, fitness level)
- Equipment list (editable)
- Activity preferences (editable)
- App settings (dark mode toggle)

## Key User Flows

### First Launch Flow
1. User opens app → Welcome screen
2. Tap "Get Started" → Profile setup (age, gender, fitness level)
3. Tap "Next" → Equipment selection
4. Tap "Next" → Activity preferences
5. Tap "Done" → Home screen (main app)

### Daily Workout Flow (core loop)
1. User opens app → Home screen
2. Tap energy level card (Low/Med/High)
3. Tap time available card (10/20/30 min)
4. Tap "Tell Me What To Do" → Loading animation → Workout screen
5. Follow exercises → Tap "Complete Workout" → Success animation → Home

### Profile Edit Flow
1. Tap Profile tab → Profile screen
2. Tap any section to edit → Inline editing
3. Changes auto-save

## Layout Specifications

### Home Screen Layout (portrait 9:16)
- Top: Safe area + greeting text (16px padding)
- Middle: Two selector sections stacked vertically, each with 3 cards in a row
- Bottom: Large CTA button (full width, 56px height, 16px margin)
- Cards: Equal width, 100px height, rounded corners (16px), subtle shadow

### Workout Screen Layout
- Sticky header: workout title + type badge
- Scrollable body: numbered exercise cards
- Sticky footer: Complete/Skip buttons

## Navigation Structure
- Tab bar with 3 tabs: Home, History, Profile
- Workout display: Stack push from Home tab
- Onboarding: Separate stack, shown before tabs on first launch

## Data Storage
- All data stored locally via AsyncStorage
- Profile, equipment, preferences
- Workout history (last 30 days)
- AI learning data (preference weights, workout patterns)
- No cloud sync required unless user explicitly requests

## AI-Driven Optimization (Server-side LLM)
- Uses built-in server LLM (no API key needed)
- Sends user profile + recent workout history + selections to LLM
- LLM returns structured JSON workout plan
- Learning: tracks which workout types user completes vs skips
- Adjustments: avoids repeating same type within last 3 workouts
- Load management: considers training stress from recent sessions
