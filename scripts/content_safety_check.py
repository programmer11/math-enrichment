#!/usr/bin/env python3
"""
Content-safety guard for the Math Proficiency Assessment.

Scans every file that can contain user-facing text (question bank,
character dialogue, and frontend UI copy) for:

  1. Profanity / crude language
  2. Violent or abusive language
  3. Discouraging / shaming language that isn't appropriate for kids
     (e.g. "you're bad at this", "you failed", "stupid")

This is a lightweight guard, not a full profanity-filter library. It's
meant to be re-run whenever a developer adds new questions, character
lines, or UI copy, to catch anything obviously inappropriate before it
ships. It is NOT a substitute for a human read-through of new content.

Usage:
    python3 scripts/content_safety_check.py

Exits 0 with a summary if nothing is found, exits 1 and prints every
match (file, line number, matched word, surrounding text) otherwise.
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Files/dirs that can contain user-facing copy. Add new content files
# here as the project grows (e.g. a new components/ file).
SCAN_TARGETS = [
    REPO_ROOT / "backend" / "seed_data.py",
    REPO_ROOT / "frontend" / "lib" / "characters.ts",
    REPO_ROOT / "frontend" / "pages",
    REPO_ROOT / "frontend" / "components",
]

# Deliberately excludes slurs -- this is a guard against common
# profanity, crude language, violence, and discouraging phrasing, not a
# hate-speech list. Extend with \b-wrapped word boundaries so partial
# matches inside unrelated words (e.g. "assessment", "class") don't
# trigger false positives.
BLOCKLIST = [
    r"damn", r"hell", r"crap", r"shit", r"fuck", r"bitch", r"ass",
    r"bastard", r"dick", r"suck[s]?", r"piss",
    # discouraging / shaming language -- not profanity, but not okay
    # for a kids' assessment either
    r"stupid", r"dumb", r"idiot", r"moron", r"pathetic", r"worthless",
    r"loser", r"lame", r"jerk", r"you failed", r"failure", r"bad at",
    r"can'?t do (this|math)", r"never good", r"not smart", r"hate this",
    # violence / abuse
    r"kill", r"die", r"dead", r"blood", r"gun", r"knife", r"weapon",
    r"violent", r"violence", r"threat(en)?", r"abuse", r"abusive",
    r"bully", r"bullying", r"torture",
    # body-shaming / appearance
    r"ugly", r"fat",
    # mature themes out of place in a kids' app
    r"sex(y)?", r"drug", r"alcohol", r"naked", r"nude",
]

BLOCKLIST_PATTERN = re.compile(
    r"\b(" + "|".join(BLOCKLIST) + r")\b", re.IGNORECASE
)

SCAN_EXTENSIONS = {".py", ".ts", ".tsx"}


def iter_files():
    for target in SCAN_TARGETS:
        if target.is_file():
            yield target
        elif target.is_dir():
            for path in sorted(target.rglob("*")):
                if path.is_file() and path.suffix in SCAN_EXTENSIONS:
                    yield path


def main() -> int:
    findings = []

    for path in iter_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for lineno, line in enumerate(text.splitlines(), start=1):
            for match in BLOCKLIST_PATTERN.finditer(line):
                findings.append(
                    {
                        "file": path.relative_to(REPO_ROOT),
                        "line": lineno,
                        "word": match.group(0),
                        "context": line.strip(),
                    }
                )

    if findings:
        print(f"FAILED: {len(findings)} potentially inappropriate match(es) found:\n")
        for f in findings:
            print(f'  {f["file"]}:{f["line"]}  matched "{f["word"]}"')
            print(f'    {f["context"]}')
        print(
            "\nReview each match above. If it's a false positive (e.g. a "
            "word embedded in a longer, unrelated word that the \\b "
            "boundary didn't catch), adjust the BLOCKLIST or the "
            "surrounding text as appropriate."
        )
        return 1

    files_scanned = sum(1 for _ in iter_files())
    print(f"PASSED: scanned {files_scanned} file(s), no matches found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
