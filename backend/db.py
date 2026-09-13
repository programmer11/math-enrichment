"""
Database connection setup.

Reads the connection string from the DATABASE_URL environment variable.
Defaults to a local Postgres instance for convenience in development --
override this in production (and always override it if you're not
running Postgres on localhost with the default dev credentials).

Uses the psycopg3 driver (`postgresql+psycopg://`), installed via the
`psycopg[binary]` package in requirements.txt.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://app_user:app_password@localhost:5432/math_assessment",
)

# pool_pre_ping avoids handing out dead connections after the DB restarts
# or an idle connection times out -- this matters even more on a
# scale-to-zero provider like Neon, where the compute node can suspend
# after a few minutes of inactivity and any pooled connection to it
# goes stale until the next request wakes it back up.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
