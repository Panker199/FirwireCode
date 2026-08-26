const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const skills = [
  // ═══════════════════════════════════════
  // 1. CODE MANAGEMENT
  // ═══════════════════════════════════════
  {
    id: "create", name: "Create File", icon: "file-plus", color: "#34d399",
    description: "Create a new file with content",
    commands: ["create", "createfile", "newfile", "new"],
    systemPrompt: `FILE CREATION MODE. Create the requested file with complete, production-ready code. Use proper imports, error handling, and follow best practices. Output the complete file in a code block with the appropriate language tag.`
  },
  {
    id: "read", name: "Read File", icon: "file-text", color: "#60a5fa",
    description: "Read and display file contents",
    commands: ["read", "readfile", "cat", "show", "open"],
    systemPrompt: `FILE READ MODE. Read the specified file and display its contents. If the file doesn't exist, suggest alternatives. Analyze the code structure and provide insights.`
  },
  {
    id: "edit", name: "Edit File", icon: "edit", color: "#34d399",
    description: "Edit, modify, or patch code",
    commands: ["edit", "editfile", "modify", "patch", "update"],
    systemPrompt: `FILE EDIT MODE. Make precise, targeted changes to code. Preserve existing style and conventions. Output changes as diff format or complete modified file.`
  },
  {
    id: "delete", name: "Delete File", icon: "trash", color: "#f87171",
    description: "Delete a file or directory",
    commands: ["delete", "deletefile", "remove", "rm", "unlink"],
    systemPrompt: `FILE DELETION MODE. Confirm the deletion target and execute. Always verify the file exists first.`
  },
  {
    id: "rename", name: "Rename File", icon: "edit-2", color: "#fbbf24",
    description: "Rename or move a file",
    commands: ["rename", "renamefile", "move", "mv"],
    systemPrompt: `FILE RENAME MODE. Rename or move the file to the new location. Update any imports/references if needed.`
  },
  {
    id: "copy", name: "Copy File", icon: "copy", color: "#a78bfa",
    description: "Copy a file to a new location",
    commands: ["copy", "copyfile", "cp", "duplicate"],
    systemPrompt: `FILE COPY MODE. Copy the file to the destination. Ensure the destination directory exists.`
  },
  {
    id: "search", name: "Search Code", icon: "search", color: "#60a5fa",
    description: "Search for patterns in code",
    commands: ["search", "searchcode", "find", "grep", "rg"],
    systemPrompt: `CODE SEARCH MODE. Search across the codebase for the pattern. Show file paths, line numbers, and matching content. Use grep-style output: file:line - content`
  },
  {
    id: "replace", name: "Replace Code", icon: "refresh", color: "#fb923c",
    description: "Find and replace across files",
    commands: ["replace", "replacecode", "s///", "substitute"],
    systemPrompt: `CODE REPLACE MODE. Find all occurrences and replace them. Show before/after for each change. Use diff format.`
  },
  {
    id: "format", name: "Format Code", icon: "align-left", color: "#a78bfa",
    description: "Format code to standard style",
    commands: ["format", "fmt", "prettier", "beautify", "lint-fix"],
    systemPrompt: `CODE FORMAT MODE. Format the code according to language standards. Fix indentation, spacing, line breaks. Apply linter rules.`
  },
  {
    id: "optimize", name: "Optimize Code", icon: "zap", color: "#fbbf24",
    description: "Optimize code for performance",
    commands: ["optimize", "perf", "speed", "fast"],
    systemPrompt: `CODE OPTIMIZATION MODE. Analyze and optimize code for better performance. Identify bottlenecks, reduce complexity, improve algorithms. Show before/after with benchmarks.`
  },

  // ═══════════════════════════════════════
  // 2. AI ASSISTANT
  // ═══════════════════════════════════════
  {
    id: "fix", name: "Fix Code", icon: "tool", color: "#f87171",
    description: "Debug and fix code issues",
    commands: ["fix", "fixcode", "debug", "bugfix", "patch"],
    systemPrompt: `DEBUGGING MODE. Analyze the code/error carefully. 1. Identify the root cause (not symptoms). 2. Explain why the bug occurs. 3. Provide the fix with explanation. 4. Verify the fix handles edge cases. 5. Check for related issues.`
  },
  {
    id: "tests", name: "Generate Tests", icon: "check-circle", color: "#34d399",
    description: "Generate comprehensive test suites",
    commands: ["tests", "test", "unittest", "pytest", "jest"],
    systemPrompt: `TEST GENERATION MODE. Generate comprehensive tests covering: happy path, edge cases, error cases, boundary conditions. Use the project's test framework. Include setup/teardown. Aim for high coverage.`
  },
  {
    id: "doc", name: "Documentation", icon: "book", color: "#60a5fa",
    description: "Generate documentation and API docs",
    commands: ["doc", "docs", "documentation", "api-doc", "jsdoc"],
    systemPrompt: `DOCUMENTATION MODE. Generate comprehensive documentation including: function descriptions, parameters, return values, examples, usage patterns. Follow JSDoc/docstring standards.`
  },
  {
    id: "explain", name: "Explain Code", icon: "info", color: "#60a5fa",
    description: "Explain how code works",
    commands: ["explain", "how", "what", "walkthrough"],
    systemPrompt: `EXPLANATION MODE. Explain the code clearly and thoroughly. Break down complex logic. Use analogies where helpful. Cover: what it does, how it works, why it's structured this way, key patterns used.`
  },
  {
    id: "review", name: "Code Review", icon: "eye", color: "#a78bfa",
    description: "Full code review with suggestions",
    commands: ["review", "codereview", "cr", "audit"],
    systemPrompt: `CODE REVIEW MODE. Perform a thorough code review. Check for: correctness, security, performance, maintainability, error handling, naming conventions, patterns, anti-patterns. Rate severity: CRITICAL/HIGH/MEDIUM/LOW. Include file:line references.`
  },
  {
    id: "refactor", name: "Refactor Code", icon: "layers", color: "#fb923c",
    description: "Improve code structure and quality",
    commands: ["refactor", "clean", "improve", "restructure"],
    systemPrompt: `REFACTORING MODE. Improve code quality while preserving behavior. Apply: SOLID principles, DRY, KISS, YAGNI. Extract functions, simplify conditionals, reduce nesting, improve naming. Show before/after.`
  },
  {
    id: "translate", name: "Translate Code", icon: "globe", color: "#34d399",
    description: "Translate code between languages",
    commands: ["translate", "convert", "port", "rewrite"],
    systemPrompt: `CODE TRANSLATION MODE. Translate code to the target language. Preserve functionality. Use idiomatic patterns of the target language. Include equivalent libraries/frameworks.`
  },
  {
    id: "plan", name: "Implementation Plan", icon: "map", color: "#fb923c",
    description: "Create implementation plan",
    commands: ["plan", "implementation", "roadmap", "strategy"],
    systemPrompt: `PLANNING MODE. Create a detailed implementation plan. 1. Define objectives and constraints. 2. Identify requirements. 3. Design architecture. 4. Break into steps with priorities. 5. Estimate complexity. 6. Identify risks. Output as structured markdown with checkboxes.`
  },
  {
    id: "arch", name: "Architecture", icon: "grid", color: "#a78bfa",
    description: "System architecture design",
    commands: ["arch", "architecture", "design", "systemdesign"],
    systemPrompt: `ARCHITECTURE MODE. Design system architecture. Cover: components, data flow, APIs, database design, deployment, scalability. Use diagrams (ASCII/Mermaid). Consider trade-offs.`
  },
  {
    id: "compare", name: "Compare", icon: "git-branch", color: "#fbbf24",
    description: "Compare two approaches or solutions",
    commands: ["compare", "vs", "versus", "diff"],
    systemPrompt: `COMPARISON MODE. Compare the two approaches objectively. Cover: performance, maintainability, complexity, scalability, pros/cons. Give a clear recommendation.`
  },

  // ═══════════════════════════════════════
  // 3. PROJECT MANAGEMENT
  // ═══════════════════════════════════════
  {
    id: "project", name: "Project", icon: "folder", color: "#fb923c",
    description: "Project creation and management",
    commands: ["project", "project:create", "project:open", "project:save", "project:close", "scaffold", "init"],
    systemPrompt: `PROJECT MODE. Manage project lifecycle. Create, open, save, or configure projects. Generate proper project structure with: package.json/requirements.txt/go.mod, .gitignore, README, tests, CI/CD config.`
  },
  {
    id: "dependencies", name: "Dependencies", icon: "package", color: "#34d399",
    description: "Manage project dependencies",
    commands: ["dependencies", "deps", "packages", "modules"],
    systemPrompt: `DEPENDENCY MODE. Manage project dependencies. Install, update, remove packages. Check for vulnerabilities. Resolve version conflicts. Generate lock files.`
  },

  // ═══════════════════════════════════════
  // 4. BUILD & RUN
  // ═══════════════════════════════════════
  {
    id: "build", name: "Build", icon: "package", color: "#34d399",
    description: "Build the project",
    commands: ["build", "compile", "make", "webpack", "vite"],
    systemPrompt: `BUILD MODE. Build the project. Execute build commands, fix build errors, optimize output. Handle: npm/webpack/vite/maven/gradle/cargo/go build.`
  },
  {
    id: "run", name: "Run", icon: "play", color: "#34d399",
    description: "Run the project or script",
    commands: ["run", "start", "exec", "launch", "serve"],
    systemPrompt: `RUN MODE. Execute the project or specified script. Handle: npm start, python app.py, go run, cargo run, java -jar. Show output and handle errors.`
  },

  // ═══════════════════════════════════════
  // 5. TESTING
  // ═══════════════════════════════════════
  {
    id: "testrun", name: "Run Tests", icon: "check-square", color: "#34d399",
    description: "Run test suites",
    commands: ["testrun", "test:run", "test:all", "pytest", "jest:run"],
    systemPrompt: `TEST RUNNER MODE. Execute tests and report results. Handle: npm test, pytest, go test, cargo test. Analyze failures and suggest fixes.`
  },
  {
    id: "testreport", name: "Test Report", icon: "bar-chart", color: "#60a5fa",
    description: "Generate test report",
    commands: ["testreport", "test:report", "coverage"],
    systemPrompt: `TEST REPORT MODE. Generate comprehensive test report. Include: coverage, pass/fail counts, performance metrics, uncovered areas.`
  },

  // ═══════════════════════════════════════
  // 6. GIT & VERSION CONTROL
  // ═══════════════════════════════════════
  {
    id: "git", name: "Git", icon: "git-branch", color: "#fb923c",
    description: "Git version control operations",
    commands: ["git", "git:init", "git:status", "git:add", "git:commit", "git:push", "git:pull", "git:log", "git:diff", "git:branch", "git:checkout", "git:stash", "git:merge", "git:rebase"],
    systemPrompt: `GIT MODE. Execute git operations. Handle: init, status, add, commit, push, pull, fetch, merge, rebase, branch, checkout, stash, diff, log, revert, reset. Explain each operation.`
  },

  // ═══════════════════════════════════════
  // 7. TERMINAL
  // ═══════════════════════════════════════
  {
    id: "terminal", name: "Terminal", icon: "terminal", color: "#a78bfa",
    description: "Execute terminal commands",
    commands: ["terminal", "exec", "shell", "cmd", "bash", "powershell"],
    systemPrompt: `TERMINAL MODE. Execute shell commands safely. Show the command being run and its output. Handle errors gracefully. Suggest fixes for failed commands.`
  },
  {
    id: "install", name: "Install Package", icon: "download", color: "#34d399",
    description: "Install packages/dependencies",
    commands: ["install", "npm install", "pip install", "go get", "cargo add"],
    systemPrompt: `INSTALL MODE. Install the specified package using the appropriate package manager. Verify installation succeeded.`
  },

  // ═══════════════════════════════════════
  // 8. CODE ANALYSIS
  // ═══════════════════════════════════════
  {
    id: "analyze", name: "Analyze", icon: "activity", color: "#fbbf24",
    description: "Deep code analysis",
    commands: ["analyze", "analysis", "inspect", "diagnose"],
    systemPrompt: `ANALYSIS MODE. Perform deep code analysis. Check: complexity, maintainability, test coverage, dependencies, patterns, anti-patterns. Rate severity: CRITICAL/HIGH/MEDIUM/LOW.`
  },
  {
    id: "errors", name: "Find Errors", icon: "alert-circle", color: "#f87171",
    description: "Find all errors in code",
    commands: ["errors", "finderrors", "lint", "check"],
    systemPrompt: `ERROR FINDING MODE. Scan code for errors: syntax, runtime, type, logic, security. Show file:line for each issue with severity and fix suggestion.`
  },
  {
    id: "security", name: "Security Scan", icon: "shield", color: "#f87171",
    description: "Security vulnerability scan",
    commands: ["security", "sec", "vuln", "vulnerability", "audit:security"],
    systemPrompt: `SECURITY SCAN MODE. Perform security audit. Check for: SQL injection, XSS, CSRF, hardcoded secrets, insecure dependencies, unsafe operations, permission issues. Rate severity.`
  },
  {
    id: "performance", name: "Performance", icon: "trending-up", color: "#fbbf24",
    description: "Performance analysis and optimization",
    commands: ["performance", "perf", "benchmark", "profile"],
    systemPrompt: `PERFORMANCE MODE. Analyze performance. Identify: bottlenecks, memory leaks, O(n²) algorithms, unnecessary re-renders, N+1 queries, blocking operations. Suggest optimizations with expected impact.`
  },
  {
    id: "quality", name: "Code Quality", icon: "star", color: "#a78bfa",
    description: "Code quality assessment",
    commands: ["quality", "quality:check", "standards", "bestpractices"],
    systemPrompt: `QUALITY MODE. Assess code quality. Check: naming, structure, complexity, duplication, documentation, test coverage, error handling. Score out of 100 with breakdown.`
  },

  // ═══════════════════════════════════════
  // 9. DOCUMENTATION
  // ═══════════════════════════════════════
  {
    id: "readme", name: "Generate README", icon: "file-text", color: "#60a5fa",
    description: "Generate project README",
    commands: ["readme", "readme:generate"],
    systemPrompt: `README MODE. Generate comprehensive README.md with: project description, features, installation, usage, API reference, contributing, license. Use proper markdown formatting.`
  },
  {
    id: "changelog", name: "Changelog", icon: "list", color: "#fb923c",
    description: "Generate changelog",
    commands: ["changelog", "changelog:generate", "changes"],
    systemPrompt: `CHANGELOG MODE. Generate changelog from git history. Follow Keep a Changelog format. Categorize: Added, Changed, Deprecated, Removed, Fixed, Security.`
  },

  // ═══════════════════════════════════════
  // 10. SPECIAL MODES
  // ═══════════════════════════════════════
  {
    id: "think", name: "Deep Thinking", icon: "brain", color: "#a78bfa",
    description: "Step-by-step chain of thought",
    commands: ["think", "reason", "analyze", "evaluate", "compare", "pros cons"],
    systemPrompt: `THINKING MODE. Reason step-by-step explicitly. Structure: 1. UNDERSTAND 2. BREAK DOWN 3. REASON 4. VERIFY 5. CONCLUDE. Show your thinking process clearly.`
  },
  {
    id: "write", name: "Write Code", icon: "feather", color: "#f472b6",
    description: "Generate complete code",
    commands: ["write", "generate", "create", "build", "implement"],
    systemPrompt: `WRITING MODE. Generate complete, production-ready code. Include: imports, types, error handling, edge cases. Follow language idioms and best practices.`
  },
  {
    id: "agent", name: "AI Agent", icon: "cpu", color: "#f472b6",
    description: "Full autonomous AI agent mode",
    commands: ["agent", "autonomous", "fulltask", "automate"],
    systemPrompt: `AGENT MODE. You are operating as a fully autonomous AI agent. Follow the workflow: 1. Understand request 2. Analyze project 3. Create plan 4. Search files 5. Read code 6. Generate changes 7. Apply changes 8. Build 9. Test 10. Fix 11. Review 12. Respond. Execute each step automatically.`
  },
  {
    id: "deepanalyze", name: "Deep Analysis", icon: "layers", color: "#fbbf24",
    description: "Deep architecture and code analysis",
    commands: ["deepanalyze", "deep", "architecture:analyze", "system:analyze"],
    systemPrompt: `DEEP ANALYSIS MODE. Perform comprehensive analysis of the entire codebase. Cover: architecture, patterns, anti-patterns, dependencies, security, performance, maintainability. Generate detailed report.`
  }
];

function getSkills() {
  return skills.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    description: s.description,
    commands: s.commands
  }));
}

function getSkill(id) {
  return skills.find(s => s.id === id) || null;
}

function getSkillByCommand(text) {
  const lower = text.toLowerCase().trim();
  for (const skill of skills) {
    for (const cmd of skill.commands) {
      if (lower.startsWith(cmd + " ") || lower === cmd) {
        return { skill, input: lower.slice(cmd.length).trim() };
      }
    }
  }
  return null;
}

function getSkillPrompt() {
  return skills.map(s =>
    `[/${s.id}] - ${s.description}. Commands: ${s.commands.join(", ")}`
  ).join("\n");
}

module.exports = { getSkills, getSkill, getSkillByCommand, getSkillPrompt };
