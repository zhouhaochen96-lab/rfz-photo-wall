from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _first_non_empty(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    supabase_bucket: str
    cors_origins: tuple[str, ...]


def _parse_cors_origins(raw_value: str | None) -> tuple[str, ...]:
    if not raw_value:
        return ("http://localhost:5173",)

    origins = [item.strip() for item in raw_value.split(",")]
    return tuple(origin for origin in origins if origin)


@lru_cache
def get_settings() -> Settings:
    supabase_url = _first_non_empty("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    supabase_service_role_key = _first_non_empty(
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )

    if not supabase_url:
        raise RuntimeError(
            "Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
        )

    if not supabase_service_role_key:
        raise RuntimeError(
            "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY"
        )

    return Settings(
        supabase_url=supabase_url,
        supabase_service_role_key=supabase_service_role_key,
        supabase_bucket=os.getenv("SUPABASE_BUCKET", "photos").strip() or "photos",
        cors_origins=_parse_cors_origins(os.getenv("BACKEND_CORS_ORIGINS")),
    )
