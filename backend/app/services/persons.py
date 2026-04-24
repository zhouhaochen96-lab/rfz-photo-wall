from __future__ import annotations

from app.schemas.person import Person
from app.services.supabase_client import get_supabase


class PersonAlreadyExistsError(ValueError):
    pass


def list_persons() -> list[Person]:
    response = (
        get_supabase().table("persons").select("id, name").order("id").execute()
    )
    rows = response.data or []
    return [Person.model_validate(row) for row in rows]


def create_person(name: str) -> Person:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("请输入成员名字")

    existing_response = (
        get_supabase()
        .table("persons")
        .select("id, name")
        .eq("name", clean_name)
        .limit(1)
        .execute()
    )

    if existing_response.data:
        raise PersonAlreadyExistsError("该成员已存在，不能重复添加")

    insert_response = (
        get_supabase()
        .table("persons")
        .insert({"name": clean_name})
        .execute()
    )
    rows = insert_response.data or []

    if not rows:
        raise RuntimeError("新增成员失败")

    return Person.model_validate(rows[0])
