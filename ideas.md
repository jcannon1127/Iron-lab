# Bench Press Tracker — Design Ideas

## Three Approaches

### 1. Iron Lab
**Probability:** 0.07
Dark, industrial aesthetic. Heavy steel textures, deep charcoal backgrounds, orange-red accent for PRs and danger zones. Feels like a real gym chalk board.

### 2. Performance Dashboard
**Probability:** 0.04
Clean, data-forward sports analytics feel. White/light-gray background, electric blue accents, bold numerical typography. Inspired by sports broadcast overlays.

### 3. Chalk & Concrete
**Probability:** 0.09
Gritty but minimal. Off-white "chalk" background, raw concrete texture, bold black type, single vivid accent (electric lime green). Feels handwritten and athletic.

---

## Chosen Approach: Iron Lab (Dark Industrial)

**Design Movement:** Industrial Brutalism meets Sports Analytics

**Core Principles:**
1. Data is the hero — large, bold numerals dominate every card
2. Dark backgrounds create focus and reduce eye strain during workouts
3. Accent colors carry meaning: orange = active/warning, green = success/PR, red = destructive
4. Asymmetric layout with left-anchored sidebar-style structure

**Color Philosophy:**
- Background: near-black charcoal `oklch(0.12 0.008 260)` — feels like a dark gym floor
- Surface cards: `oklch(0.18 0.008 260)` — slightly lifted steel plate
- Primary accent: electric orange `oklch(0.72 0.18 45)` — energy, urgency, iron heat
- Success green: `oklch(0.68 0.18 145)` — PR, goal achieved
- Muted text: `oklch(0.55 0.01 260)` — secondary data

**Layout Paradigm:**
- Single-page dashboard with a sticky top header showing live session stats
- Two-column asymmetric layout: left (wider) = current session log, right (narrower) = session history/comparison
- Progress bar for 100-rep goal spans full width at top

**Signature Elements:**
1. Large "odometer" style rep counter — monospace font, oversized
2. Weight plates visual metaphor in the progress ring
3. Horizontal rule dividers styled like barbell bars

**Interaction Philosophy:**
- Adding a set triggers a satisfying "clank" animation (scale + brief glow)
- Progress bar fills with a spring-physics ease
- Completed sessions slide into history with a smooth downward push

**Animation:**
- New set card: slide-in from left, 200ms ease-out
- Progress bar: spring fill, 400ms
- Number counters: count-up animation on load/update, 300ms
- Button press: scale(0.96) active state, 120ms

**Typography System:**
- Display/numbers: `Oswald` — condensed, bold, athletic
- Body/labels: `Inter` — clean, readable
- Hierarchy: 4xl+ for key metrics, sm for labels

**Brand Essence:**
"Your iron ledger — for lifters who count every pound."
Personality: Focused, Honest, Relentless

**Brand Voice:**
- Headlines: direct, imperative — "Log Your Set." "Own Your Volume."
- CTAs: "Add Set", "Start New Session", "Compare Sessions"
- No filler copy.

**Wordmark & Logo:**
Stylized barbell icon (two circles connected by a bar) in orange, no text.

**Signature Brand Color:** Electric orange `oklch(0.72 0.18 45)`

---

## Style Decisions
- Use `Oswald` for all numeric displays and headings
- Dark theme as default (gym environment)
- 100-rep goal is the primary progress indicator
- Volume (lbs × reps) is the key comparison metric between sessions
