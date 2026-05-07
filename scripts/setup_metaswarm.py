#!/usr/bin/env python3
"""Metaswarm preflight + optional init for metaswarm-hebrew-anagram-poc.

Modes:
    --check-only   Run preflight checks only. No install, no init. (Default.)
    --init         Run preflight, then ask for confirmation before running
                   metaswarm init commands.
    --yes          With --init: skip the interactive confirmation prompt.

This script is read-only with respect to source files (``src/``), tests
(``tests/``), data files (``data/``), and Git state — those are never
modified by this script. The script *may* write files when:
  - creating ``.ai/validation-runs/`` and the timestamped report file
    (always, in any mode);
  - running ``npx metaswarm init`` (only in ``--init`` mode after
    confirmation), which is allowed to write whatever metaswarm itself
    creates.

Never:
  - runs a coding task through metaswarm
  - sends prompts to Claude / Gemini / Codex
  - performs interactive logins
  - auto-commits anything

Stdlib-only.

Exit code: 0 if no FAIL items, 1 otherwise.
"""

from __future__ import annotations

import argparse
import datetime
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

SECTION_BAR = "=" * 70
VALID_STATUSES = ("PASS", "WARN", "FAIL", "INFO")

THIS_SCRIPT_REL = "scripts/setup_metaswarm.py"

EXPECTED_FILES = [
    "README.md",
    "CLAUDE.md",
    "AGENTS.md",
    "pyproject.toml",
    "scripts/validate_agent_setup.py",
    "data/hebrew_dict.txt",
    "data/sample_words_he.txt",
    "src/hebrew_anagram/matcher.py",
    "tests/test_matcher.py",
]

# Substrings (lowercased) we treat as "metaswarm-related" when scanning.
DETECT_NAME_FRAGMENTS = ["metaswarm", ".claude", ".gemini", "codex", "beads"]

# Directories we never recurse into during the shallow scan.
SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", ".pytest_cache"}


# --------------------------------------------------------------------------- #
# Reporting
# --------------------------------------------------------------------------- #


class Report:
    """Collects lines + status counts. Mirrors output to stdout and a buffer."""

    def __init__(self) -> None:
        self.lines: list[str] = []
        self.counts: dict[str, int] = {s: 0 for s in VALID_STATUSES}

    def _write(self, line: str) -> None:
        self.lines.append(line)
        print(line)

    def emit(self, status: str, label: str, detail: str = "") -> None:
        if status not in self.counts:
            raise ValueError(f"Unknown status: {status}")
        self.counts[status] += 1
        line = f"[{status:4}] {label}"
        if detail:
            line += f" — {detail}"
        self._write(line)

    def header(self, title: str) -> None:
        self._write("")
        self._write(SECTION_BAR)
        self._write(f"  {title}")
        self._write(SECTION_BAR)

    def text(self, line: str = "") -> None:
        self._write(line)


# --------------------------------------------------------------------------- #
# Subprocess helper
# --------------------------------------------------------------------------- #


def run_cmd(
    cmd: list[str],
    cwd: Optional[Path] = None,
    timeout: float = 10.0,
) -> tuple[int, str, str]:
    """Run a command with stdin redirected from /dev/null and a timeout.

    Returns ``(exit_code, stdout, stderr)``. On not-found / timeout / OSError
    returns ``(-1, "", error_message)``.
    """
    try:
        r = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            stdin=subprocess.DEVNULL,
        )
        return r.returncode, r.stdout, r.stderr
    except FileNotFoundError:
        return -1, "", f"command not found: {cmd[0]}"
    except subprocess.TimeoutExpired:
        return -1, "", f"timeout after {timeout}s"
    except OSError as e:
        return -1, "", f"OSError: {e}"


def first_line(s: str) -> str:
    s = (s or "").strip()
    return s.splitlines()[0] if s else ""


# --------------------------------------------------------------------------- #
# Filesystem scan
# --------------------------------------------------------------------------- #


def shallow_scan(root: Path, max_depth: int = 4) -> list[str]:
    """Return relative paths whose path contains any DETECT_NAME_FRAGMENTS substring."""
    matches: list[str] = []
    root = root.resolve()
    fragments = [f.lower() for f in DETECT_NAME_FRAGMENTS]

    def walk(d: Path, depth: int) -> None:
        if depth > max_depth:
            return
        try:
            entries = sorted(d.iterdir(), key=lambda p: p.name)
        except (PermissionError, OSError):
            return
        for entry in entries:
            if entry.name in SKIP_DIRS:
                continue
            try:
                rel = entry.relative_to(root)
            except ValueError:
                continue
            rel_str = str(rel).lower()
            if any(frag in rel_str for frag in fragments):
                matches.append(str(rel))
            if entry.is_dir():
                walk(entry, depth + 1)

    walk(root, 0)
    return matches


# --------------------------------------------------------------------------- #
# Preflight checks
# --------------------------------------------------------------------------- #


def check_repo(rep: Report, root: Path) -> dict:
    state = {"is_git_repo": False, "tree_clean": False, "porcelain": ""}

    rep.header("Repository preflight")
    rep.emit("INFO", "Detected repo root", str(root))
    rep.emit("INFO", "Current working directory", os.getcwd())

    git_path = shutil.which("git")
    if not git_path:
        rep.emit("FAIL", "git not in PATH")
    else:
        rep.emit("PASS", "git installed", git_path)

        rc, out, _ = run_cmd(
            ["git", "rev-parse", "--is-inside-work-tree"], cwd=root
        )
        if rc != 0 or out.strip() != "true":
            rep.emit(
                "FAIL",
                "Directory is not a git repository",
                "run `git init` first",
            )
        else:
            state["is_git_repo"] = True
            rep.emit("PASS", "Directory is a git repository")

            _, branch, _ = run_cmd(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=root
            )
            rep.emit(
                "INFO",
                "Current branch",
                branch.strip() or "(unknown)",
            )

            _, sha, _ = run_cmd(["git", "rev-parse", "HEAD"], cwd=root)
            rep.emit(
                "INFO",
                "Current commit",
                sha.strip() or "(no commits yet)",
            )

            _, status, _ = run_cmd(
                ["git", "status", "--porcelain"], cwd=root
            )
            state["porcelain"] = status
            if status.strip() == "":
                state["tree_clean"] = True
                rep.emit("PASS", "Working tree clean")
            else:
                n = len(status.strip().splitlines())
                rep.emit(
                    "WARN",
                    f"Working tree has {n} uncommitted change(s)",
                    first_line(status),
                )

    if (root / ".gitignore").exists():
        rep.emit("PASS", ".gitignore exists")
    else:
        rep.emit("WARN", ".gitignore missing")

    missing = [rel for rel in EXPECTED_FILES if not (root / rel).exists()]
    if missing:
        for rel in missing:
            rep.emit("FAIL", f"Missing expected file: {rel}")
    else:
        rep.emit(
            "PASS", f"All {len(EXPECTED_FILES)} expected project files present"
        )

    return state


def check_python(rep: Report, root: Path) -> None:
    rep.header("Python / project preflight")

    rep.emit("INFO", "Python executable", sys.executable)
    rep.emit("INFO", "Python version", sys.version.replace("\n", " "))

    if sys.prefix != sys.base_prefix:
        rep.emit("PASS", "Virtual environment active", sys.prefix)
    else:
        rep.emit(
            "WARN",
            "No virtual environment detected",
            "expected .venv to be active",
        )

    try:
        import pytest  # type: ignore[import-not-found]

        rep.emit("PASS", "pytest importable", f"version {pytest.__version__}")
    except ImportError as e:
        rep.emit("FAIL", "pytest not importable", str(e))

    rep.text("")
    rep.text("Running pytest (timeout 60s)...")
    rc, out, err = run_cmd(
        [sys.executable, "-m", "pytest", "-q"], cwd=root, timeout=60.0
    )
    if rc == 0:
        last = out.strip().splitlines()[-1] if out.strip() else ""
        rep.emit("PASS", "pytest passed", last)
    elif rc == -1:
        rep.emit("FAIL", "pytest could not be invoked", err.strip())
    else:
        last = out.strip().splitlines()[-1] if out.strip() else f"exit {rc}"
        rep.emit("FAIL", f"pytest failed (exit {rc})", last)

    rep.text("")
    rep.text("---- pytest stdout ----")
    rep.text(out.rstrip() if out else "(empty)")
    if err.strip():
        rep.text("---- pytest stderr ----")
        rep.text(err.rstrip())
    rep.text("---- end pytest output ----")


def check_agent_clis(rep: Report) -> None:
    rep.header("Agent CLI preflight")

    for name in ("claude", "gemini", "codex"):
        path = shutil.which(name)
        if not path:
            rep.emit("WARN", f"{name} not in PATH")
            continue
        rep.emit("PASS", f"{name} found in PATH", path)

        rc, out, err = run_cmd([name, "--version"], timeout=10.0)
        if rc == 0:
            rep.emit(
                "INFO",
                f"{name} --version",
                first_line(out) or first_line(err) or "(no output)",
            )
        elif rc == -1:
            rep.emit("WARN", f"{name} --version failed to run", err.strip())
        else:
            rep.emit(
                "WARN",
                f"{name} --version exited {rc}",
                first_line(err) or first_line(out),
            )

    if shutil.which("codex"):
        rc, out, err = run_cmd(["codex", "login", "status"], timeout=10.0)
        combined = (out + " " + err).lower()
        if rc == 0:
            if "logged in" in combined or "authenticated" in combined:
                rep.emit(
                    "PASS",
                    "codex login status — logged in",
                    first_line(out) or first_line(err),
                )
            else:
                rep.emit(
                    "WARN",
                    "codex login status — inconclusive",
                    first_line(out) or first_line(err) or "(empty)",
                )
        elif rc == -1:
            rep.emit(
                "WARN", "codex login status not runnable", err.strip()
            )
        else:
            login_required = (
                "not logged" in combined
                or "login required" in combined
                or "please log in" in combined
                or "please login" in combined
                or "must log in" in combined
            )
            if login_required:
                rep.emit(
                    "FAIL",
                    "codex login status — not logged in",
                    first_line(err) or first_line(out),
                )
            else:
                rep.emit(
                    "WARN",
                    f"codex login status exited {rc} — inconclusive",
                    first_line(err) or first_line(out) or f"exit {rc}",
                )

    rep.text("")
    rep.text(
        "Note: only binary availability + --version was checked for claude / "
        "gemini / codex.\nThis script does NOT invoke interactive login or "
        "send prompts to any agent."
    )


def check_metaswarm_prereqs(rep: Report) -> None:
    rep.header("Metaswarm prerequisites")

    for tool in ("node", "npm", "npx", "gh"):
        path = shutil.which(tool)
        if not path:
            rep.emit("WARN", f"{tool} not in PATH")
            continue
        rep.emit("PASS", f"{tool} available", path)
        rc, out, err = run_cmd([tool, "--version"], timeout=10.0)
        if rc == 0:
            rep.emit(
                "INFO",
                f"{tool} --version",
                first_line(out) or first_line(err) or "(no output)",
            )
        else:
            rep.emit(
                "WARN",
                f"{tool} --version exited {rc}",
                first_line(err) or first_line(out) or f"exit {rc}",
            )

    metaswarm_path = shutil.which("metaswarm")
    if metaswarm_path:
        rep.emit("PASS", "metaswarm command in PATH", metaswarm_path)
    else:
        rep.emit(
            "INFO",
            "metaswarm not in PATH",
            "may be invocable via npx — checked next",
        )

    if shutil.which("npx"):
        # `--no-install` ensures we don't trigger a download under --check-only.
        rc, out, err = run_cmd(
            ["npx", "--no-install", "metaswarm", "--help"], timeout=15.0
        )
        if rc == 0:
            rep.emit(
                "PASS",
                "metaswarm available locally via npx (--no-install)",
            )
        else:
            combined = (err + " " + out).lower()
            unavailable_markers = (
                "not installed",
                "could not determine",
                "command not found",
                "cannot find",
                "no such",
            )
            if any(m in combined for m in unavailable_markers):
                rep.emit(
                    "WARN",
                    "metaswarm not available via npx without install",
                    first_line(err) or first_line(out) or f"exit {rc}",
                )
            else:
                rep.emit(
                    "WARN",
                    "npx --no-install metaswarm --help failed",
                    first_line(err) or first_line(out) or f"exit {rc}",
                )
    else:
        rep.emit(
            "WARN",
            "Cannot probe metaswarm via npx — npx missing",
        )


def detect_existing(rep: Report, root: Path, label: str) -> list[str]:
    rep.header(label)
    matches = shallow_scan(root, max_depth=4)
    if not matches:
        rep.emit("INFO", "No metaswarm-related paths detected")
    else:
        rep.emit("INFO", f"Detected {len(matches)} matching path(s)")
        for m in matches:
            rep.text(f"  - {m}")
    return matches


# --------------------------------------------------------------------------- #
# Init
# --------------------------------------------------------------------------- #


def _porcelain_only_this_script(porcelain: str) -> bool:
    lines = [ln for ln in porcelain.splitlines() if ln.strip()]
    if len(lines) != 1:
        return False
    line = lines[0]
    if len(line) < 4:
        return False
    # Porcelain v1: "XY path" — strip the 2-char status + space, then quotes.
    path = line[3:].strip().strip('"')
    return path == THIS_SCRIPT_REL


def can_proceed_with_init(
    rep: Report, args: argparse.Namespace, repo_state: dict
) -> bool:
    rep.header("Init gating")

    if rep.counts["FAIL"] > 0:
        rep.emit(
            "FAIL",
            "Cannot proceed with init: preflight has FAIL item(s)",
        )
        return False

    if not repo_state.get("is_git_repo"):
        rep.emit("FAIL", "Cannot proceed: not a git repository")
        return False

    if not shutil.which("npx"):
        rep.emit(
            "FAIL", "Cannot proceed with init: npx not in PATH"
        )
        return False

    if repo_state.get("tree_clean"):
        rep.emit("PASS", "Tree clean — eligible for init")
        return True

    porcelain = repo_state.get("porcelain", "")
    only_self = _porcelain_only_this_script(porcelain)

    if not only_self:
        rep.emit(
            "FAIL",
            "Cannot proceed with init: working tree has changes other than this script",
            "commit or stash before running --init",
        )
        return False

    if not args.yes:
        rep.emit(
            "WARN",
            "Tree dirty (only this script). Re-run with `--init --yes` to proceed.",
        )
        return False

    rep.emit(
        "INFO",
        "Tree dirty (only this script); --yes given — proceeding with init",
    )
    return True


def confirm_init() -> bool:
    print()
    print(SECTION_BAR)
    print("  About to run metaswarm initialization commands")
    print(SECTION_BAR)
    print("Commands that will be executed:")
    print("    npx metaswarm detect")
    print("    npx metaswarm init")
    print()
    print(
        "These may install npm packages and write files into the working tree."
    )
    print("They will NOT auto-commit anything.")
    print()
    try:
        response = input("Proceed? [y/N]: ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        return False
    return response in ("y", "yes")


def run_init(rep: Report, root: Path) -> tuple[list[tuple[list[str], int]], Optional[bool]]:
    rep.header("Metaswarm init")
    attempted: list[tuple[list[str], int]] = []
    init_ok: Optional[bool] = None

    def _run_and_log(cmd: list[str], timeout: float, label: str) -> tuple[int, str, str]:
        rep.text(f"$ {' '.join(cmd)}")
        rc, out, err = run_cmd(cmd, cwd=root, timeout=timeout)
        attempted.append((cmd, rc))
        rep.text(f"---- {label} stdout ----")
        rep.text(out.rstrip() if out else "(empty)")
        if err.strip():
            rep.text(f"---- {label} stderr ----")
            rep.text(err.rstrip())
        rep.text(f"---- end {label} ----")
        return rc, out, err

    rc, out, err = _run_and_log(
        ["npx", "metaswarm", "detect"], timeout=120.0, label="detect"
    )
    if rc == 0:
        rep.emit(
            "PASS", "npx metaswarm detect succeeded", first_line(out)
        )
    else:
        rep.emit(
            "WARN",
            "npx metaswarm detect did not succeed (continuing to init)",
            first_line(err) or first_line(out) or f"exit {rc}",
        )

    rep.text("")
    rc, out, err = _run_and_log(
        ["npx", "metaswarm", "init"], timeout=300.0, label="init"
    )
    if rc == 0:
        rep.emit("PASS", "npx metaswarm init succeeded", first_line(out))
        init_ok = True
    else:
        rep.emit(
            "FAIL",
            "npx metaswarm init failed",
            first_line(err) or first_line(out) or f"exit {rc}",
        )
        init_ok = False

    return attempted, init_ok


def run_post_init(rep: Report, root: Path) -> list[str]:
    rep.header("Post-init checks")

    rc, out, _ = run_cmd(["git", "status", "--short"], cwd=root, timeout=10.0)
    rep.text("$ git status --short")
    rep.text(out.rstrip() if out.strip() else "(no changes)")

    after = shallow_scan(root, max_depth=4)
    rep.text("")
    rep.text(f"Metaswarm-related paths after init ({len(after)}):")
    for m in after:
        rep.text(f"  - {m}")

    val_script = root / "scripts" / "validate_agent_setup.py"
    if val_script.exists():
        rep.text("")
        rep.text("Re-running scripts/validate_agent_setup.py (timeout 90s)...")
        rc, out, err = run_cmd(
            [sys.executable, str(val_script)], cwd=root, timeout=90.0
        )
        if rc == 0:
            rep.emit("PASS", "validate_agent_setup.py exited 0")
        elif rc == 1:
            rep.emit(
                "WARN", "validate_agent_setup.py reported FAIL items (exit 1)"
            )
        elif rc == -1:
            rep.emit(
                "WARN", "validate_agent_setup.py did not run", err.strip()
            )
        else:
            rep.emit("WARN", f"validate_agent_setup.py exited {rc}")
        rep.text("---- validate_agent_setup.py output (tail) ----")
        for line in (out or "").rstrip().splitlines()[-30:]:
            rep.text(line)
        rep.text("---- end ----")
    else:
        rep.emit(
            "WARN",
            "scripts/validate_agent_setup.py not present — skipped",
        )

    rep.text("")
    rep.text("Note: nothing was auto-committed. Review and commit manually.")
    return after


# --------------------------------------------------------------------------- #
# Report writing + main
# --------------------------------------------------------------------------- #


def write_report(root: Path, rep: Report) -> Path:
    runs_dir = root / ".ai" / "validation-runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = runs_dir / f"metaswarm_setup_{ts}.txt"
    out_path.write_text("\n".join(rep.lines) + "\n", encoding="utf-8")
    return out_path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=(
            "Metaswarm preflight + optional init for "
            "metaswarm-hebrew-anagram-poc."
        )
    )
    g = p.add_mutually_exclusive_group()
    g.add_argument(
        "--check-only",
        action="store_true",
        help="Run preflight checks only (default).",
    )
    g.add_argument(
        "--init",
        action="store_true",
        help="Run preflight then run metaswarm init after confirmation.",
    )
    p.add_argument(
        "--yes",
        action="store_true",
        help="With --init: skip the interactive confirmation prompt.",
    )
    args = p.parse_args()
    if not args.check_only and not args.init:
        args.check_only = True
    return args


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent.parent
    rep = Report()

    mode_label = "init" if args.init else "check-only"
    if args.yes:
        mode_label += " --yes"
    rep.text("metaswarm-hebrew-anagram-poc — metaswarm setup")
    rep.text(f"Run at: {datetime.datetime.now().isoformat(timespec='seconds')}")
    rep.text(f"Mode:   {mode_label}")

    repo_state = check_repo(rep, repo_root)
    check_python(rep, repo_root)
    check_agent_clis(rep)
    check_metaswarm_prereqs(rep)
    before = detect_existing(
        rep, repo_root, "Existing metaswarm-related files (before)"
    )

    attempted: list[tuple[list[str], int]] = []
    after = before
    init_ok: Optional[bool] = None

    if args.init:
        if can_proceed_with_init(rep, args, repo_state):
            proceed = args.yes or confirm_init()
            if not proceed:
                rep.emit("INFO", "User declined init at confirmation prompt")
            else:
                attempted, init_ok = run_init(rep, repo_root)
                after = run_post_init(rep, repo_root)

    # --- Summary --------------------------------------------------------- #
    rep.header("Summary")
    counts = rep.counts
    if counts["FAIL"] > 0:
        overall = "FAIL"
    elif counts["WARN"] > 0:
        overall = "WARN"
    else:
        overall = "PASS"

    rep.text(f"Overall status: {overall}")
    rep.text(f"  PASS: {counts['PASS']}")
    rep.text(f"  WARN: {counts['WARN']}")
    rep.text(f"  FAIL: {counts['FAIL']}")
    rep.text(f"  INFO: {counts['INFO']}")

    rep.text("")
    if attempted:
        rep.text("Init commands attempted:")
        for cmd, rc in attempted:
            rep.text(f"  - {' '.join(cmd)} (exit {rc})")
    elif args.init:
        rep.text("No init commands ran (gate refused or user declined).")
    else:
        rep.text("No init commands ran (--check-only mode).")

    rep.text("")
    rep.text(f"Metaswarm-related paths before init: {len(before)}")
    rep.text(f"Metaswarm-related paths after init:  {len(after)}")
    if init_ok is True:
        rep.text("Metaswarm init reported success.")
    elif init_ok is False:
        rep.text("Metaswarm init FAILED — see init section above.")

    rep.text("")
    rep.text("Next manual steps:")
    rep.text("  1. Review this report.")
    rep.text("  2. Run: git status   (inspect any new files)")
    rep.text("  3. Inspect metaswarm-created files before committing.")
    rep.text("  4. Open Claude Code in this repo.")
    rep.text("  5. Manually run the metaswarm Claude-side slash commands, e.g.:")
    rep.text("       /setup                     (or  /metaswarm:setup)")
    rep.text(
        "       /external-tools-health     (or  /metaswarm:external-tools-health)"
    )
    rep.text("  6. Copy the Claude-side health output back here for review.")
    rep.text("")
    rep.text(
        "Reminder: this script does not run Claude slash commands or send "
        "prompts to any agent.\nThe Claude-side part of the setup must still be "
        "done manually inside Claude Code."
    )

    out_path = write_report(repo_root, rep)
    rep.text("")
    rep.text(f"Report written to: {out_path}")

    return 1 if counts["FAIL"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
