#!/usr/bin/env python3
"""Detect UI that bypasses the design-system controls contract.

The contract lives in docs/DESIGN_SYSTEM.md. This script reports the drift that
can be detected statically:

  native-select       a raw <select> element
  native-date-input   <input> or <Input> with type date, time, datetime-local,
                      month, week or color
  raw-textarea        a raw <textarea> outside components/ui
  hardcoded-hex       a hex colour literal in a TSX file

Usage:
    python docs/scripts/check-ui-controls.py
    python docs/scripts/check-ui-controls.py app/dashboard/clients
    python docs/scripts/check-ui-controls.py --strict
    python docs/scripts/check-ui-controls.py --json

Default mode is advisory: findings are reported and the exit code is 0, because
the repository carries known legacy debt. With --strict the exit code is 1 when
any finding exists. Use --strict on the files you are changing.

Invoice and email templates may need exact print colours. Hex findings in files
whose path contains "invoice" or "email" are reported as exempt.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SKIP_DIR_NAMES = {
    ".git",
    ".next",
    ".agents",
    ".opencode",
    "node_modules",
    "_archive",
    "build",
    "coverage",
    "dist",
    "out",
}

RULES = {
    "native-select": re.compile(r"<select\b"),
    "native-date-input": re.compile(
        r"<(?:input|Input)\b[^>]*\btype=[\"'](?:date|time|datetime-local|month|week|color)[\"']"
    ),
    "raw-textarea": re.compile(r"<textarea\b"),
    "hardcoded-hex": re.compile(r"(?<!&)#[0-9a-fA-F]{6}\b|(?<!&)#[0-9a-fA-F]{3}\b"),
}

HEX_EXEMPT_HINTS = ("invoice", "email")


def is_skipped(path: Path) -> bool:
    return any(part in SKIP_DIR_NAMES for part in path.parts)


def collect_files(targets: list[str], include_ui: bool) -> list[Path]:
    files: list[Path] = []
    for target in targets:
        base = (ROOT / target).resolve()
        if not base.exists():
            continue
        if base.is_file():
            candidates = [base]
        else:
            candidates = sorted(base.rglob("*.tsx")) + sorted(base.rglob("*.jsx"))
        for path in candidates:
            relative = path.relative_to(ROOT)
            if is_skipped(relative):
                continue
            normalized = relative.as_posix()
            if not include_ui and normalized.startswith("components/ui/"):
                continue
            files.append(path)
    return files


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def scan_file(path: Path) -> tuple[list[dict], int]:
    text = path.read_text(encoding="utf-8")
    relative = path.relative_to(ROOT).as_posix()
    findings: list[dict] = []
    exempt_hex = 0

    for rule, pattern in RULES.items():
        for match in pattern.finditer(text):
            line = line_of(text, match.start())
            snippet = text.splitlines()[line - 1].strip()
            if len(snippet) > 160:
                snippet = snippet[:157] + "..."
            if rule == "hardcoded-hex" and any(
                hint in relative.lower() for hint in HEX_EXEMPT_HINTS
            ):
                exempt_hex += 1
                continue
            findings.append(
                {
                    "file": relative,
                    "line": line,
                    "rule": rule,
                    "snippet": snippet,
                }
            )

    return findings, exempt_hex


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Report UI controls that bypass the design system."
    )
    parser.add_argument(
        "targets",
        nargs="*",
        default=["app", "components"],
        help="files or directories to scan (default: app components)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="exit 1 when any finding exists",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="print machine-readable JSON",
    )
    parser.add_argument(
        "--include-ui",
        action="store_true",
        help="also scan components/ui primitives",
    )
    args = parser.parse_args()

    files = collect_files(args.targets, args.include_ui)
    all_findings: list[dict] = []
    exempt_hex = 0
    for path in files:
        findings, exempt = scan_file(path)
        all_findings.extend(findings)
        exempt_hex += exempt

    by_rule: dict[str, int] = {}
    for finding in all_findings:
        by_rule[finding["rule"]] = by_rule.get(finding["rule"], 0) + 1

    if args.json:
        print(
            json.dumps(
                {
                    "filesScanned": len(files),
                    "totalFindings": len(all_findings),
                    "byRule": by_rule,
                    "exemptHex": exempt_hex,
                    "findings": all_findings,
                },
                indent=2,
            )
        )
        return 1 if args.strict and all_findings else 0

    print("diPencil Panel - UI controls check")
    print(f"files scanned: {len(files)}")
    print()
    for finding in all_findings:
        print(
            f"{finding['file']}:{finding['line']} "
            f"[{finding['rule']}] {finding['snippet']}"
        )

    if all_findings:
        print()
    for rule in sorted(by_rule):
        print(f"{rule}: {by_rule[rule]}")
    print(f"total findings: {len(all_findings)}")
    if exempt_hex:
        print(f"exempt invoice/email hex values: {exempt_hex}")

    if not all_findings:
        print()
        print("RESULT: PASS (no drift found)")
        return 0

    if args.strict:
        print()
        print("RESULT: FAIL (strict mode)")
        return 1

    print()
    print("RESULT: ADVISORY (findings reported, exit 0; use --strict to fail)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
