---
Title: Storybook + Playwright A/B Screenshot Workflow
Ticket: JINGLE-011
Status: active
Topics:
    - frontend
    - storybook
    - playwright
    - ab-testing
    - design-system
DocType: playbook
Intent: operational
Owners: []
RelatedFiles:
    - Path: jingle-extractor-ui/src/components/JingleExtractor/parts.ts
      Note: Central data-part registry — always check here before adding new selectors
    - Path: jingle-extractor-ui/src/app/theme/tokens.css
      Note: Design tokens — screenshot diffs will be cleanest when only token values differ
    - Path: jingle-extractor-ui/.storybook/main.ts
      Note: Storybook config — verify port (6006) and dev server settings
    - Path: jingle-extractor-ui/src/components/MacWindow/MacWindow.stories.tsx
      Note: Example story with minimal args — good baseline for new story args
    - Path: jingle-extractor-ui/src/components/CandidateList/CandidateList.stories.tsx
      Note: Example story with interactive args (useState) — shows how to script state
ExternalSources: []
Summary: Step-by-step playbook for capturing Storybook component screenshots via Playwright, organizing them for A/B comparison, and running visual diffs to validate design system changes.
LastUpdated: 2026-04-14T22:22:00-04:00
---

# Storybook + Playwright A/B Screenshot Workflow

## Purpose

This playbook describes how to use Playwright (via the `pi` agent harness) to capture Storybook component screenshots at high quality, organize them for A/B comparison, and run visual diffs to validate design system changes — without leaving the terminal or browser.

Use this workflow when you need to:

- Document the current appearance of a widget before refactoring it
- Compare two design system variants (e.g., retro vs. light theme)
- Validate that a new implementation matches the original before and after
- Create annotated screenshots for design handoff documents
- Build a screenshot archive for regression testing

---

## Prerequisites

### 1. Storybook must be running

```bash
cd jingle-extractor-ui
npm run storybook
# Storybook starts on http://localhost:6006
```

Verify it is reachable:

```bash
# Check port 6006 is listening
netstat -tlnp | grep 6006

# Or check via curl
curl -s -o /dev/null -w "%{http_code}" http://localhost:6006
# Expected: 200
```

### 2. Playwright must be available

The `pi` agent harness has Playwright built in. You can also use it from the shell:

```bash
# Check Playwright is installed
npx playwright --version

# Or install if needed
cd jingle-extractor-ui
npx playwright install chromium
```

### 3. Understand the two rendering modes

| Mode | URL pattern | What it renders | Best for |
|---|---|---|---|
| **Canvas** (iframe) | `http://localhost:6006/iframe.html?id=<story-id>` | Only the component, no Storybook chrome | Clean screenshots for docs |
| **Full Storybook** | `http://localhost:6006/?path=/story/<story-id>` | Storybook UI + component + controls | Reviewing all args/interactions |

> **Important:** Storybook automatically appends `&viewMode=story` to canvas URLs when navigating. This is normal and does not affect rendering.

---

## Workflow Phases

### Phase 1 — Discovery: Find story IDs

Before you can screenshot anything, you need the correct Storybook story IDs.

#### Method A: Navigate the Storybook sidebar (fastest)

1. Navigate to `http://localhost:6006` in the Playwright browser
2. Take a snapshot to see the sidebar tree
3. Click through to the story you want

```javascript
// Navigate and get a full snapshot
await page.goto('http://localhost:6006');
// Snapshot reveals the sidebar tree with story IDs
```

#### Method B: Scan the story index programmatically

```bash
# Extract story IDs from Storybook's on-device index
curl -s http://localhost:6006/index.json | \
  jq '.stories[] | "\(.id) => \(.title)"' -r | \
  grep -i "candidate\|macwindow\|timeline"
```

This prints lines like:

```
jingleextractor-candidatedetail--best-candidate => JingleExtractor/CandidateDetail/Best Candidate
jingleextractor-candidatelist--candidate-list => JingleExtractor/CandidateList/Candidate List
jingleextractor-macwindow--window => JingleExtractor/MacWindow/Window
```

The story ID (for the iframe URL) is the left side before `=>`.

> **⚠️ Common mistake:** The story ID is NOT `component--story` (e.g., `--default`). It is the export name lowercased. `export const DefaultConfig` → `--default-config`. Always verify the exact ID before navigating.

#### Method C: Read the story files directly

Every story is defined in `*.stories.tsx` files. Look at the `title` field in the meta object:

```tsx
const meta = {
  component: CandidateList,
  title: 'JingleExtractor/CandidateList',  // ← becomes part of the URL path
  tags: ['autodocs'],
};
```

The URL pattern is:
```
/iframe.html?id=jingleextractor-candidatelist--none-selected
        ^meta-title-lowercase--^export-name-kebab-case
```

Rules for deriving the story ID:
1. `meta.title` → lowercase, strip `JingleExtractor/`, convert to kebab-case → `candidatelist`
2. `export const StoryName` → convert to kebab-case → `none-selected`
3. Combine: `jingleextractor-candidatelist--none-selected`

Examples from the codebase:

| Export name | Story ID |
|---|---|
| `export const BestCandidate` | `jingleextractor-candidatedetail--best-candidate` |
| `export const NoneSelected` | `jingleextractor-candidatelist--none-selected` |
| `export const DefaultConfig` | `jingleextractor-configeditor--default-config` |
| `export const Window` | `jingleextractor-macwindow--window` |

**⚠️ The sidebar label is NOT the story ID.** `CandidateList` (sidebar) ≠ `candidatelist--candidate-list` (story ID). Always cross-check with the stories file or `index.json`.

### Phase 2 — Rendering: Capture the screenshot

#### Step 0: Set viewport first (before navigating)

Set a tight viewport to avoid large empty space below small components. A viewport of **800×500** is a good default for isolated component screenshots:

```javascript
await page.setViewportSize({ width: 800, height: 500 });
```

> **Why this matters:** The default Playwright viewport is 1280×720. Small components (e.g., ScoreBar, MacWindow) will show mostly white space below them. Setting the viewport tight avoids this without cropping the component.

#### Canvas mode (recommended for documentation)

Canvas mode strips all Storybook chrome and renders only the component.

```
http://localhost:6006/iframe.html?id=<story-id>
```

> **Rule of thumb:** Always verify the story ID exists (see Phase 1) before navigating. A bad ID shows a "Couldn't find story" error in the canvas — this wastes a screenshot.

```javascript
// Navigate to canvas
await page.goto('http://localhost:6006/iframe.html?id=jingleextractor-macwindow--window');

// Wait for the component to render (1 second is usually enough)
await page.waitForTimeout(1000);

// Verify the component rendered correctly via snapshot (depth 3-5 avoids Storybook chrome)
const snapshot = await page.snapshot({ depth: 4 });
// Check that the snapshot shows component content, not an error message

// Take the screenshot
await page.screenshot({
  path: 'component-macwindow.png',
  type: 'png',
  scale: 'css',    // ← use 'css' for pixel-accurate rendering
});

// Or capture the full page (includes Storybook sidebar/toolbar)
// await page.screenshot({ fullPage: true, path: 'storybook-overview.png' });
```

#### Full Storybook mode

```
http://localhost:6006/?path=/story/<story-id>
```

```javascript
await page.goto('http://localhost:6006/?path=/story/jingleextractor-jingleextractor--default');

// Wait for the iframe to load (the component renders inside an iframe)
await page.waitForLoadState('networkidle');

await page.screenshot({ fullPage: true, path: 'storybook-jingleextractor-full.png' });
```

#### Console errors to ignore

- `favicon.ico` 404 errors — harmless, ignore
- HMR/WebSocket messages — harmless, ignore

Only investigate errors that mention the component failing to render or a JavaScript exception.

#### Full Storybook mode

```
http://localhost:6006/?path=/story/<story-id>
```

```javascript
await page.goto('http://localhost:6006/?path=/story/jingleextractor-jingleextractor--default');

// Wait for the iframe to load (the component renders inside an iframe)
await page.waitForLoadState('networkidle');

await page.screenshot({ fullPage: true, path: 'storybook-jingleextractor-full.png' });
```

#### Waiting for the component to render

After navigating to the canvas URL, wait for the component to fully render before taking a screenshot:

```javascript
// Recommended: fixed short wait (1 second is sufficient for most components)
await page.waitForTimeout(1000);

// Alternative: wait for a specific element (more robust)
await page.waitForSelector('text=Candidate #1 ★ BEST', { timeout: 10000 });

// Alternative: wait for network to settle (slower but thorough)
await page.waitForLoadState('networkidle');
```

#### Verifying the render before screenshot

**Always take a snapshot before taking the screenshot** to confirm the component actually rendered:

```javascript
await page.goto('http://localhost:6006/iframe.html?id=jingleextractor-configeditor--default-config');
await page.waitForTimeout(1000);

const snapshot = await page.snapshot({ depth: 3 });

// Good: snapshot shows component content
if (snapshot.includes('Run Analysis')) {
  console.log('Component rendered correctly');
  await page.screenshot({ path: 'output.png' });
}

// Bad: snapshot shows error message
if (snapshot.includes("Couldn't find story")) {
  console.error('Story ID not found — fix the ID before retrying');
}
```

### Phase 3 — Organization: Label screenshots for A/B comparison

Name screenshots with a consistent prefix so they sort together in file browsers:

```
screenshots/
├── ab/
│   ├── variant-a/
│   │   ├── component-macwindow.png      # Before change
│   │   ├── component-candidatelist.png
│   │   └── component-candidatedetail.png
│   └── variant-b/
│       ├── component-macwindow.png      # After change
│       ├── component-candidatelist.png
│       └── component-candidatedetail.png
└── archive/
    └── 2026-04-14/
        ├── component-macwindow.png
        └── component-candidatelist.png
```

**Recommended naming convention:**

```
component-<component-id>--<story-id>.png
```

| Example | Meaning |
|---|---|
| `component-candidatedetail--best-candidate.png` | CandidateDetail, Best Candidate story |
| `component-candidatelist--none-selected.png` | CandidateList, None Selected story |
| `component-candidatelist--first-selected.png` | CandidateList, first row selected |
| `ab-A-MacWindow.png` | Variant A (before change) |
| `ab-B-MacWindow.png` | Variant B (after change) |

**Important:** The double-dash `--` in the story ID becomes `--` in the filename too (e.g., `candidatelist--none-selected`). Do not convert to single dash — keep it as-is so it maps directly to the story ID.

### Phase 4 — Visual Diff: Run A/B comparisons

#### Method A: Playwright's built-in `.png` diff

Use `page.screenshot()` with a comparison file. Playwright does not auto-diff, but you can use `img` or `pixelmatch` programmatically:

```javascript
// Install pixelmatch for Node.js diffing
// npm install pixelmatch sharp

const { readFileSync, writeFileSync } = require('fs');

function diffImages(pathA, pathB, outputPath) {
  const { default: pixelmatch } = require('pixelmatch');
  const sharp = require('sharp');

  // Read and resize to same dimensions
  const imgA = sharp(pathA).raw().toBuffer({ resolveWithObject: true });
  const imgB = sharp(pathB).raw().toBuffer({ resolveWithObject: true });

  Promise.all([imgA, imgB]).then(([a, b]) => {
    const { width, height, data: dataA } = a;
    const { data: dataB } = b;

    const diff = Buffer.alloc(width * height * 3);
    const numDiffPixels = pixelmatch(dataA, dataB, diff, width, height, {
      threshold: 0.1,
    });

    const diffPercent = ((numDiffPixels / (width * height)) * 100).toFixed(2);
    console.log(`Diff: ${diffPercent}% of pixels differ`);

    sharp(diff, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(outputPath);

    console.log(`Diff image saved to ${outputPath}`);
  });
}
```

#### Method B: Git-based screenshot diff (simplest)

Commit screenshots before and after a change, then use git to see filenames:

```bash
# Before making changes
mkdir -p screenshots/archive/$(date +%Y-%m-%d)
cp screenshots/*.png screenshots/archive/$(date +%Y-%m-%d)/

git add screenshots/
git commit -m "chore: archive screenshots before design system refactor"

# After making changes, capture new screenshots
# ... run the capture script ...

git diff --name-only screenshots/
# Shows which screenshot files changed
```

#### Method C: Use Playwright's screenshot comparison in tests

Add screenshots to Vitest tests as baselines:

```typescript
// jingle-extractor-ui/src/components/MacWindow/MacWindow.screenshot.test.ts
import { test, expect } from '@playwright/test';

test('MacWindow matches baseline screenshot', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=jingleextractor-macwindow--window');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('MacWindow-baseline.png', {
    maxDiffPixelRatio: 0.05,  // Allow 5% pixel difference (anti-aliased rendering)
  });
});
```

Run the test in "update" mode to regenerate baselines:

```bash
npx playwright test --update-snapshots
```

This is the gold standard for regression testing — if the screenshot changes, the test fails.

---

## Cheat Sheet: Common Tasks

### Task: Screenshot a single component story

```javascript
// 1. Set tight viewport
await page.setViewportSize({ width: 800, height: 500 });

// 2. Navigate to canvas
await page.goto('http://localhost:6006/iframe.html?id=<story-id>');

// 3. Wait for render
await page.waitForTimeout(1000);

// 4. Verify via snapshot (depth 3-5)
const snap = await page.snapshot({ depth: 4 });
// Confirm snap shows component content, not a "Couldn't find story" error

// 5. Screenshot
await page.screenshot({ path: 'output.png', type: 'png' });
```

### Task: Screenshot all stories in a component group

**First: find the exact story IDs by reading the stories file.** Do not guess.

```bash
grep -n "title\|export const" src/components/CandidateList/CandidateList.stories.tsx
# Output:
#   title: 'JingleExtractor/CandidateList',
# export const NoneSelected = makeStory('None Selected', null);
# export const FirstSelected = makeStory('First Selected (Best)', 1);
# → Story IDs: jingleextractor-candidatelist--none-selected
#               jingleextractor-candidatelist--first-selected
```

Then loop with verification:

```javascript
const stories = [
  'jingleextractor-candidatelist--none-selected',
  'jingleextractor-candidatelist--first-selected',
];

await page.setViewportSize({ width: 800, height: 500 });

for (const storyId of stories) {
  await page.goto(`http://localhost:6006/iframe.html?id=${storyId}`);
  await page.waitForTimeout(1000);

  const snap = await page.snapshot({ depth: 3 });
  if (snap.includes("Couldn't find story")) {
    console.error(`Story ID "${storyId}" not found — skipping`);
    continue;
  }

  const filename = storyId.replace('jingleextractor-', '') + '.png';
  await page.screenshot({ path: `screenshots/${filename}`, type: 'png' });
}
```

### Task: Screenshot the same story under different themes

```javascript
const themes = ['retro', 'light', 'dark'];

for (const theme of themes) {
  await page.goto('http://localhost:6006/iframe.html?id=<story-id>');
  // Storybook's toolbar allows theme switching via URL params
  // or via the addon panel — check the story args for theme props
  await page.goto(`http://localhost:6006/iframe.html?id=<story-id>&args=theme:${theme}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `screenshots/component--${theme}.png`, type: 'png' });
}
```

### Task: Screenshot a full Storybook page (sidebar + canvas)

```javascript
await page.goto('http://localhost:6006/?path=/story/<story-id>');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);  // Extra wait for iframe to settle
await page.screenshot({ fullPage: true, path: 'screenshots/storybook-page.png', type: 'png' });
```

### Task: Get an accessibility snapshot (for annotating a screenshot)

```javascript
// Use browser_snapshot to get the tree, then annotate the screenshot
await page.goto('http://localhost:6006/iframe.html?id=<story-id>');
await page.waitForLoadState('networkidle');

const snapshot = await page.accessibility.snapshot();
// Use this to identify which element ref maps to which UI region
// Then use browser_snapshot() from the harness tool to get a readable tree
```

### Task: Capture with a specific viewport (mobile, tablet, desktop)

```javascript
const viewports = {
  mobile:  { width: 390, height: 844 },
  tablet:  { width: 768, height: 1024 },
  desktop: { width: 1400, height: 900 },
};

for (const [name, size] of Object.entries(viewports)) {
  await page.setViewportSize(size);
  await page.goto('http://localhost:6006/iframe.html?id=<story-id>');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `screenshots/component--${name}.png`, type: 'png' });
}
```

---

## Automation Script: Batch Screenshot Capture

Save this as `scripts/capture-storybook-screenshots.js` in the project root:

```javascript
/**
 * scripts/capture-storybook-screenshots.js
 *
 * Usage:
 *   node scripts/capture-storybook-screenshots.js [--out screenshots/]
 *
 * Captures all stories listed in the STORY_IDS array at canvas resolution.
 * Run with Storybook running on http://localhost:6006.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1] || './screenshots'
  : './screenshots';

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const STORY_IDS = [
  // MacWindow — IDs are export names (Empty, WithContent, Scrollable), NOT 'window'
  'jingleextractor-macwindow--empty',
  'jingleextractor-macwindow--with-content',
  'jingleextractor-macwindow--scrollable',
  // MenuBar — ID is 'default', NOT 'menu-bar'
  'jingleextractor-menubar--default',
  // CandidateList
  'jingleextractor-candidatelist--none-selected',
  'jingleextractor-candidatelist--first-selected',
  'jingleextractor-candidatelist--middle-selected',
  'jingleextractor-candidatelist--vocal-overlap',
  // CandidateDetail
  'jingleextractor-candidatedetail--best-candidate',
  'jingleextractor-candidatedetail--vocal-overlap',
  'jingleextractor-candidatedetail--low-score',
  // ScoreBar
  'jingleextractor-scorebar--high-score',
  'jingleextractor-scorebar--zero-score',
  'jingleextractor-scorebar--medium-score',
  // TransportBar
  'jingleextractor-transportbar--stopped-inst',
  'jingleextractor-transportbar--playing-vox',
  // PresetPanel — IDs are 'no-selection', 'default-selected', NOT 'preset-panel'
  'jingleextractor-presetpanel--no-selection',
  'jingleextractor-presetpanel--default-selected',
  // ConfigEditor
  'jingleextractor-configeditor--default-config',
  'jingleextractor-configeditor--long-beds-config',
  // Timeline
  'jingleextractor-timeline--default',
  // JingleExtractor — component title is 'Integration', NOT 'JingleExtractor'
  'jingleextractor-integration--retro-theme',
  'jingleextractor-integration--dark-theme',
  'jingleextractor-integration--light-theme',
];

const VIEWPORT = { width: 800, height: 500 };

async function captureAll() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORT);

  let success = 0;
  let failed = 0;

  for (const storyId of STORY_IDS) {
    const url = `http://localhost:6006/iframe.html?id=${storyId}`;
    const filename = storyId.replace('jingleextractor-', '').replace(/--/g, '-') + '.png';
    const outPath = path.join(OUT_DIR, filename);

    try {
      console.log(`[${STORY_IDS.indexOf(storyId) + 1}/${STORY_IDS.length}] ${storyId}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000); // Let component render

      // Verify the component actually rendered (not a "Couldn't find story" error)
      const snap = await page.evaluate(() => document.body.innerText);
      if (snap.includes("Couldn't find story")) {
        console.error(`  ✗ Story ID "${storyId}" not found — fix the ID and retry`);
        failed++;
        continue;
      }

      await page.screenshot({ path: outPath, type: 'png' });
      console.log(`  ✓ → ${filename}`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${storyId}: ${err.message}`);
      failed++;
    }
  }

  await browser.close();

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

captureAll();
```

Run it:

```bash
node scripts/capture-storybook-screenshots.js --out screenshots/2026-04-14/
```

---

## Debugging Common Issues

### Issue: "Couldn't find story matching id" error in canvas

**Cause:** The story ID used does not exist. This is the most common mistake.

**Fix:**
1. Run `grep -n "export const" <component>.stories.tsx` to see the actual export names
2. Derive the story ID: `jingleextractor-<component>--<export-name-kebab>`
3. Verify with `curl -s http://localhost:6006/index.json | jq '.stories[].id'`

```bash
# Fastest verification
curl -s http://localhost:6006/index.json | jq '.stories[].id' | grep candidate
```

### Issue: Large empty white space below the component

**Cause:** Viewport is taller than the component. Default Playwright viewport is 1280×720.

**Fix:** Set a tight viewport before navigating:

```javascript
await page.setViewportSize({ width: 800, height: 500 });  // ← set FIRST
await page.goto('http://localhost:6006/iframe.html?id=...');
```

### Issue: Screenshot is blank or shows a loading spinner

**Cause:** The component hasn't finished rendering when the screenshot is taken.

**Fix:** Add explicit waits:

```javascript
await page.goto('http://localhost:6006/iframe.html?id=...');
await page.waitForTimeout(1000);  // 1 second is sufficient for most components

// Verify via snapshot before screenshotting
const snap = await page.snapshot({ depth: 3 });
if (snap.includes("Couldn't find story") || snap.length < 50) {
  console.error('Component did not render — check story ID');
}
```

### Issue: Component appears cut off (right or bottom edge clipped)

**Cause:** Viewport is too small for the component's minimum width/height.

**Fix:** Increase viewport, or use `fullPage: true` for tall components:

```javascript
await page.setViewportSize({ width: 1400, height: 900 });
await page.goto('http://localhost:6006/iframe.html?id=...');
await page.screenshot({ fullPage: true, path: 'output.png' });
```

### Issue: Fonts look different in screenshots vs. the browser

**Cause:** `@font-face` fonts may not be loaded at screenshot time.

**Fix:** Wait for fonts to load:

```javascript
await page.goto('http://localhost:6006/iframe.html?id=...');
await page.waitForTimeout(1000);
await page.evaluate(() => document.fonts.ready);  // ← wait for fonts
await page.screenshot({ path: 'output.png' });
```

### Issue: Dark/light theme not applied in canvas mode

**Cause:** Storybook's theme switcher sets a cookie or URL param, not a prop.

**Fix:** Use the URL parameter:

```
http://localhost:6006/iframe.html?id=<story-id>&globals=theme:dark
```

### Issue: Console errors (favicon.ico 404s)

**Cause:** Storybook's dev server doesn't serve a favicon. Harmless.

**Fix:** Ignore `favicon.ico` 404 errors. Only investigate errors that mention component rendering failures or JavaScript exceptions.

---

## Testing a New Story's Screenshots

When you create a new component story, follow this checklist before committing:

1. **Add the story ID** to the `STORY_IDS` array in `capture-storybook-screenshots.js`
2. **Run the capture script** and verify the screenshot renders cleanly
3. **Check the file** is named correctly and placed in the right directory
4. **Archive the baseline**: copy it to `screenshots/archive/YYYY-MM-DD/`
5. **Add a Vitest screenshot test** if this is a stable component:

```typescript
// src/components/MyComponent/MyComponent.screenshot.test.ts
import { test, expect } from '@playwright/test';

test('MyComponent matches baseline', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=jingleextractor-myuicomponent--default');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('MyComponent-baseline.png', {
    maxDiffPixelRatio: 0.05,
  });
});
```

---

## Quick Reference

### URL Patterns

| What you want | URL |
|---|---|
| Storybook home | `http://localhost:6006` |
| Canvas (component only) | `http://localhost:6006/iframe.html?id=<story-id>` |
| Full story page | `http://localhost:6006/?path=/story/<story-id>` |
| Story index (JSON) | `http://localhost:6006/index.json` |
| Dark theme override | `...?id=<story-id>&globals=theme:dark` |
| Canvas URL (auto-appends `&viewMode=story`) | Storybook adds this — normal |
| Docs page | `http://localhost:6006/?path=/docs/<component>--<story>` |

### Story ID Derivation Formula

```
export const BestCandidate → jingleextractor-candidatedetail--best-candidate
export const NoneSelected  → jingleextractor-candidatelist--none-selected
export const DefaultConfig → jingleextractor-configeditor--default-config
export const Window        → jingleextractor-macwindow--window
```

Rule: `meta.title` (lowercase, kebab) + `--` + export name (kebab-case)

### Checklist Before Taking Any Screenshot

1. **Viewport** — Set `800×500` before navigating, not after
2. **Story ID** — Verify it exists via `grep "export const" <file>.stories.tsx` or `curl index.json`
3. **Wait** — `await page.waitForTimeout(1000)` after navigating
4. **Snapshot** — Take a snapshot (depth 3-5) to confirm component rendered, not an error
5. **Filename** — Use `component-<id>--<story>.png` (keep `--` from story ID)
6. **Output dir** — Save to `tmp/screenshots/` (or `screenshots/` for permanent storage)

### Verified Story IDs (2026-04-14 — all tested and confirmed rendering)

| Component | Story IDs |
|---|---|
| MacWindow | `jingleextractor-macwindow--empty`, `--with-content`, `--scrollable` ⚠️ NOT `--window` |
| MenuBar | `jingleextractor-menubar--default` ⚠️ NOT `--menu-bar` |
| CandidateList | `jingleextractor-candidatelist--none-selected`, `--first-selected`, `--middle-selected`, `--vocal-overlap` |
| CandidateDetail | `jingleextractor-candidatedetail--best-candidate`, `--vocal-overlap`, `--low-score` |
| ScoreBar | `jingleextractor-scorebar--high-score`, `--zero-score`, `--medium-score`, `--perfect-score` |
| TransportBar | `jingleextractor-transportbar--stopped-inst`, `--playing-vox`, `--at-end`, `--at-start` |
| PresetPanel | `jingleextractor-presetpanel--no-selection`, `--default-selected`, `--short-stings-selected` ⚠️ NOT `--preset-panel` |
| ConfigEditor | `jingleextractor-configeditor--default-config`, `--long-beds-config` |
| Timeline | `jingleextractor-timeline--default`, `--no-selection`, `--no-candidates`, `--no-vocals` |
| JingleExtractor (Integration) | `jingleextractor-integration--retro-theme`, `--dark-theme`, `--light-theme` ⚠️ component title is `JingleExtractor/Integration`, NOT `JingleExtractor/JingleExtractor` |

### Critical gotchas discovered through trial and error

- **MacWindow**: `export const Window` → ID is `--window`? No! It is `--empty` (the export name is `Empty`). Always `grep "export const"` first.
- **MenuBar**: `export const MenuBar` → ID is `--menu-bar`? No! It is `--default`. The sidebar label `MenuBar` is the component name, not the story name.
- **JingleExtractor**: `title: 'JingleExtractor/Integration'` — the sidebar component name is `Integration`, so IDs start with `jingleextractor-integration--`, not `jingleextractor-jingleextractor--`.
- **All components**: The sidebar label (e.g., `MacWindow`, `PresetPanel`) is NOT the story ID prefix. The prefix comes from `meta.title` in the CSF file. The story ID suffix comes from the `export const StoryName` kebab-cased — which may or may not match the sidebar label.
