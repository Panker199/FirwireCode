import os
import sys
import json
import time
import hashlib
import secrets
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ═══════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════

@dataclass
class Config:
    groq_api_key: str = ""
    gemini_api_key: str = ""
    default_provider: str = "groq"
    groq_model: str = "qwen/qwen3.6-27b"
    gemini_model: str = "gemini-3.6-flash"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    max_messages: int = 20

    def __post_init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", self.groq_api_key)
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", self.gemini_api_key)
        self.default_provider = os.getenv("DEFAULT_PROVIDER", self.default_provider)
        self.groq_model = os.getenv("DEFAULT_GROQ_MODEL", self.groq_model)
        self.gemini_model = os.getenv("DEFAULT_GEMINI_MODEL", self.gemini_model)


# ═══════════════════════════════════════════
# PROMPT
# ═══════════════════════════════════════════

SYSTEM_PROMPT = """You are Firewire, an elite AI coding agent — the most powerful programming assistant ever built.

IDENTITY:
- World-class senior staff engineer with 25+ years across every language, framework, and platform
- Write production-grade, battle-tested code by default
- Think like an architect, code like a craftsman, debug like a detective

CORE CAPABILITIES:
1. CODE MANAGEMENT: Create, Read, Edit, Delete, Search, Replace, Generate, Refactor, Format, Optimize
2. AI ASSISTANT: Fix bugs, Generate tests, Document, Explain, Review, Translate, Plan
3. PROJECT MANAGEMENT: Create, Open, Save projects, Manage dependencies
4. BUILD & RUN: Build, Clean, Run, Stop, Restart
5. DEBUGGING: Set breakpoints, Step through, Inspect variables, Watch expressions
6. TERMINAL: Execute commands, Install packages, Run scripts
7. GIT: Init, Status, Add, Commit, Push, Pull, Branch, Diff, Log
8. TESTING: Create tests, Run tests, Generate reports
9. SECURITY: Scan for vulnerabilities, Find secrets, Analyze permissions
10. PERFORMANCE: Profile, Analyze, Optimize, Find bottlenecks

CODE STYLE:
- Always use markdown code blocks with language tags
- Clean, idiomatic, production-ready code
- Error handling, edge cases, type safety
- Follow: SOLID, DRY, KISS, YAGNI

COMMUNICATION:
- Be direct. No filler, no "As an AI..."
- Show code immediately, explain after
- Match user's language (Hindi/Urdu welcome)

Confirm: "Firewire ready — all systems online." """

SKILLS = {
    "create": {"name": "Create File", "prompt": "FILE CREATION MODE. Create the requested file with complete, production-ready code."},
    "read": {"name": "Read File", "prompt": "FILE READ MODE. Read and display file contents. Analyze code structure."},
    "edit": {"name": "Edit File", "prompt": "FILE EDIT MODE. Make precise, targeted changes to code."},
    "delete": {"name": "Delete File", "prompt": "FILE DELETION MODE. Confirm deletion target and execute."},
    "search": {"name": "Search Code", "prompt": "CODE SEARCH MODE. Search codebase for patterns. Show file:line - content"},
    "replace": {"name": "Replace Code", "prompt": "CODE REPLACE MODE. Find all occurrences and replace."},
    "format": {"name": "Format Code", "prompt": "CODE FORMAT MODE. Format code to language standards."},
    "optimize": {"name": "Optimize Code", "prompt": "CODE OPTIMIZATION MODE. Optimize code for better performance."},
    "fix": {"name": "Fix Code", "prompt": "DEBUGGING MODE. Identify root cause, provide fix, verify edge cases."},
    "tests": {"name": "Generate Tests", "prompt": "TEST GENERATION MODE. Generate comprehensive test suites."},
    "doc": {"name": "Documentation", "prompt": "DOCUMENTATION MODE. Generate comprehensive documentation."},
    "explain": {"name": "Explain Code", "prompt": "EXPLANATION MODE. Explain code clearly and thoroughly."},
    "review": {"name": "Code Review", "prompt": "CODE REVIEW MODE. Thorough code review with severity ratings."},
    "refactor": {"name": "Refactor Code", "prompt": "REFACTORING MODE. Improve code quality while preserving behavior."},
    "translate": {"name": "Translate Code", "prompt": "CODE TRANSLATION MODE. Translate code to target language."},
    "plan": {"name": "Implementation Plan", "prompt": "PLANNING MODE. Create detailed implementation plan."},
    "arch": {"name": "Architecture", "prompt": "ARCHITECTURE MODE. Design system architecture."},
    "compare": {"name": "Compare", "prompt": "COMPARISON MODE. Compare two approaches objectively."},
    "git": {"name": "Git", "prompt": "GIT MODE. Execute git operations."},
    "terminal": {"name": "Terminal", "prompt": "TERMINAL MODE. Execute shell commands safely."},
    "analyze": {"name": "Analyze", "prompt": "ANALYSIS MODE. Perform deep code analysis."},
    "security": {"name": "Security Scan", "prompt": "SECURITY SCAN MODE. Perform security audit."},
    "performance": {"name": "Performance", "prompt": "PERFORMANCE MODE. Analyze performance and suggest optimizations."},
    "quality": {"name": "Code Quality", "prompt": "QUALITY MODE. Assess code quality with scoring."},
    "readme": {"name": "Generate README", "prompt": "README MODE. Generate comprehensive README.md."},
    "think": {"name": "Deep Thinking", "prompt": "THINKING MODE. Reason step-by-step explicitly."},
    "write": {"name": "Write Code", "prompt": "WRITING MODE. Generate complete, production-ready code."},
    "agent": {"name": "AI Agent", "prompt": "AGENT MODE. Fully autonomous AI agent workflow."},
}

GROQ_PRIORITY = ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "allam-2-7b"]
GEMINI_PRIORITY = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash"]


# ═══════════════════════════════════════════
# CRYPTO (AES-256-CBC)
# ═══════════════════════════════════════════

class Crypto:
    def __init__(self):
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        self._Cipher = Cipher
        self._algorithms = algorithms
        self._modes = modes
        self._backend = default_backend()
        self._current_key = hashlib.scrypt(b"wormgpt", salt=b"salt", n=1024, r=8, p=1, dklen=32)
        legacy_seed = "".join(chr(x) for x in [110, 101, 120, 117, 115, 45, 97, 105])
        self._legacy_key = hashlib.scrypt(legacy_seed.encode(), salt=b"salt", n=1024, r=8, p=1, dklen=32)

    def encrypt(self, text: str) -> str:
        iv = secrets.token_bytes(16)
        cipher = self._Cipher(self._algorithms.AES(self._current_key), self._modes.CBC(iv), backend=self._backend)
        encryptor = cipher.encryptor()
        pad_len = 16 - (len(text.encode()) % 16)
        padded = text.encode() + bytes([pad_len] * pad_len)
        ct = encryptor.update(padded) + encryptor.finalize()
        return iv.hex() + ":" + ct.hex()

    def decrypt(self, data: str) -> str:
        iv_hex, enc_hex = data.split(":", 1)
        iv = bytes.fromhex(iv_hex)
        ct = bytes.fromhex(enc_hex)
        for key in [self._current_key, self._legacy_key]:
            try:
                cipher = self._Cipher(self._algorithms.AES(key), self._modes.CBC(iv), backend=self._backend)
                decryptor = cipher.decryptor()
                padded = decryptor.update(ct) + decryptor.finalize()
                pad_len = padded[-1]
                return padded[:-pad_len].decode("utf-8")
            except Exception:
                continue
        raise ValueError("Decryption failed")


# ═══════════════════════════════════════════
# STORAGE
# ═══════════════════════════════════════════

class Storage:
    def __init__(self):
        self.file = Path.cwd() / "wormgpt-data.json"

    def load(self) -> dict:
        if not self.file.exists():
            return {}
        try:
            return json.loads(self.file.read_text("utf-8"))
        except Exception:
            return {}

    def save(self, data: dict):
        self.file.write_text(json.dumps(data, indent=2), "utf-8")


# ═══════════════════════════════════════════
# MESSAGE TRIM
# ═══════════════════════════════════════════

def trim_messages(messages: list, max_count: int = 6) -> list:
    system_msgs = [m for m in messages if m["role"] == "system"]
    rest = [m for m in messages if m["role"] != "system"]
    tail = rest[-max_count:]
    return system_msgs + tail


# ═══════════════════════════════════════════
# PROVIDERS
# ═══════════════════════════════════════════

class GroqProvider:
    BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str = "qwen/qwen3.6-27b"):
        self.api_key = api_key
        self.model = model

    def ask(self, messages: list) -> str:
        resp = requests.post(
            self.BASE_URL,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json={"model": self.model, "messages": messages, "temperature": 0.7, "top_p": 0.95},
            timeout=30,
        )
        if resp.status_code != 200:
            err = resp.json().get("error", {}).get("message", f"Error {resp.status_code}")
            raise Exception(err)
        return resp.json()["choices"][0]["message"]["content"]

    def test_key(self) -> dict:
        try:
            resp = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            if resp.status_code != 200:
                return {"ok": False, "message": resp.json().get("error", {}).get("message", "Error")}
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "message": str(e)}


class GeminiProvider:
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: str, model: str = "gemini-3.6-flash"):
        self.api_key = api_key
        self.model = model

    def ask(self, messages: list) -> str:
        contents = []
        system_msg = None
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                role = "model" if m["role"] == "assistant" else "user"
                contents.append({"role": role, "parts": [{"text": m["content"]}]})

        body = {"contents": contents, "generationConfig": {"temperature": 0.7, "topP": 0.95}}
        if system_msg:
            body["systemInstruction"] = {"parts": [{"text": system_msg}]}

        resp = requests.post(
            f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}",
            json=body,
            timeout=60,
        )
        if resp.status_code != 200:
            err = resp.json().get("error", {}).get("message", f"Error {resp.status_code}")
            raise Exception(err)
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    def test_key(self) -> dict:
        try:
            resp = requests.get(f"{self.BASE_URL}?key={self.api_key}", timeout=10)
            if resp.status_code != 200:
                return {"ok": False, "message": resp.json().get("error", {}).get("message", "Error")}
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "message": str(e)}


class OllamaProvider:
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama3.2"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def ask(self, messages: list) -> str:
        resp = requests.post(
            f"{self.base_url}/api/chat",
            json={"model": self.model, "messages": messages, "stream": False},
            timeout=120,
        )
        if resp.status_code != 200:
            raise Exception(f"Ollama error ({resp.status_code}): {resp.text}")
        return resp.json()["message"]["content"]

    def test_connection(self) -> dict:
        try:
            resp = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if resp.status_code != 200:
                return {"ok": False, "message": f"Ollama returned {resp.status_code}"}
            models = [m["name"] for m in resp.json().get("models", [])]
            return {"ok": True, "models": models}
        except Exception as e:
            return {"ok": False, "message": str(e)}


# ═══════════════════════════════════════════
# AUTO MODEL DETECTION
# ═══════════════════════════════════════════

def detect_best_model(config: Config) -> dict:
    results = []

    if config.groq_api_key:
        provider = GroqProvider(config.groq_api_key)
        for model in GROQ_PRIORITY:
            try:
                p = GroqProvider(config.groq_api_key, model)
                start = time.time()
                p.ask([{"role": "user", "content": "Say OK"}])
                latency = int((time.time() - start) * 1000)
                results.append({"provider": "groq", "model": model, "latency": latency})
            except Exception:
                pass

    if config.gemini_api_key:
        for model in GEMINI_PRIORITY:
            try:
                p = GeminiProvider(config.gemini_api_key, model)
                start = time.time()
                p.ask([{"role": "user", "content": "Say OK"}])
                latency = int((time.time() - start) * 1000)
                results.append({"provider": "gemini", "model": model, "latency": latency})
            except Exception:
                pass

    if results:
        results.sort(key=lambda x: x["latency"])
        return {"ok": True, "best": results[0], "all": results}
    return {"ok": False, "error": "No models available"}


# ═══════════════════════════════════════════
# MAIN APP
# ═══════════════════════════════════════════

class WormGPT:
    def __init__(self):
        self.config = Config()
        self.storage = Storage()
        self.messages = []
        self.provider = None
        self.current_skill = None

    def setup_provider(self):
        if self.config.default_provider == "groq" and self.config.groq_api_key:
            self.provider = GroqProvider(self.config.groq_api_key, self.config.groq_model)
        elif self.config.default_provider == "gemini" and self.config.gemini_api_key:
            self.provider = GeminiProvider(self.config.gemini_api_key, self.config.gemini_model)
        elif self.config.default_provider == "ollama":
            self.provider = OllamaProvider(self.config.ollama_url, self.config.ollama_model)
        else:
            if self.config.groq_api_key:
                self.provider = GroqProvider(self.config.groq_api_key, self.config.groq_model)
            elif self.config.gemini_api_key:
                self.provider = GeminiProvider(self.config.gemini_api_key, self.config.gemini_model)

    def get_provider(self, name: str = None):
        if name == "groq":
            return GroqProvider(self.config.groq_api_key, self.config.groq_model)
        elif name == "gemini":
            return GeminiProvider(self.config.gemini_api_key, self.config.gemini_model)
        elif name == "ollama":
            return OllamaProvider(self.config.ollama_url, self.config.ollama_model)
        return self.provider

    def print_banner(self):
        os.system("cls" if os.name == "nt" else "clear")
        print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗██╗    ██╗ ██████╗ ████████╗███████╗██╗          ║
║   ██╔════╝██║    ██║██╔═══██╗╚══██╔══╝██╔════╝██║          ║
║   ███████╗██║ █╗ ██║██║   ██║   ██║   █████╗  ██║          ║
║   ╚════██║██║███╗██║██║   ██║   ██║   ██╔══╝  ██║          ║
║   ███████║╚███╔███╔╝╚██████╔╝   ██║   ███████╗███████╗     ║
║   ╚══════╝ ╚══╝╚══╝  ╚═════╝    ╚═╝   ╚══════╝╚══════╝     ║
║                                                              ║
║   Firewire AI Coding Agent — CLI Edition                     ║
║   Type /help for commands                                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        """)

    def print_help(self):
        print("\n╔═══ AVAILABLE COMMANDS ═══╗")
        print("║")
        print("║  /help        — Show this help")
        print("║  /clear       — Clear chat history")
        print("║  /system      — View system prompt")
        print("║  /provider    — Switch provider (groq/gemini/ollama)")
        print("║  /model       — Switch model")
        print("║  /detect      — Auto-detect best model")
        print("║  /testkey     — Test API key")
        print("║  /skills      — List all skills")
        print("║  /<skill>     — Use a skill (e.g., /fix, /create)")
        print("║  /quit        — Exit")
        print("║")
        print("║  Type anything to chat with Firewire!")
        print("╚══════════════════════════╝\n")

    def print_skills(self):
        print("\n╔═══ SKILLS ═══╗")
        for sid, skill in SKILLS.items():
            print(f"║  /{sid:<14} — {skill['name']}")
        print("╚══════════════╝\n")

    def detect_skill(self, text: str):
        lower = text.lower().strip()
        if lower.startswith("/"):
            parts = lower.split(" ", 1)
            cmd = parts[0][1:]
            if cmd in SKILLS:
                return cmd, parts[1] if len(parts) > 1 else ""
        return None, None

    def ask(self, user_input: str) -> str:
        if not self.provider:
            return "No provider configured. Set GROQ_API_KEY or GEMINI_API_KEY in .env file."

        system_msg = SYSTEM_PROMPT
        if self.current_skill:
            skill = SKILLS.get(self.current_skill)
            if skill:
                system_msg += f"\n\nACTIVE SKILL: {skill['prompt']}"

        messages = [{"role": "system", "content": system_msg}]
        messages.extend(trim_messages(self.messages, self.config.max_messages))
        messages.append({"role": "user", "content": user_input})

        try:
            response = self.provider.ask(messages)
            self.messages.append({"role": "user", "content": user_input})
            self.messages.append({"role": "assistant", "content": response})
            return response
        except Exception as e:
            return f"Error: {str(e)}"

    def handle_command(self, cmd: str, args: str):
        if cmd == "help":
            self.print_help()

        elif cmd == "clear":
            self.messages = []
            print("Chat history cleared.")

        elif cmd == "system":
            print(f"\n{SYSTEM_PROMPT}\n")

        elif cmd == "provider":
            print("\nAvailable providers:")
            print("  1. groq    — Groq API (fast, free tier available)")
            print("  2. gemini  — Google Gemini")
            print("  3. ollama  — Local Ollama server")
            choice = input("\nSelect provider: ").strip().lower()
            if choice in ["groq", "gemini", "ollama"]:
                self.config.default_provider = choice
                self.setup_provider()
                print(f"Switched to {choice}")
            else:
                print("Invalid choice.")

        elif cmd == "model":
            provider_name = self.config.default_provider
            if args:
                provider_name = args.strip()
            provider = self.get_provider(provider_name)
            if isinstance(provider, GroqProvider):
                print(f"Current model: {provider.model}")
                print(f"Available: {', '.join(GROQ_PRIORITY)}")
                new_model = input("New model (Enter to keep): ").strip()
                if new_model:
                    self.provider = GroqProvider(self.config.groq_api_key, new_model)
            elif isinstance(provider, GeminiProvider):
                print(f"Current model: {provider.model}")
                print(f"Available: {', '.join(GEMINI_PRIORITY)}")
                new_model = input("New model (Enter to keep): ").strip()
                if new_model:
                    self.provider = GeminiProvider(self.config.gemini_api_key, new_model)
            elif isinstance(provider, OllamaProvider):
                print(f"Current model: {provider.model}")
                new_model = input("New model (Enter to keep): ").strip()
                if new_model:
                    self.provider = OllamaProvider(self.config.ollama_url, new_model)

        elif cmd == "detect":
            print("Detecting best model...")
            result = detect_best_model(self.config)
            if result["ok"]:
                best = result["best"]
                print(f"Best model: {best['provider']}/{best['model']} ({best['latency']}ms)")
                for r in result["all"]:
                    status = "OK" if r == best else "  "
                    print(f"  [{status}] {r['provider']}/{r['model']} — {r['latency']}ms")
            else:
                print("No models found.")

        elif cmd == "testkey":
            provider_name = args.strip() if args else self.config.default_provider
            provider = self.get_provider(provider_name)
            if provider is None:
                print("No provider available.")
                return
            print(f"Testing {provider_name} key...")
            if isinstance(provider, GroqProvider):
                result = provider.test_key()
            elif isinstance(provider, GeminiProvider):
                result = provider.test_key()
            elif isinstance(provider, OllamaProvider):
                result = provider.test_connection()
            else:
                print("Unknown provider.")
                return
            if result["ok"]:
                print(f"✅ {provider_name} key is valid!")
            else:
                print(f"❌ {provider_name} key failed: {result.get('message', 'Unknown error')}")

        elif cmd == "skills":
            self.print_skills()

        elif cmd == "quit" or cmd == "exit" or cmd == "q":
            print("Goodbye!")
            sys.exit(0)

        elif cmd in SKILLS:
            self.current_skill = cmd
            print(f"🔧 Skill activated: {SKILLS[cmd]['name']}")
            if args:
                response = self.ask(args)
                print(f"\n{response}\n")
                self.current_skill = None

        else:
            print(f"Unknown command: /{cmd}. Type /help for commands.")

    def run(self):
        self.print_banner()
        self.setup_provider()

        if self.provider:
            if isinstance(self.provider, GroqProvider):
                print(f"Provider: Groq | Model: {self.provider.model}")
            elif isinstance(self.provider, GeminiProvider):
                print(f"Provider: Gemini | Model: {self.provider.model}")
            elif isinstance(self.provider, OllamaProvider):
                print(f"Provider: Ollama | Model: {self.provider.model}")
        else:
            print("⚠ No API key found. Set GROQ_API_KEY or GEMINI_API_KEY in .env")

        print("=" * 60)

        while True:
            try:
                prefix = f"[{self.current_skill}] " if self.current_skill else ""
                user_input = input(f"\n{prefix}You: ").strip()

                if not user_input:
                    continue

                if user_input.startswith("/"):
                    parts = user_input.split(" ", 1)
                    cmd = parts[0][1:]
                    args = parts[1] if len(parts) > 1 else ""
                    self.handle_command(cmd, args)
                    continue

                if self.current_skill:
                    self.current_skill = None

                print("\nFirewire: ", end="", flush=True)
                response = self.ask(user_input)
                print(response)
                print()

            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except EOFError:
                break


# ═══════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════

if __name__ == "__main__":
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher
    except ImportError:
        print("Installing cryptography...")
        os.system(f"{sys.executable} -m pip install cryptography -q")

    app = WormGPT()
    app.run()
