#!/usr/bin/env python3
"""
Creates tables (if needed) and seeds the `questions` table from
seed_data.py, without booting the FastAPI app. Useful for deploy hooks,
CI, or just setting up a fresh local database before running `uvicorn`.

Also safe to run again later -- it no-ops if the table already has rows
(see repository.seed_questions_if_empty).

Usage (from the backend/ directory):
    python3 scripts/seed_db.py
"""

import os
import sys

# Allow running this script directly (python3 scripts/seed_db.py) by
# putting the backend/ directory -- the parent of this scripts/ folder
# -- on sys.path, so `import db`, `import models`, etc. resolve.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import repository
from db import Base, SessionLocal, engine


def main() -> None:
    print(f"Connecting to database...")
    Base.metadata.create_all(bind=engine)
    print("Tables ready.")

    db = SessionLocal()
    try:
        inserted = repository.seed_questions_if_empty(db)
        if inserted:
            print(f"Seeded {inserted} questions.")
        else:
            print("Questions table already has data -- nothing to seed.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
