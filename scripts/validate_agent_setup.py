#!/usr/bin/env python3
"""Local diagnostic for metaswarm-hebrew-anagram-poc.

Read-only with respect to source files (``src/``), tests (``tests/``), data
files (``data/``), package metadata (``pyproject.toml``), and Git state —
none of these are modified by this script. The one side effect is that the
script creates ``.ai/validation-runs/`` if missing and writes a timestamped
report file (``agent_setup_validation_YYYYMMDD_HHMMSS.txt``) into it.

Stdlib-only. Runs from anywhere — locates the repo via this script's path.
Produces a structured PASS/WARN/FAIL/INFO report on the terminal and writes
a timestamped copy to ``.ai/validation-runs/``.

Exit code: 0 if no FAIL items, 1 otherwise.
"""

from __future__ import annotations

import datetime
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable, Optional

# --------------------------------------------------------------------------- #
# Reporting infrastructure
# --------------------------------------------------------------------------- #

SECTION_BAR = "=" * 70
VALID_STATUSES = ("PASS", "WARN", "FAIL", "INFO")


class Report:
    """Collect lines and pass/warn/fail counts for the run."""

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


def run_cmd(
    cmd: list[str],
    cwd: Optional[Path] = None,
    timeout: float = 5.0,
) -> tuple[int, str, str]:
    """Run a command; return ``(exit_code, stdout, stderr)``.

    Returns ``(-1, "", error_message)`` if the command is not found, times
    out, or otherwise fails to launch.
    """
    try:
        r = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return r.returncode, r.stdout, r.stderr
    except FileNotFoundError:
        return -1, "", f"command not found: {cmd[0]}"
    except subprocess.TimeoutExpired:
        return -1, "", f"timeout after {timeout}s"
    except OSError as e:
        return -1, "", f"OSError: {e}"


def first_line(text: str) -> str:
    text = (text or "").strip()
    return text.splitlines()[0] if text else ""


# --------------------------------------------------------------------------- #
# Checks
# --------------------------------------------------------------------------- #

EXPECTED_FILES = [
    "README.md",
    "CLAUDE.md",
    "AGENTS.md",
    "pyproject.toml",
    ".ai/task.md",
    ".ai/validation-notes.md",
    "data/sample_words_he.txt",
    "data/hebrew_dict.txt",
    "src/hebrew_anagram/__init__.py",
    "src/hebrew_anagram/letters.py",
    "src/hebrew_anagram/matcher.py",
    "src/hebrew_anagram/scoring.py",
    "tests/test_letters.py",
    "tests/test_matcher.py",
    "tests/test_scoring.py",
]

UNWANTED_TRACKED_PATTERNS = [
    "__pycache__",
    ".pyc",
    ".egg-info",
    ".venv/",
    ".pytest_cache",
]

PUBLIC_FUNCS = [
    "remove_niqqud",
    "normalize_final_letters",
    "normalize_text",
    "can_form_word",
    "score_word",
]


def repo_checks(rep: Report, repo_root: Path) -> None:
    rep.header("Repository checks")

    rep.emit("INFO", "Current working directory", os.getcwd())
    rep.emit("INFO", "Detected repo root", str(repo_root))

    git_path = shutil.which("git")
    if not git_path:
        rep.emit("FAIL", "git not found in PATH")
    else:
        rep.emit("PASS", "git installed", git_path)
        rc, out, _ = run_cmd(
            ["git", "rev-parse", "--is-inside-work-tree"], cwd=repo_root
        )
        if rc == 0 and out.strip() == "true":
            rep.emit("PASS", "Directory is a git repository")

            rc_b, branch, _ = run_cmd(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_root
            )
            rep.emit(
                "INFO",
                "Current branch",
                branch.strip() if rc_b == 0 else "(unknown)",
            )

            rc_s, sha, _ = run_cmd(["git", "rev-parse", "HEAD"], cwd=repo_root)
            rep.emit(
                "INFO",
                "Current commit",
                sha.strip() if rc_s == 0 else "(no commits yet)",
            )

            rc_st, status_out, _ = run_cmd(
                ["git", "status", "--porcelain"], cwd=repo_root
            )
            if rc_st == 0:
                if status_out.strip() == "":
                    rep.emit("PASS", "Working tree is clean")
                else:
                    n = len(status_out.strip().splitlines())
                    rep.emit("WARN", f"Working tree has {n} uncommitted change(s)")

            rc_ls, tracked, _ = run_cmd(["git", "ls-files"], cwd=repo_root)
            if rc_ls == 0:
                bad = [
                    line
                    for line in tracked.splitlines()
                    if any(p in line for p in UNWANTED_TRACKED_PATTERNS)
                ]
                if bad:
                    rep.emit(
                        "FAIL",
                        f"Tracked unwanted files: {len(bad)}",
                        ", ".join(bad[:5]),
                    )
                else:
                    rep.emit(
                        "PASS",
                        "No tracked unwanted files (__pycache__, *.pyc, .venv/, etc.)",
                    )
        else:
            rep.emit(
                "WARN",
                "Directory is not a git repository",
                "git init has not been run yet — most git checks skipped",
            )

    gi = repo_root / ".gitignore"
    if gi.exists():
        rep.emit("PASS", ".gitignore exists")
    else:
        rep.emit(
            "WARN",
            ".gitignore missing",
            "recommended before first commit (excludes .venv, __pycache__, etc.)",
        )

    missing = [rel for rel in EXPECTED_FILES if not (repo_root / rel).exists()]
    if missing:
        for rel in missing:
            rep.emit("FAIL", f"Missing expected file: {rel}")
    else:
        rep.emit("PASS", f"All {len(EXPECTED_FILES)} expected files present")


def python_checks(rep: Report, repo_root: Path) -> None:
    rep.header("Python environment checks")

    rep.emit("INFO", "Python executable", sys.executable)
    rep.emit("INFO", "Python version", sys.version.replace("\n", " "))

    in_venv = sys.prefix != sys.base_prefix
    if in_venv:
        rep.emit("PASS", "Virtual environment active", sys.prefix)
    else:
        rep.emit(
            "WARN",
            "No virtual environment detected",
            "expected .venv to be active for editable install of hebrew_anagram",
        )

    try:
        import pytest  # type: ignore[import-not-found]

        rep.emit("PASS", "pytest importable", f"version {pytest.__version__}")
    except ImportError as e:
        rep.emit("FAIL", "pytest not importable", str(e))

    try:
        import hebrew_anagram  # type: ignore[import-not-found]

        rep.emit("PASS", "hebrew_anagram importable")
        missing = [f for f in PUBLIC_FUNCS if not hasattr(hebrew_anagram, f)]
        if missing:
            rep.emit(
                "FAIL", "Missing public functions", ", ".join(missing)
            )
        else:
            rep.emit(
                "PASS",
                f"All {len(PUBLIC_FUNCS)} public functions exported",
                ", ".join(PUBLIC_FUNCS),
            )
    except Exception as e:
        rep.emit("FAIL", "hebrew_anagram not importable", repr(e))

    rep.text("")
    rep.text("Running pytest (timeout 60s)...")
    rc, out, err = run_cmd(
        [sys.executable, "-m", "pytest", "-q"], cwd=repo_root, timeout=60.0
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


def smoke_checks(rep: Report) -> None:
    rep.header("Project behavior smoke checks")

    try:
        from hebrew_anagram import (  # type: ignore[import-not-found]
            can_form_word,
            normalize_final_letters,
            remove_niqqud,
            score_word,
        )
    except ImportError as e:
        rep.emit(
            "FAIL",
            "Cannot import hebrew_anagram functions for smoke checks",
            repr(e),
        )
        return

    cases: list[tuple[str, Callable[[], bool]]] = [
        (
            'remove_niqqud("שָׁלוֹם") == "שלום"',
            lambda: remove_niqqud("שָׁלוֹם") == "שלום",
        ),
        (
            'normalize_final_letters("שלום") maps ם → מ',
            lambda: (
                "ם" not in normalize_final_letters("שלום")
                and "מ" in normalize_final_letters("שלום")
            ),
        ),
        (
            'can_form_word("שלום", "שלום") is True',
            lambda: can_form_word("שלום", "שלום") is True,
        ),
        (
            'can_form_word("שלו?", "שלום") is True',
            lambda: can_form_word("שלו?", "שלום") is True,
        ),
        (
            'can_form_word("שלו", "שלום") is False',
            lambda: can_form_word("שלו", "שלום") is False,
        ),
        (
            'score_word("שלום") is int > 0',
            lambda: isinstance(score_word("שלום"), int) and score_word("שלום") > 0,
        ),
    ]

    for label, fn in cases:
        try:
            ok = fn()
            rep.emit("PASS" if ok else "FAIL", label)
        except Exception as e:
            rep.emit("FAIL", label, f"raised {type(e).__name__}: {e}")


def data_checks(rep: Report, repo_root: Path) -> None:
    rep.header("Data checks")

    sample = repo_root / "data" / "sample_words_he.txt"
    dictionary = repo_root / "data" / "hebrew_dict.txt"

    for path in (sample, dictionary):
        if not path.exists():
            rep.emit("FAIL", f"Missing: data/{path.name}")
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as e:
            rep.emit("FAIL", f"Cannot read data/{path.name}", str(e))
            continue
        line_count = len(text.splitlines())
        if not text.strip():
            rep.emit("FAIL", f"Empty: data/{path.name}")
        else:
            rep.emit(
                "PASS",
                f"data/{path.name} non-empty",
                f"{line_count} lines",
            )

    if not dictionary.exists():
        return

    try:
        dict_text = dictionary.read_text(encoding="utf-8")
    except Exception:
        return

    dict_lines = dict_text.splitlines()
    blank = sum(1 for ln in dict_lines if not ln.strip())
    if blank == 0:
        rep.emit("INFO", "hebrew_dict.txt blank lines: 0")
    else:
        rep.emit(
            "WARN",
            f"hebrew_dict.txt blank lines: {blank}",
            "should be filtered before dictionary-based matching",
        )

    one_letter = sum(1 for ln in dict_lines if len(ln.strip()) == 1)
    if one_letter > 0:
        rep.emit(
            "WARN",
            f"hebrew_dict.txt one-letter entries: {one_letter}",
            "should be filtered before dictionary-based matching",
        )
    else:
        rep.emit("PASS", "hebrew_dict.txt has no one-letter entries")

    # Heuristic: count entries containing any character that is neither in the
    # Hebrew block (U+0590–U+05FF) nor whitespace.
    non_hebrew = 0
    for ln in dict_lines:
        stripped = ln.strip()
        if not stripped:
            continue
        if any(
            not (0x0590 <= ord(ch) <= 0x05FF or ch.isspace())
            for ch in stripped
        ):
            non_hebrew += 1

    if non_hebrew > 0:
        rep.emit(
            "WARN",
            f"hebrew_dict.txt entries with non-Hebrew chars: {non_hebrew}",
            "consider filtering during preprocessing",
        )
    else:
        rep.emit(
            "PASS",
            "hebrew_dict.txt: all non-blank entries are Hebrew/whitespace only",
        )

    rep.text("")
    rep.text("Note: data files were inspected read-only — neither file was modified.")


def agent_cli_checks(rep: Report) -> None:
    rep.header("Agent CLI checks")

    agents = [
        ("claude", ["claude", "--version"]),
        ("gemini", ["gemini", "--version"]),
        ("codex", ["codex", "--version"]),
    ]
    for name, version_cmd in agents:
        path = shutil.which(name)
        if not path:
            rep.emit(
                "WARN",
                f"{name} not found in PATH",
                "install + log in manually before multi-agent tests",
            )
            continue
        rep.emit("PASS", f"{name} found in PATH", path)
        rc, out, err = run_cmd(version_cmd, timeout=10.0)
        if rc == 0:
            version_line = first_line(out) or first_line(err) or "(no output)"
            rep.emit("INFO", f"{name} --version", version_line)
        elif rc == -1:
            rep.emit("WARN", f"{name} --version failed to run", err.strip())
        else:
            detail = first_line(err) or first_line(out) or f"exit {rc}"
            rep.emit("WARN", f"{name} --version exited {rc}", detail[:200])

    if shutil.which("codex"):
        rc, out, err = run_cmd(["codex", "login", "status"], timeout=10.0)
        if rc == 0:
            rep.emit(
                "INFO",
                "codex login status",
                first_line(out) or first_line(err) or "(empty)",
            )
        else:
            detail = first_line(err) or first_line(out) or f"exit {rc}"
            rep.emit(
                "WARN",
                "codex login status not available or failed",
                detail[:200],
            )

    rep.text("")
    rep.text(
        "Notes: only binary availability + --version was checked for claude / "
        "gemini / codex.\nNo interactive sessions, no prompts, no logins were "
        "performed by this script.\nFor claude and gemini, no safe non-"
        "interactive login-status command is invoked here."
    )


def metaswarm_checks(rep: Report) -> None:
    rep.header("Metaswarm readiness checks")

    for tool in ("npx", "node", "gh"):
        path = shutil.which(tool)
        if path:
            rep.emit("PASS", f"{tool} available", path)
        else:
            rep.emit("WARN", f"{tool} not found in PATH")

    metaswarm = shutil.which("metaswarm")
    if metaswarm:
        rep.emit("PASS", "metaswarm command found in PATH", metaswarm)
    else:
        rep.emit(
            "INFO",
            "metaswarm not in PATH",
            "may still be invocable via npx — not exercised by this script",
        )

    rep.text("")
    rep.text(
        "Note: this script does NOT initialize, install, or invoke metaswarm.\n"
        "That step is intentionally left for explicit manual or orchestrated action."
    )


def write_report(repo_root: Path, rep: Report) -> Path:
    runs_dir = repo_root / ".ai" / "validation-runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = runs_dir / f"agent_setup_validation_{ts}.txt"
    out_path.write_text("\n".join(rep.lines) + "\n", encoding="utf-8")
    return out_path


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    rep = Report()

    rep.text("metaswarm-hebrew-anagram-poc — agent setup validation")
    rep.text(f"Run at: {datetime.datetime.now().isoformat(timespec='seconds')}")

    repo_checks(rep, repo_root)
    python_checks(rep, repo_root)
    smoke_checks(rep)
    data_checks(rep, repo_root)
    agent_cli_checks(rep)
    metaswarm_checks(rep)

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
    rep.text("Next recommended manual steps:")
    rep.text("  1. Review this validation report.")
    rep.text(
        "  2. If agent CLIs are missing or not logged in, install + log in manually."
    )
    rep.text(
        "  3. Have Codex CLI and Gemini CLI separately inspect this repo "
        "(read-only, no code changes)."
    )
    rep.text("  4. Only after that, initialize or install metaswarm.")

    out_path = write_report(repo_root, rep)
    rep.text("")
    rep.text(f"Report written to: {out_path}")

    return 1 if counts["FAIL"] > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
