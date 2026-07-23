# RepoLens for VS Code

Instant AI code reviews and refactoring in your IDE.

## Features

- **Code Reviews** — Review uncommitted changes or entire branches
- **Refactoring Suggestions** — Inline refactoring with diff preview and one-click apply
- **Coding Assistant** — Chat-based AI assistant with recipes (docstrings, tests, diagrams, etc.)
- **Custom Rules** — Pattern-based search/replace across your workspace
- **Clone Detection** — Find duplicate code across your project
- **Code Metrics** — Hover for quality insights on function definitions
- **GitHub Integration** — Auto-review PRs by installing the [GitHub App](https://github.com/apps/repolens-ai/installations/new)

## Getting Started

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=repolens.repolens)
2. Open any Python or JavaScript/TypeScript file
3. Click the RepoLens logo in the activity bar to login
4. Open `repolens.py` from the RepoLens sidebar to run through the tutorial

## Project Structure

```
src/
├── extension.ts                  Extension entry point (activation, commands, notifications)
├── ask-repolens.ts               "Ask RepoLens" quick-pick command
├── uninstall.ts                  Cleanup on extension uninstall
├── lsp/
│   └── client.ts                 LSP language client creation and configuration
├── providers/
│   ├── chat.ts                   Chat webview provider (sidebar + analytics panel)
│   ├── rule-search.ts            Rule input webview provider
│   └── rule-search-results.ts    Scan results tree data provider
├── utils/
│   ├── editor.ts                 Active editor helpers (getSelectedText)
│   ├── executable.ts             Binary path resolution and platform checks
│   ├── ide-state.ts              IDE state capture for coding assistant
│   └── markdown.ts               Markdown rendering with syntax highlighting
└── webview/
    └── search.js                 Rule search frontend script
```

## Development

### Prerequisites

- Node.js >= 18
- Yarn

### Setup

```bash
yarn install
```

### Build

```bash
yarn compile       # TypeScript compilation (one-shot)
yarn watch         # TypeScript compilation (watch mode)
yarn esbuild       # Bundle with esbuild + sourcemaps
yarn esbuild-watch # Bundle in watch mode
```

### Format & Lint

```bash
yarn format        # Prettier --write
yarn lint:format   # Prettier --check
```

### Run

```bash
yarn vscode        # Launch VS Code extension host
```

### Test

```bash
yarn test-compile  # TypeScript compilation for tests
```

## Packaging

```bash
yarn vscode:prepublish  # Minified esbuild bundle
```

Use `vsce` to produce a `.vsix`:

```bash
npx vsce package
```

## Configuration

Settings available under `repolens.*`:

| Key | Default | Description |
|-----|---------|-------------|
| `repolens.token` | `""` | Auth token from https://repolens.ai/dashboard |
| `repolens.codeLens` | `true` | Show code lens for coding assistant |
| `repolens.suggestFixes` | `true` | Suggest AI fixes for problems |
| `repolens.ruleType.refactorings` | `true` | Show refactoring suggestions |
| `repolens.ruleType.suggestions` | `true` | Show suggestion hints |
| `repolens.ruleType.comments` | `true` | Show inline comments |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `REPOLENSY_EXECUTABLE` | Override path to the RepoLens language server binary |
| `REPOLENSY_CODING_ASSISTANT_ASSETS_PATH` | Override path to coding assistant web assets |

## License

MIT
