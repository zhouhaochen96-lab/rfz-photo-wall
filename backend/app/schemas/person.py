from __future__ import annotations

from pydantic import BaseModel


class Person(BaseModel):
    id: int
    name: str


class CreatePersonRequest(BaseModel):
    name: str
