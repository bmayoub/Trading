```markdown
# Design System: High-Tech Arabic Trading Dashboard

## 1. Overview & Creative North Star
**The Creative North Star: "The Obsidian Lens"**
This design system moves away from the "flat" aesthetic of traditional SaaS and towards a high-fidelity, editorial-inspired data environment. "The Obsidian Lens" focuses on extreme contrast, depth through tonal layering, and an "Arabic-First" layout logic. Instead of standard grids, we utilize asymmetric density—grouping complex data in high-contrast "zones" while allowing the surrounding dark space to act as a visual breather. It is designed to feel like a high-end physical hardware interface: precise, expensive, and authoritative.

## 2. Colors & Surface Philosophy
The palette is built on a foundation of **#0e0e0e (Background)**. We do not use "gray"; we use "charcoal" and "ink."

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. They clutter the interface and distract from the data. Boundaries must be defined through:
- **Tonal Shifts:** Placing a `surface-container-high` element directly against a `surface-container-low` background.
- **Negative Space:** Using the spacing scale to create distinct visual groups.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested obsidian slabs. 
- **Base Level:** `surface` (#0e0e0e) for the global background.
- **Secondary Level:** `surface-container-low` (#131313) for large layout blocks (e.g., the sidebar or market overview).
- **Primary Data Level:** `surface-container-highest` (#262626) for active cards and focus areas.
- **Glassmorphism Rule:** For floating modals or dropdowns, use `surface-variant` at 60% opacity with a `24px` backdrop-blur to create a "frosted glass" effect, ensuring the vibrant signal colors bleed through softly.

### Signal Colors (Trading Specifics)
- **SOS (Strong Green):** `primary` (#3fff8b) - Intense and vibrant for "Strong Over Sold."
- **OS (Green):** `primary-dim` (#24f07e) - Standard buy signals.
- **Neutral:** `secondary` (#6e9bff) - Used for balanced market states.
- **OB (Orange/Tertiary):** `tertiary` (#ff716c) - A warm, warning-level signal.
- **SOB (Strong Red):** `error` (#ff716c) / `error-container` (#9f0519) - High-alert sell signals.

## 3. Typography: The Arabic-First Engine
The system uses **IBM Plex Sans Arabic** (integrated via the `beVietnamPro` and `inter` scales for consistency) to ensure legibility in high-density data environments.

- **Display & Headlines:** Use `display-md` for portfolio totals. The weight should be heavy to contrast against the dark background.
- **Editorial Hierarchy:** Labels (`label-md`) must be in all-caps (where applicable in Latin) or high-contrast `on-surface-variant` (#adaaaa) for Arabic, ensuring they sit secondary to the raw data.
- **RTL Logic:** Typography must be right-aligned by default. Numeric data (Western Arabic numerals) remains LTR within the RTL flow to ensure rapid price scanning.

## 4. Elevation & Depth
We convey hierarchy through **Tonal Layering** rather than shadows.

- **The Layering Principle:** To "lift" an element, change its background token. An active trading pair card should move from `surface-container-low` to `surface-container-high` on hover.
- **Ambient Shadows:** Shadows are reserved only for floating elements (Tooltips/Modals). Use the `on-surface` color at 6% opacity with a `40px` blur. It should feel like a soft glow, not a drop shadow.
- **The "Ghost Border" Fallback:** If a separation is required for accessibility, use `outline-variant` (#484847) at **15% opacity**. This creates a "hairline" feel that is felt rather than seen.

## 5. Components

### Compact Cards (Split-Zone)
Cards do not have borders. Use a "Split-Zone" background where the top 30% of the card is `surface-container-highest` and the bottom 70% is `surface-container-low`. This naturally separates the header (Asset Name/Symbol) from the content (Chart/Price) without a divider line.

### Buttons
- **Primary (Buy/SOS):** `primary` (#3fff8b) background with `on-primary` (#005d2c) text. Use `lg` (0.5rem) roundedness.
- **Secondary (Sell/SOB):** `error` (#ff716c) background with `on-error` (#490006) text.
- **Tertiary:** Ghost style. No background, `outline` token for text, `surface-variant` on hover.

### Elegant Badges (Signals)
Badges use a "high-contrast label" style. 
- **Format:** `surface-container-highest` background with a 2px leading vertical bar of the signal color (e.g., `primary` for OS). This creates a sophisticated, technical look.

### Input Fields
- **Base:** `surface-container-lowest` (#000000) background.
- **Focus State:** No thick border. Instead, use a subtle 1px "Ghost Border" using the `primary` token at 30% opacity and a subtle outer glow.
- **RTL Alignment:** Icons (Search, Currency) must be flipped and positioned on the left, with text entry starting from the right.

### List Items
Forbid the use of divider lines. Separate items using `8px` of vertical margin. Use a subtle `surface-bright` (#2c2c2c) background shift on hover to indicate interactivity.

## 6. Do's and Don'ts

### Do:
- **Use "Ink" space:** Allow large areas of `#0e0e0e` to exist between major modules.
- **Align to the Right:** Ensure the visual weight of the dashboard starts from the top-right corner.
- **Layer Tones:** Use `surface-container` tokens to create "steps" of importance.

### Don't:
- **Use Solid White Borders:** This breaks the premium "Obsidian" feel.
- **Over-use Gradients:** Only use gradients for primary action buttons or "SOS/SOB" heatmaps. 
- **Crowd the Text:** Arabic script requires more vertical "leading" (line height) than Latin script. Increase `line-height` by 15% for all Arabic body text to maintain readability in dense data.
- **Use Default Shadows:** Never use high-opacity, small-blur shadows. They make the UI look "cheap" and "standard."