# Firewire - AI-Powered Coding Assistant

Firewire is a powerful AI coding assistant that works both as an Electron desktop app and a web app. Built with Electron + React, it supports multiple AI providers including Groq, Google Gemini, and local Ollama models.

## Links
- **Live App:** https://firewire-code-git-main-panker199s-projects.vercel.app/
- **GitHub:** https://github.com/Panker199/FirwireCode

---

## Features

### AI Providers
- **Groq** - Qwen 3.6 27B, GPT OSS 120B, Allam 2 7B
- **Google Gemini** - Gemini 3.6 Flash, 3.7 Flash, 3.5 Flash, 3.5 Flash Lite
- **Ollama** - Llama 3.2, CodeLlama, Mistral (local)
- **Auto-detect** - Automatically finds the fastest available model

### 30 Built-in Skills

| Category | Skills |
|----------|--------|
| **Code Management** | Create, Read, Edit, Delete, Rename, Copy, Search, Replace, Format, Optimize |
| **AI Assistant** | Fix, Tests, Docs, Explain, Review, Refactor, Translate, Plan, Architecture, Compare |
| **Project** | Project scaffold, Dependencies management |
| **Build & Run** | Build, Run |
| **Testing** | Run Tests, Test Report |
| **Git** | Full git workflow (init, status, add, commit, push, pull, log, diff, branch, checkout, stash, merge, rebase) |
| **Terminal** | Execute shell commands, Install packages |
| **Analysis** | Analyze, Find Errors, Security Scan, Performance, Code Quality |
| **Documentation** | Generate README, Changelog |
| **Special** | Deep Thinking, Write Code, AI Agent, Deep Analysis |

### Code Editor
- Monaco Editor with syntax highlighting for 25+ languages
- File explorer with tabs
- Integrated terminal
- AI Copilot code completion
- Run code directly in the editor

### Chat Features
- Multi-thread chat with persistent history
- Auto-resize input
- Model selector with auto-detect
- Export chat as Markdown
- Code block detection with syntax highlighting
- Inline code execution (JS, Python, Ruby, Shell, PHP, Lua, TypeScript)

### System Integration (Desktop)
- Full file system access (read, write, delete, search, mkdir)
- Git integration
- Terminal access
- System info detection (CPU, RAM, GPU, Disk)
- Package manager support (npm, yarn, pip, cargo, go)

### Themes
- Dark (default)
- Light
- System (auto-detect OS preference)

### Security
- AES-256-CBC encrypted API key storage
- Context isolation in Electron
- DevTools disabled in production

---

## Requirements

- Node.js 18+ (LTS recommended)
- Windows 10/11 for desktop builds

## Install

```sh
npm install
```

## Run (Desktop)

```sh
npm run start
```

## Run (Browser/Web)

```sh
npm run open
```

This starts a local dev server at http://localhost:3000

## Build Renderer Bundle

```sh
npm run build:renderer
```

## Build Windows EXE

```sh
npm run dist
```

Outputs will be in `dist/`.

---

## GPU Disable (Optional)

PowerShell:
```powershell
$env:WORMGPT_DISABLE_GPU='1'; npm run start
```

Or pass a flag:
```sh
npm run start -- --disable-wormgpt-gpu
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New chat |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+,` | Open settings |
| `Ctrl+E` | Toggle code editor |
| `Ctrl+S` | Save file |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+L` | Clear terminal |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Close settings/sidebar |

---

## Chat Commands

Type these in the chat input:

| Command | Description |
|---------|-------------|
| `/think` | Deep reasoning mode |
| `/fix` | Debug and fix code |
| `/tests` | Generate test suites |
| `/doc` | Generate documentation |
| `/refactor` | Improve code structure |
| `/explain` | Code walkthrough |
| `/write` | Generate code |
| `/plan` | Implementation plan |
| `/review` | Code review |
| `/security` | Security audit |
| `/perf` | Performance analysis |
| `/analyze` | Code analysis |
| `/git` | Git operations |
| `/terminal` | Execute shell commands |
| `/agent` | Autonomous AI agent |

---

## API Key Storage

Set your API key in Settings. It is stored encrypted at:
- **Windows:** `%APPDATA%\wormgpt\wormgpt-data.json`
- **Browser:** localStorage

Use the Revoke button to remove it.

---

## Environment Variables

```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
DEFAULT_PROVIDER=groq
DEFAULT_GROQ_MODEL=qwen/qwen3.6-27b
DEFAULT_GEMINI_MODEL=gemini-3.6-flash
```

---

## Tech Stack

- **Frontend:** React 18, Monaco Editor
- **Desktop:** Electron 40
- **Bundler:** esbuild
- **Packaging:** electron-builder
- **AI:** Groq API, Gemini API, Ollama

---

## Author

**Lahiru Sanjika** - Cyber Security Researcher

---

## License

MIT
