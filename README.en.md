# Tabular

[中文](./README.md) | [English](./README.en.md)

> Drag-select any area of a web page, preserve visual reading order, and copy clean text or structured table-like data in one step.

Tabular is a Chrome extension for fast web content capture. It lets users draw a rectangle over any page, extract visible content locally, and format the result for reuse without sending data to a backend.

![Tabular preview](./docs/assets/readme-hero.png)

## English Summary

- Drag-select content from arbitrary web pages.
- Preserve reading order for copied plain text.
- Convert table-like regions into structured output.
- Keep processing local to the browser with no external service dependency.
- Ship as a Manifest V3 extension built with TypeScript.

## Roadmap

- [x] Drag selection with editable result panel
- [x] Keyboard toggle, panel placement, and one-click copy
- [x] Local-first extraction with no network calls
- [ ] Improve table extraction on dense enterprise dashboards
- [ ] Harden CSV export and table alignment workflows
- [ ] Publish a public demo or store listing with onboarding assets

## Install From Release

1. Download `tabular-extension-v0.1.0.zip` from the GitHub release assets.
2. Unzip the archive to a local folder.
3. Open `chrome://extensions/` in Chrome.
4. Enable `Developer mode`.
5. Click `Load unpacked` and select the extracted folder.

## Features

### Core Features

- Mouse drag selection with a visible selection rectangle
- Smart text extraction and ordering through a `collect -> layout -> format` pipeline
- One-click copy to clipboard
- Persistent keyboard toggle with `Ctrl + Shift + Y` / `Command + Shift + Y`
- Editable, draggable result panel with configurable placement
- Automatic light and dark theme adaptation
- Local-first processing with no network requests
- Manifest V3 extension architecture

### Planned Pro Features

- Smart table detection based on X-axis clustering
- Automatic column alignment for mixed CJK and Latin text
- CSV export following RFC 4180
- Extra protection mechanisms for gated features

## Project Structure

```text
tabular-extension/
├── src/                  # TypeScript source code
│   ├── manifest.json     # Extension manifest
│   │
│   ├── background/       # Single source of business logic and state
│   │   ├── index.ts      # Background entry + message dispatch
│   │   ├── usage.ts      # Usage counters + policy
│   │   ├── pro.ts        # Pro access checks
│   │   ├── settings.ts   # Extension settings
│   │   └── storage.ts    # Unified chrome.storage wrapper
│   │
│   ├── content/          # No business logic, no persistent state
│   │   ├── index.ts      # Content entry
│   │   ├── content.css   # Content styles
│   │   ├── selection.ts  # Drag selection logic
│   │   ├── extractor.ts  # Page extraction core
│   │   └── panel.ts      # Result panel orchestration
│   │
│   ├── popup/            # Isolated shell layer
│   │   ├── popup.html
│   │   └── popup.ts      # Settings mutation + state query
│   │
│   ├── shared/           # Shared protocol boundary
│   │   ├── types.ts      # Cross-layer types and enums
│   │   └── constants.ts  # Shared constants
│   │
│   └── images/           # Extension icons
│       └── icon.html
│
├── build/                # Build output
└── docs/                 # Project documentation
```

For a more detailed explanation of the layout, see [docs/STRUCTURE.md](./docs/STRUCTURE.md).

## Core Architecture

### Overall Design Principles

1. **Separation of responsibilities**: the Background layer owns all business logic and state management, the Content layer only handles page interaction and UI rendering, and the Shared layer only defines types and protocols.
2. **One-way dependencies**: both Background and Content depend on Shared, while Background and Content must not depend on each other directly.
3. **Message-driven communication**: layers communicate through explicit message protocols instead of direct calls.

### Architecture Rules

**Background layer (single source of business logic and state)**
- Owns all business decision making
- Owns all state management (`usage`, `pro`, `storage`)
- Owns all strategy and policy decisions
- Owns message routing and action handling
- **Forbidden**: exposing business logic to the Content layer or allowing Content to access storage directly

**Content layer (no business logic, no persistent state)**
- Handles page sensing, DOM operations, and selection
- Hosts the extractor, which is the core asset
- Sends `REQUEST_ACTION` messages
- Renders UI strictly according to `uiAction`
- **Forbidden**: reading `usage`, `pro`, `policy`, or `strategy`; accessing `chrome.storage.local` for business data; making secondary business decisions from `status`; composing business copy; importing anything from `background`

**Popup layer (isolated shell)**
- Provides a quick configuration entry point
- Updates settings such as `enabled` and `panelPosition`
- Reads state only
- **Forbidden**: embedding business logic or mutating storage directly outside `settings.ts`

**Shared layer (protocol boundary)**
- Defines `REQUEST_ACTION` and `ACTION_RESULT`
- Defines shared enums such as `ActionType`, `UIAction`, and `ActionStatus`
- Hosts cross-layer pure types only
- Keeps type definitions centralized in `types.ts`
- **Forbidden**: business logic, state management, or exposing business concepts to Content

### Message Protocol

**Content -> Background**
```typescript
{
  type: 'REQUEST_ACTION',
  payload: {
    action: ActionType,  // 'text-extract' | 'table-detect' | 'column-align' | 'csv-export'
    data?: unknown
  }
}
```

**Background -> Content**
```typescript
{
  type: 'ACTION_RESULT',
  payload: {
    status: ActionStatus,  // 'ok' | 'limited' | 'blocked'
    uiAction: UIAction,    // 'SHOW_RESULT_PANEL' | 'SHOW_LIMIT_PANEL' | 'SHOW_PRO_PANEL'
    data?: unknown,
    uiData?: {
      text?: string,
      table?: string[][],
      csv?: string,
      message?: string
    }
  }
}
```

### Key Constraints

**UI ownership**
- Content must not decide UI variants based on `status`
- Content may only execute the `uiAction` sent by Background
- `uiAction` is an enum, not a boolean or text flag

**Usage consumption timing**
- Usage `consume` / `record` may only happen after a successful action (`status === 'ok'`)
- No usage should be consumed or recorded when `status` is `limited` or `blocked`
- `checkUsage` is a precondition, `consumeUsage` is a success-side effect

**Error handling**
- Every error path must return a valid `ACTION_RESULT`
- Returning `undefined` or any non-protocol object is forbidden
- Fallback shape: `{ status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData: { message: 'generic error message' } }`

**Content freeze point**
- Once the architecture refactor is complete, the Content layer is considered frozen
- No new business logic, branching, or business copy may be added to Content
- Future feature expansion must go through Background

## Core Components

### Background Layer

**index.ts**
- Background entry point
- Message listener and dispatcher
- Action request handling
- Unified error fallback

**usage.ts**
- Usage management (`check` / `consume` / `record`)
- Free-tier policy definition
- Cross-day reset logic
- Usage statistics

**pro.ts**
- Pro permission checks (`allow` / `verify`)
- Feature permission mapping
- Signature validation
- Usage mode detection

**settings.ts**
- Extension settings management
- Enabled state
- Panel position

**storage.ts**
- Unified wrapper over `chrome.storage.local`
- `get` / `set` / `remove` helpers
- In-memory degradation storage

### Content Layer

**index.ts**
- Content entry point
- Mouse event listeners
- `REQUEST_ACTION` message sending
- UI action execution through `panel`

**selection.ts**
- Selection logic
- Selection rectangle computation
- Selection box rendering

**extractor.ts**
- DOM data collection (`collect`)
- Layout analysis (`layout`)
- Output formatting (`format`)
- Table detection, alignment, and CSV export

**panel.ts**
- Panel creation and destruction
- Success UI (`showResult`)
- Limit UI (`showLimit`)
- Pro upsell UI (`showPro`)
- Dragging, positioning, and related interactions

**content.css**
- Selection styles
- Panel styles
- All Content-layer CSS

### Popup Layer

**popup.html**
- Popup HTML structure

**popup.ts**
- Settings updates
- Read-only state query
- Settings mutation through `settings.ts`

### Shared Layer

**types.ts**
- Message protocol (`RequestActionMessage`, `ActionResultMessage`)
- Action enums (`ActionType`)
- UI action enums (`UIAction`, `ActionStatus`)
- Other cross-layer types such as `SelectionRect` and `PluginSettings`

**constants.ts**
- Cross-layer constants
- Shared configuration values

## Development Commands

```bash
# Install dependencies
npm install

# Run tests (50 test cases)
npm test

# Run lint checks
npm run lint

# Build the project
npm run build

# Generate icons
npm run icon

# Package the extension
npm run extension

# Full release flow (lint + test + build + package)
npm run release

# Create the ZIP package
npm run zip
```

## Technical Specifications

- **Manifest Version**: v3
- **Permissions**: `activeTab`, `clipboardWrite`, `storage`
- **Styling approach**: CSS variables + media queries for automatic theme switching
- **Test stack**: Jest + jsdom + fast-check
- **Code standards**: ESLint + TypeScript strict mode
- **Build tool**: esbuild
- **Browser compatibility**: Chrome 88+
- **Node version**: `>= 18.0.0`

## Installation and Usage

### Development Setup
1. Clone the project and install dependencies: `npm install`
2. Build the project: `npm run build`
3. Open `chrome://extensions/` in Chrome
4. Enable `Developer mode`
5. Click `Load unpacked` and choose `build/extension`

### How to Use
1. Open the popup from the extension icon and enable the extension
2. Or use `Ctrl + Shift + Y` (`Command + Shift + Y` on Mac) to toggle quickly
3. Drag on any webpage to create a selection rectangle
4. Release the mouse to extract text and show the result panel
5. Edit or drag the panel if needed
6. Click `Copy to clipboard` to copy the text and close the panel automatically

### Configuration Options
- **Panel position**
  - Center: place the panel in the page center
  - Follow mouse: place the panel near the mouse release position
  - Direct copy: skip the panel and copy immediately

## Development Rules

### Coding Rules
- All code comments use Chinese
- Variable and function names use English
- TypeScript strict mode must be respected
- Avoid `any` unless absolutely necessary
- All exported functions and types must be documented

### Architecture Constraints
- **Dependencies**: Background and Content both depend on Shared, but may not depend on each other
- **File naming**: test files mirror source names with a `.test.ts` suffix under `tests/`
- **Type definitions**: all cross-layer types live in `shared/types.ts`
- **Constant definitions**: cross-layer constants live in `shared/constants.ts`; business constants remain in their business modules
- **Style management**: all Content-layer styles stay in `content.css`

### Styling and UI Design Conventions
1. **Centralized styling**: all Content-layer styles live in `content.css`, including selection and panel styling
2. **UI decisions belong to Background**: Content must not branch on business state and may only execute Background-provided `uiAction`
3. **Copy comes from Background**: all business-facing messages are generated by Background and passed through `uiData.message`

### Testing Rules
- Coverage target: 50 test cases
- Test types: unit, property, integration, and architecture-gate tests
- Architecture-gate tests are mandatory and may not be skipped
- Property tests require at least 100 iterations
- Background unit coverage target: 90%+
- Content unit coverage target: 85%+
- Shared layer: 100% because it is pure type definition

### Explicitly Rejected Design Directions
1. **Putting business logic in Content**: breaks separation of responsibilities
2. **Letting Content access storage directly**: breaks the single source of truth
3. **Adding business logic or state into Shared**: breaks protocol purity and increases coupling
4. **Letting Content derive UI from `status`**: breaks the rule that Background owns UI decisions
5. **Defining types across multiple files**: spreads the protocol surface and increases maintenance cost
6. **Storing business constants in `shared/constants.ts`**: business constants should stay close to business logic

## Test Notes

The project includes a full test suite that covers all core functionality:

- **architecture-gate tests**: verify architecture constraints (16 tests, 100% pass in the documented baseline)
- **usage module tests**: usage limits and strategy behavior
- **storage module tests**: storage wrapper and in-memory fallback
- **structure tests**: project structure validation
- **dependency tests**: external dependency validation
- **manifest tests**: Manifest V3 compliance checks

Test summary:
- Test suites: 6
- Test cases: 50
- Pass rate: 96% (48/50)

## Documentation

- Chinese documentation and architecture details: [README.md](./README.md)
- Project structure: [docs/STRUCTURE.md](./docs/STRUCTURE.md)
- Release guide: [docs/RELEASE.md](./docs/RELEASE.md)
- Publishing guide: [docs/PUBLISHING_GUIDE.md](./docs/PUBLISHING_GUIDE.md)

## Technical Highlights

1. **Clear architecture layering**: Background centralizes business logic, Content stays render-focused, and Shared defines the protocol.
2. **Message-driven architecture**: communication flows through `REQUEST_ACTION` and `ACTION_RESULT`.
3. **Architecture gate tests**: dedicated tests protect architectural boundaries.
4. **Merged-file structure for a small extension**: keeps complexity manageable while preserving maintainability.
5. **Unified storage wrapper**: wraps `chrome.storage.local` with degradation support.
6. **Performance optimizations**: visibility caching, TreeWalker traversal, and defensive safeguards.
7. **Automatic theme switching**: CSS variables plus media queries avoid extra JavaScript work.
8. **Broad test coverage**: unit, architecture, and integration coverage around core behaviors.
