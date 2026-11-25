#!/usr/bin/env python3
"""Verify the governance layer of the diPencil Panel repository.

Checks performed:
  1. Every required governance file and directory exists.
  2. Every relative Markdown link in governed documents resolves.
  3. Governed documentation is written in English (no Arabic, Hebrew or CJK text).
  4. Governed documents contain no em dash (U+2014), per CONSTITUTION.md Article XI.
  5. docs/tooling/skills.lock.json is valid, pins a commit for every skill and
     points at a directory that exists.

Usage:
    python docs/scripts/verify-project.py
    python docs/scripts/verify-project.py --verbose

Exit code 0 means every check passed. Exit code 1 means at least one failed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_FILES = [
    "README.md",
    "AGENTS.md",
    "CONSTITUTION.md",
    "docs/constitution.md",
    "docs/project-guide.md",
    "docs/architecture/modules.md",
    "docs/DESIGN_SYSTEM.md",
    "docs/ERD.md",
    "docs/workflow.md",
    "docs/tooling/skills.md",
    "docs/tooling/skills.lock.json",
    "docs/scripts/verify-project.py",
    "docs/scripts/check-ui-controls.py",
    "docs/tasks/README.md",
    "docs/context/README.md",
    "docs/design/README.md",
]

REQUIRED_DIRS = [
    "docs/architecture",
    "docs/design",
    "docs/scripts",
    "docs/context",
    "docs/tasks",
    "docs/tooling",
    ".agents/skills",
]

SKIP_DIR_NAMES = {
    ".git",
    ".next",
    ".agents",
    ".opencode",
    ".venv",
    "venv",
    "node_modules",
    "_archive",
    "build",
    "coverage",
    "dist",
    "out",
}

LINK_RE = re.compile(r"!?\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
REFERENCE_RE = re.compile(r"^\s*\[[^\]]+\]:\s*(\S+)")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
INLINE_CODE_RE = re.compile(r"`[^`]*`")

# Arabic, Hebrew and CJK blocks. Their presence in governed prose means the
# document is not English.
NON_ENGLISH_RE = re.compile(
    "["
    "\u0600-\u06ff"  # Arabic
    "\u0750-\u077f"  # Arabic supplement
    "\u08a0-\u08ff"  # Arabic extended-A
    "\ufb50-\ufdff"  # Arabic presentation forms-A
    "\ufe70-\ufeff"  # Arabic presentation forms-B
    "\u0590-\u05ff"  # Hebrew
    "\u3040-\u30ff"  # Japanese kana
    "\u4e00-\u9fff"  # CJK unified ideographs
    "\uac00-\ud7af"  # Hangul syllables
    "]"
)

EM_DASH = "\u2014"

SKIP_LINK_PREFIXES = (
    "http://",
    "https://",
    "mailto:",
    "tel:",
    "data:",
    "ftp://",
    "#",
)


class Reporter:
    """Collect pass and fail lines and print them consistently."""

    def __init__(self, verbose: bool) -> None:
        self.verbose = verbose
        self.failures = 0

    def section(self, title: str) -> None:
        print()
        print(f"== {title} ==")

    def ok(self, message: str) -> None:
        print(f"[PASS] {message}")

    def fail(self, message: str) -> None:
        self.failures += 1
        print(f"[FAIL] {message}")

    def info(self, message: str) -> None:
        if self.verbose:
            print(f"[INFO] {message}")


def is_skipped(path: Path) -> bool:
    return any(part in SKIP_DIR_NAMES for part in path.parts)


def governed_markdown_files() -> list[Path]:
    """Return root governance files plus every Markdown file under docs/."""
    files: list[Path] = []
    for name in ("README.md", "AGENTS.md", "CONSTITUTION.md"):
        candidate = ROOT / name
        if candidate.is_file():
            files.append(candidate)

    docs = ROOT / "docs"
    if docs.is_dir():
        for path in sorted(docs.rglob("*.md")):
            relative = path.relative_to(ROOT)
            if is_skipped(relative):
                continue
            files.append(path)
    return files


def check_required_paths(reporter: Reporter) -> None:
    reporter.section("Required files and directories")

    missing = 0
    for name in REQUIRED_FILES:
        if (ROOT / name).is_file():
            reporter.info(f"file present: {name}")
        else:
            reporter.fail(f"missing file: {name}")
            missing += 1
    if missing == 0:
        reporter.ok(f"all {len(REQUIRED_FILES)} required files present")

    missing_dirs = 0
    for name in REQUIRED_DIRS:
        if (ROOT / name).is_dir():
            reporter.info(f"directory present: {name}")
        else:
            reporter.fail(f"missing directory: {name}")
            missing_dirs += 1
    if missing_dirs == 0:
        reporter.ok(f"all {len(REQUIRED_DIRS)} required directories present")


def resolve_link(source: Path, raw_target: str) -> tuple[bool, str]:
    """Resolve a Markdown link target relative to its file."""
    target = raw_target.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1]
    target = unquote(target)
    target = target.split("#", 1)[0].split("?", 1)[0]
    if not target:
        return True, "anchor only"
    candidate = (source.parent / target).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        return False, f"escapes repository: {raw_target}"
    if candidate.exists():
        return True, str(candidate.relative_to(ROOT))
    return False, f"missing target: {raw_target}"


def check_links(reporter: Reporter, files: list[Path]) -> None:
    reporter.section("Markdown links")

    checked = 0
    broken = 0
    for path in files:
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            reporter.fail(f"not valid UTF-8: {path.relative_to(ROOT)}")
            broken += 1
            continue

        in_fence = False
        for line_number, line in enumerate(text.splitlines(), start=1):
            if FENCE_RE.match(line):
                in_fence = not in_fence
                continue
            if in_fence:
                continue

            targets = LINK_RE.findall(line)
            reference = REFERENCE_RE.match(line)
            if reference:
                targets.append(reference.group(1))

            for raw_target in targets:
                lowered = raw_target.lower()
                if lowered.startswith(SKIP_LINK_PREFIXES):
                    continue
                checked += 1
                resolved, detail = resolve_link(path, raw_target)
                if not resolved:
                    broken += 1
                    reporter.fail(f"{path.relative_to(ROOT)}:{line_number} -> {detail}")

    if broken == 0:
        reporter.ok(f"{checked} relative links resolved across {len(files)} documents")
    else:
        reporter.fail(f"{broken} broken link(s) out of {checked} checked")


def check_language(reporter: Reporter, files: list[Path]) -> None:
    reporter.section("Documentation language (English)")

    offenders = 0
    for path in files:
        text = path.read_text(encoding="utf-8")
        in_fence = False
        for line_number, line in enumerate(text.splitlines(), start=1):
            if FENCE_RE.match(line):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            prose = INLINE_CODE_RE.sub("", line)
            match = NON_ENGLISH_RE.search(prose)
            if match:
                offenders += 1
                reporter.fail(
                    f"{path.relative_to(ROOT)}:{line_number} contains non-English text "
                    f"({match.group(0)!r})"
                )

    if offenders == 0:
        reporter.ok(f"all {len(files)} governed documents are English")


def check_em_dash(reporter: Reporter, files: list[Path]) -> None:
    reporter.section("No em dash (Article XI)")

    offenders = 0
    for path in files:
        text = path.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if EM_DASH in line:
                offenders += 1
                reporter.fail(
                    f"{path.relative_to(ROOT)}:{line_number} contains U+2014"
                )

    if offenders == 0:
        reporter.ok(f"no em dash in {len(files)} governed documents")


def check_skills_lock(reporter: Reporter) -> None:
    reporter.section("Vendored skills lock")

    lock_path = ROOT / "docs/tooling/skills.lock.json"
    if not lock_path.is_file():
        reporter.fail("docs/tooling/skills.lock.json is missing")
        return

    try:
        payload = json.loads(lock_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        reporter.fail(f"skills.lock.json is not valid JSON: {error}")
        return

    skills = payload.get("skills")
    if not isinstance(skills, list) or not skills:
        reporter.fail("skills.lock.json has no skills array")
        return

    expected = {
        "21st-ai",
        "agent-skills",
        "rea",
        "ui-ux-pro-max",
        "security-audit",
    }
    found = {entry.get("name") for entry in skills if isinstance(entry, dict)}
    missing = expected - found
    if missing:
        reporter.fail(f"skills.lock.json is missing entries: {sorted(missing)}")

    problems = 0
    for entry in skills:
        if not isinstance(entry, dict):
            reporter.fail("skills.lock.json contains a non-object entry")
            problems += 1
            continue
        name = entry.get("name", "<unnamed>")
        relative = entry.get("path", "")
        commit = entry.get("commit", "")
        repository = entry.get("repository", "")
        skill_root = entry.get("skillRoot", "")

        if not relative or not (ROOT / relative).is_dir():
            reporter.fail(f"{name}: path does not exist ({relative!r})")
            problems += 1
            continue
        if not re.fullmatch(r"[0-9a-f]{40}", commit):
            reporter.fail(f"{name}: commit is not a 40-character SHA ({commit!r})")
            problems += 1
        if not repository.startswith("https://github.com/"):
            reporter.fail(f"{name}: repository is not a GitHub URL ({repository!r})")
            problems += 1
        if not skill_root or not (ROOT / skill_root).is_dir():
            reporter.fail(f"{name}: skillRoot does not exist ({skill_root!r})")
            problems += 1
            continue
        if not any((ROOT / skill_root).rglob("SKILL.md")):
            reporter.fail(f"{name}: no SKILL.md under {skill_root}")
            problems += 1

    if problems == 0:
        reporter.ok(f"{len(skills)} vendored skills present, pinned and discoverable")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify the diPencil Panel governance layer."
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="print every successful individual check",
    )
    args = parser.parse_args()

    reporter = Reporter(verbose=args.verbose)
    print("diPencil Panel - governance verification")
    print(f"repository: {ROOT}")

    files = governed_markdown_files()
    reporter.info(f"governed documents: {len(files)}")

    check_required_paths(reporter)
    check_links(reporter, files)
    check_language(reporter, files)
    check_em_dash(reporter, files)
    check_skills_lock(reporter)

    print()
    if reporter.failures == 0:
        print("RESULT: PASS")
        return 0
    print(f"RESULT: FAIL ({reporter.failures} problem(s))")
    return 1


if __name__ == "__main__":
    sys.exit(main())
