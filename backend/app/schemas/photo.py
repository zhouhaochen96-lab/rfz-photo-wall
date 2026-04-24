from __future__ import annotations

from pydantic import BaseModel, Field


class PhotoPerson(BaseModel):
    id: int
    name: str


class Photo(BaseModel):
    id: int
    title: str | None = None
    image_url: str
    shot_month: str | None = None
    persons: list[PhotoPerson] = Field(default_factory=list)


class UpdatePhotoRequest(BaseModel):
    title: str | None = None
    shot_month: str | None = None
    person_ids: list[int] = Field(default_factory=list)


class UploadPhotoItem(BaseModel):
    title: str | None = None
    shot_month: str | None = None
    person_ids: list[int] = Field(default_factory=list)


class UploadPhotosRequest(BaseModel):
    items: list[UploadPhotoItem]
