# McKinsey Slide Layout Templates

Reference layouts for generating McKinsey-style HTML slides. Each layout defines the CSS/HTML structure for a specific body slide type.

---

## The Three-Zone Structure (All Slides)

Every McKinsey body slide MUST follow this HTML structure:

```html
<div class="slide">
  <!-- Zone 1: Action Title -->
  <div class="slide-header">
    <h2 class="action-title">Complete sentence stating the key takeaway</h2>
  </div>

  <!-- Zone 2: Slide Body -->
  <div class="slide-body">
    <!-- Content varies by layout type -->
  </div>

  <!-- Zone 3: Source & Footer -->
  <div class="slide-footer">
    <span class="source">Source: [data source citation]</span>
    <span class="company">Organization Name</span>
    <span class="page-number">1</span>
  </div>
</div>
```

### Base CSS for Three-Zone Layout

```css
.slide {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  font-family: 'IBM Plex Sans', 'Source Sans Pro', sans-serif;
  padding: 0;
  box-sizing: border-box;
}

.slide-header {
  padding: clamp(16px, 2.5vh, 32px) clamp(24px, 4vw, 56px);
  border-bottom: 3px solid var(--primary-color, #003A5C);
  background: var(--header-bg, #f5f7fa);
}

.action-title {
  font-size: clamp(18px, 2.2vw, 28px);
  font-weight: 700;
  color: var(--title-color, #1a1a2e);
  line-height: 1.3;
  margin: 0;
}

.slide-body {
  flex: 1;
  padding: clamp(16px, 2.5vh, 32px) clamp(24px, 4vw, 56px);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: clamp(8px, 1vh, 16px) clamp(24px, 4vw, 56px);
  border-top: 1px solid #e0e0e0;
  font-size: clamp(8px, 0.9vw, 12px);
  color: #666;
}

.slide-footer .source {
  flex: 1;
}

.slide-footer .company {
  margin-right: clamp(16px, 2vw, 32px);
  font-weight: 600;
}

.slide-footer .page-number {
  min-width: 20px;
  text-align: right;
}
```

---

## Layout A: Full-Slide Graph

One chart dominates the entire slide body. Minimal text.

```
┌─────────────────────────────────────────────┐
│ Revenue grew 23% YoY driven by enterprise  │
│ expansion in Southeast Asia                 │ ← Action Title
├─────────────────────────────────────────────┤
│                                             │
│     ┌───────────────────────────────┐       │
│     │                          ╱    │       │
│     │                       ╱──     │       │
│     │                    ╱──        │       │
│     │                 ╱──           │       │
│     │              ╱──              │       │
│     │           ╱──                 │       │
│     │        ╱──                    │       │
│     │     ╱──                       │       │
│     │  ╱──                          │       │
│     └───────────────────────────────┘       │
│      Q1  Q2  Q3  Q4  Q1  Q2  Q3  Q4       │
│                                             │
├─────────────────────────────────────────────┤
│ Source: Internal data  │ Company │    12    │
└─────────────────────────────────────────────┘
```

### CSS Specifics

```css
/* Layout A: Full Graph */
.slide-body.layout-graph {
  padding: clamp(12px, 2vh, 24px) clamp(24px, 4vw, 56px);
}

.slide-body.layout-graph .chart-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-body.layout-graph .chart-subtitle {
  font-size: clamp(10px, 1.1vw, 14px);
  color: #555;
  margin-bottom: clamp(8px, 1vh, 16px);
}
```

---

## Layout B: Infographic + Text (Side Banner)

One-third of the slide has a contrasting banner with a headline; two-thirds has the infographic or supporting content.

```
┌─────────────────────────────────────────────┐
│ Organizations adopting agile see 40% faster │
│ time-to-market                              │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Heading    │   ┌──┐  ┌──┐  ┌──┐           │
│   or key     │   │  │  │  │  │  │           │
│   statement  │   │  │  │  │  │  │           │
│   in bold    │   │  │  │  │  │  │           │
│   white on   │   └──┘  └──┘  └──┘           │
│   dark bg    │                              │
│              │   Supporting text with       │
│              │   context and insights       │
│              │                              │
├──────────────┴──────────────────────────────┤
│ Source: Survey data │ Company │      7      │
└─────────────────────────────────────────────┘
```

### CSS Specifics

```css
/* Layout B: Infographic + Text */
.slide-body.layout-infographic {
  display: flex;
  padding: 0;
  gap: 0;
}

.side-banner {
  width: 33%;
  background: var(--primary-color, #003A5C);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(24px, 3vw, 48px);
}

.side-banner h3 {
  font-size: clamp(20px, 2.5vw, 36px);
  font-weight: 700;
  line-height: 1.2;
}

.infographic-content {
  width: 67%;
  padding: clamp(16px, 2.5vh, 32px) clamp(24px, 3vw, 48px);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

---

## Layout C: Full-Text Slide

Text-heavy but clean. Used sparingly for recommendations and summaries.

```
┌─────────────────────────────────────────────┐
│ Three strategic priorities emerge from the  │
│ analysis requiring immediate action         │
├─────────────────────────────────────────────┤
│                                             │
│  Priority 1: Digital Transformation         │
│  • Accelerate cloud migration timeline      │
│  • Invest in developer training programs    │
│  • Establish DevOps center of excellence    │
│                                             │
│  Priority 2: Market Expansion               │
│  • Enter Southeast Asian market by Q3       │
│  • Establish partnerships with local firms  │
│  • Adapt product for regional requirements  │
│                                             │
│  Priority 3: Operational Efficiency         │
│  • Automate 60% of manual processes         │
│  • Reduce operational costs by 25%          │
│                                             │
├─────────────────────────────────────────────┤
│ Source: Internal analysis │ Company │   15  │
└─────────────────────────────────────────────┘
```

### CSS Specifics

```css
/* Layout C: Full Text */
.slide-body.layout-text {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: clamp(16px, 2vh, 28px);
}

.text-section h3 {
  font-size: clamp(14px, 1.4vw, 20px);
  font-weight: 700;
  color: var(--primary-color, #003A5C);
  margin-bottom: clamp(4px, 0.5vh, 8px);
}

.text-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.text-section li {
  font-size: clamp(12px, 1.2vw, 16px);
  line-height: 1.5;
  padding-left: 1.2em;
  position: relative;
  color: #333;
}

.text-section li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--accent-color, #0077B6);
}
```

---

## Layout D: Text + Icons (Table Format)

Icons paired with text in a structured grid. Great for comparisons and lists.

```
┌─────────────────────────────────────────────┐
│ The myths and realities of cloud adoption   │
├─────────────────────────────────────────────┤
│                                             │
│    Myths                    Realities       │
│                                             │
│  1 ⊙ Cloud costs more     ⊙ Properly        │
│      than in-house           architected    │
│                              apps cost less │
│                                             │
│  2 ⊙ Must lift-and-shift  ⊙ Range of        │
│      or refactor entirely    options exist  │
│                                             │
│  3 ⊙ Main value is IT     ⊙ Speed and       │
│      cost reduction          agility swamp  │
│                              cost savings   │
│                                             │
├─────────────────────────────────────────────┤
│ Source: Expert interviews │ Company │   2   │
└─────────────────────────────────────────────┘
```

### CSS Specifics

```css
/* Layout D: Icons + Text */
.slide-body.layout-icons {
  flex-direction: column;
  align-items: stretch;
}

.icon-grid {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: clamp(12px, 1.5vh, 24px) clamp(16px, 2vw, 32px);
  align-items: start;
  width: 100%;
}

.icon-grid .row-number {
  font-size: clamp(16px, 1.8vw, 24px);
  font-weight: 700;
  color: var(--primary-color, #003A5C);
}

.icon-grid .icon {
  width: clamp(24px, 2.5vw, 40px);
  height: clamp(24px, 2.5vw, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-grid .description {
  font-size: clamp(11px, 1.1vw, 15px);
  line-height: 1.4;
  color: #333;
}
```

---

## Layout E: Executive Summary (Multi-Column)

Dense but well-formatted text across columns with wide gutters.

```
┌─────────────────────────────────────────────┐
│ Executive summary                           │
├─────────────────────────────────────────────┤
│                                             │
│  Topic A         │ Topic B      │ Topic C   │
│  ⊙               │ ⊙            │ ⊙         │
│                  │              │           │
│  Key finding 1   │ Key finding  │ Key       │
│  with **bold**   │ with data    │ finding   │
│  emphasis on     │ points and   │ with      │
│  critical data   │ evidence     │ insights  │
│                  │              │           │
│  More details    │ Additional   │ Further   │
│  and context     │ context      │ analysis  │
│                  │              │           │
├─────────────────────────────────────────────┤
│ Source: Multiple sources │ Company │    4   │
└─────────────────────────────────────────────┘
```

### CSS Specifics

```css
/* Layout E: Executive Summary */
.slide-body.layout-executive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: clamp(24px, 3vw, 48px);
  align-items: start;
  padding: clamp(20px, 3vh, 40px) clamp(24px, 4vw, 56px);
}

.exec-column {
  border-left: 3px solid var(--primary-color, #003A5C);
  padding-left: clamp(12px, 1.5vw, 24px);
}

.exec-column h3 {
  font-size: clamp(14px, 1.5vw, 20px);
  font-weight: 700;
  color: var(--primary-color, #003A5C);
  margin-bottom: clamp(8px, 1vh, 16px);
  display: flex;
  align-items: center;
  gap: 8px;
}

.exec-column p {
  font-size: clamp(11px, 1vw, 14px);
  line-height: 1.6;
  color: #333;
  margin-bottom: clamp(8px, 1vh, 12px);
}

.exec-column strong {
  color: #1a1a2e;
}
```

---

## Color Theme Presets

### Classic McKinsey (Navy/White)
```css
:root {
  --primary-color: #003A5C;
  --secondary-color: #0077B6;
  --accent-color: #00B4D8;
  --bg-color: #ffffff;
  --header-bg: #f5f7fa;
  --title-color: #1a1a2e;
  --text-color: #333333;
  --muted-color: #666666;
  --border-color: #e0e0e0;
}
```

### Dark Teal Executive
```css
:root {
  --primary-color: #0D4E56;
  --secondary-color: #1A7A8A;
  --accent-color: #2EC4B6;
  --bg-color: #ffffff;
  --header-bg: #f0f5f5;
  --title-color: #0D4E56;
  --text-color: #2d3436;
  --muted-color: #636e72;
  --border-color: #dfe6e9;
}
```

### Corporate Blue
```css
:root {
  --primary-color: #1B2A4A;
  --secondary-color: #2D5AA0;
  --accent-color: #4A90D9;
  --bg-color: #ffffff;
  --header-bg: #f4f6fb;
  --title-color: #1B2A4A;
  --text-color: #2c3e50;
  --muted-color: #7f8c8d;
  --border-color: #e1e8f0;
}
```

### Chart Color Scales
For series data in charts, use these harmonized color scales:

```css
/* Blues scale (most common in McKinsey) */
--chart-1: #003A5C;  /* darkest */
--chart-2: #0077B6;
--chart-3: #00B4D8;
--chart-4: #90E0EF;
--chart-5: #CAF0F8;  /* lightest */

/* Complementary accent */
--chart-highlight: #E63946;  /* for callouts */
--chart-neutral: #8D99AE;   /* for baseline/neutral */
```
