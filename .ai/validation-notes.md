# Validation notes — what we are testing with this POC

## Purpose

This project is a controlled environment for validating that a **metaswarm / multi-agent coding workflow** operates correctly end-to-end. The Hebrew anagram problem is a vehicle; the real subject under test is the agent tooling.

## Dimensions to validate

### 1. CLI access
- Can each agent CLI (Claude Code, Gemini CLI, Codex CLI) be invoked from a local terminal?
- Does the CLI respect the current working directory and project structure?

### 2. Login / session behavior
- Does Enterprise-account authentication (Anthropic, Google, OpenAI) work without browser pop-ups mid-session?
- Are credentials cached across sessions, or does each invocation require re-auth?
- Does the agent pick up the correct account when multiple accounts are configured on the machine?

### 3. Local execution
- Can the agent run `pytest` locally and read the output?
- Can it create, read, and modify files within the project directory?
- Does it respect `.gitignore` and not leak credentials into tracked files?

### 4. Tests
- Does the agent run the full test suite before reporting completion?
- Does it correctly interpret test failures and produce fixes rather than just suppressing failures?

### 5. Git workflow
- Can the agent perform `git init`, `git add`, `git commit` with meaningful commit messages?
- Does it avoid force-pushing or destructive operations unless explicitly asked?
- Does it use the correct git identity (personal vs. Wix)?

### 6. metaswarm compatibility
- Can a second agent (different CLI tool) clone the repo, run `pytest`, and make a passing change?
- Does `AGENTS.md` give enough context for a cold-start agent to proceed without additional prompting?
- Can the orchestrator (metaswarm) hand off a sub-task to a worker agent and receive a usable result?

## Suggested validation sequence

1. `git init` the repo (not done yet — intentionally left for agent workflow test).
2. Run `pytest` from a fresh venv and confirm all tests pass.
3. Make a small, well-defined change (e.g., add `score_word` letter weighting) using a second agent CLI.
4. Verify the second agent runs the test suite, commits, and the change is reviewable.
5. Introduce a metaswarm orchestration layer to coordinate a two-agent task split.

## Future task: dictionary-based matching with `hebrew_dict.txt`

A larger Hebrew dictionary file (`data/hebrew_dict.txt`, ~10,000 entries, ~111 KB) has been added to the repo. It is **not currently integrated** into the matcher — it is staged for a future metaswarm validation task in which one or more agents implement dictionary-based anagram lookup (e.g. "given a rack, find all dictionary words that can be formed").

This is a good metaswarm test case because it requires:
- A worker agent to implement preprocessing and the lookup function.
- A reviewer agent to check correctness, performance, and Hebrew Unicode handling.
- A validator agent to run the test suite and confirm no regressions in existing modules.

### Required preprocessing before use

`hebrew_dict.txt` is raw input and should not be fed to `can_form_word` directly. At minimum, the following preprocessing steps should be applied:

- **Filter out one-letter entries** — they produce trivial matches against almost any rack and are noise for the anagram task. (Inspection shows the file currently contains 6 such single-character lines.)
- Strip blank lines and comments (if any).
- Drop entries containing non-Hebrew characters or numerals (unless intentionally supporting them).
- Apply consistent normalization: niqqud removal, and an explicit decision on final-letter handling that matches whatever the lookup function expects.
- Deduplicate after normalization.

Document the chosen preprocessing policy in code or in a follow-up note in this file when the task is taken on.

## Known assumptions / open questions

- NFC vs. NFD: Hebrew text is assumed to arrive in NFC form. If an agent produces NFD output, niqqud stripping may behave unexpectedly.
- The `?` wildcard character was chosen because it is visually obvious; if a use case requires `?` as a literal character, the wildcard must be changed.
- Scoring is intentionally trivial to keep the test surface small during this phase.
