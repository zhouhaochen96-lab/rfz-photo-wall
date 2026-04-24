from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlparse
from uuid import uuid4

from app.config import get_settings
from app.schemas.photo import Photo, PhotoPerson, UpdatePhotoRequest, UploadPhotosRequest
from app.services.supabase_client import get_supabase


@dataclass(frozen=True)
class IncomingUploadFile:
    filename: str
    content_type: str
    content: bytes


class PhotoNotFoundError(ValueError):
    pass


def _photo_select_query() -> str:
    return """
        id,
        title,
        image_url,
        shot_month,
        photo_persons (
            person_id,
            persons (
                id,
                name
            )
        )
    """


def _normalize_photo(row: dict) -> Photo:
    relations = row.get("photo_persons") or []
    persons: list[PhotoPerson] = []

    for relation in relations:
        person = relation.get("persons")
        if person:
            persons.append(PhotoPerson.model_validate(person))

    return Photo(
        id=row["id"],
        title=row.get("title"),
        image_url=row["image_url"],
        shot_month=row.get("shot_month"),
        persons=persons,
    )


def _unique_person_ids(person_ids: list[int]) -> list[int]:
    return list(dict.fromkeys(person_ids))


def _build_public_url(path: str) -> str:
    settings = get_settings()
    bucket = settings.supabase_bucket
    quoted_path = quote(path, safe="/")
    return f"{settings.supabase_url}/storage/v1/object/public/{bucket}/{quoted_path}"


def _extract_storage_path_from_public_url(image_url: str | None) -> str | None:
    if not image_url:
        return None

    settings = get_settings()
    marker = f"/storage/v1/object/public/{settings.supabase_bucket}/"
    parsed = urlparse(image_url)
    path = parsed.path

    if marker not in path:
        return None

    return path.split(marker, 1)[1]


def _fetch_photo_or_raise(photo_id: int) -> Photo:
    response = (
        get_supabase()
        .table("photos")
        .select(_photo_select_query())
        .eq("id", photo_id)
        .limit(1)
        .execute()
    )
    rows = response.data or []

    if not rows:
        raise PhotoNotFoundError("照片不存在")

    return _normalize_photo(rows[0])


def list_photos(view: str) -> list[Photo]:
    query = get_supabase().table("photos").select(_photo_select_query())

    if view == "wall":
        query = query.order("id", desc=True)
    else:
        query = query.order("shot_month", desc=True, nullsfirst=False).order(
            "id", desc=True
        )

    response = query.execute()
    rows = response.data or []
    return [_normalize_photo(row) for row in rows]


def update_photo(photo_id: int, payload: UpdatePhotoRequest) -> Photo:
    title = payload.title.strip() if payload.title else ""
    shot_month = payload.shot_month.strip() if payload.shot_month else ""
    person_ids = _unique_person_ids(payload.person_ids)

    update_response = (
        get_supabase()
        .table("photos")
        .update(
            {
                "title": title or None,
                "shot_month": shot_month or None,
            }
        )
        .eq("id", photo_id)
        .execute()
    )

    if not update_response.data:
        raise PhotoNotFoundError("照片不存在")

    (
        get_supabase()
        .table("photo_persons")
        .delete()
        .eq("photo_id", photo_id)
        .execute()
    )

    if person_ids:
        relations = [{"photo_id": photo_id, "person_id": person_id} for person_id in person_ids]
        get_supabase().table("photo_persons").insert(relations).execute()

    return _fetch_photo_or_raise(photo_id)


def delete_photo(photo_id: int) -> None:
    fetch_response = (
        get_supabase()
        .table("photos")
        .select("id, image_url")
        .eq("id", photo_id)
        .limit(1)
        .execute()
    )
    rows = fetch_response.data or []

    if not rows:
        raise PhotoNotFoundError("照片不存在")

    image_url = rows[0].get("image_url")
    storage_path = _extract_storage_path_from_public_url(image_url)

    (
        get_supabase()
        .table("photo_persons")
        .delete()
        .eq("photo_id", photo_id)
        .execute()
    )
    get_supabase().table("photos").delete().eq("id", photo_id).execute()

    if storage_path:
        get_supabase().storage.from_(get_settings().supabase_bucket).remove([storage_path])


def upload_photos(
    files: list[IncomingUploadFile], payload: UploadPhotosRequest
) -> list[Photo]:
    if len(files) != len(payload.items):
        raise ValueError("上传文件数量与元数据数量不一致")

    created_photos: list[Photo] = []
    bucket = get_settings().supabase_bucket

    for file, item in zip(files, payload.items, strict=True):
        if not file.content_type.startswith("image/"):
            raise ValueError(f"{file.filename} 不是图片文件")

        if not file.content:
            raise ValueError(f"{file.filename} 文件内容为空")

        file_extension = Path(file.filename).suffix or ".jpg"
        storage_path = f"{uuid4().hex}{file_extension.lower()}"
        title = item.title.strip() if item.title else ""
        shot_month = item.shot_month.strip() if item.shot_month else ""
        person_ids = _unique_person_ids(item.person_ids)
        uploaded_to_storage = False
        photo_id: int | None = None

        try:
            get_supabase().storage.from_(bucket).upload(
                path=storage_path,
                file=BytesIO(file.content),
                file_options={"content-type": file.content_type},
            )
            uploaded_to_storage = True

            insert_response = (
                get_supabase()
                .table("photos")
                .insert(
                    {
                        "title": title or None,
                        "image_url": _build_public_url(storage_path),
                        "shot_month": shot_month or None,
                    }
                )
                .execute()
            )
            rows = insert_response.data or []

            if not rows:
                raise RuntimeError(f"写入照片记录失败: {file.filename}")

            photo_id = rows[0]["id"]

            if person_ids:
                relations = [
                    {"photo_id": photo_id, "person_id": person_id}
                    for person_id in person_ids
                ]
                get_supabase().table("photo_persons").insert(relations).execute()

            created_photos.append(_fetch_photo_or_raise(photo_id))
        except Exception:
            if photo_id is not None:
                get_supabase().table("photo_persons").delete().eq(
                    "photo_id", photo_id
                ).execute()
                get_supabase().table("photos").delete().eq("id", photo_id).execute()

            if uploaded_to_storage:
                get_supabase().storage.from_(bucket).remove([storage_path])
            raise

    return created_photos
