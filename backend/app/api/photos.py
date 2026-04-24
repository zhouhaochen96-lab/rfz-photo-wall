from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError

from app.schemas.common import ApiResponse
from app.schemas.photo import Photo, UpdatePhotoRequest, UploadPhotosRequest
from app.services.photos import (
    IncomingUploadFile,
    PhotoNotFoundError,
    delete_photo,
    list_photos,
    update_photo,
    upload_photos,
)

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.get("", response_model=ApiResponse[list[Photo]])
def get_photos(
    view: Annotated[Literal["timeline", "wall"], Query()] = "timeline",
) -> ApiResponse[list[Photo]]:
    return ApiResponse(data=list_photos(view))


@router.patch("/{photo_id}", response_model=ApiResponse[Photo])
def patch_photo(photo_id: int, payload: UpdatePhotoRequest) -> ApiResponse[Photo]:
    try:
        photo = update_photo(photo_id, payload)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return ApiResponse(data=photo, message="照片更新成功")


@router.delete("/{photo_id}", response_model=ApiResponse[dict[str, int]])
def remove_photo(photo_id: int) -> ApiResponse[dict[str, int]]:
    try:
        delete_photo(photo_id)
    except PhotoNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return ApiResponse(data={"id": photo_id}, message="照片删除成功")


@router.post("/upload", response_model=ApiResponse[list[Photo]], status_code=status.HTTP_201_CREATED)
async def post_upload(
    files: Annotated[list[UploadFile], File()],
    payload: Annotated[str, Form()],
) -> ApiResponse[list[Photo]]:
    try:
        parsed_payload = UploadPhotosRequest.model_validate_json(payload)
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error.errors(),
        ) from error

    incoming_files: list[IncomingUploadFile] = []
    for file in files:
        incoming_files.append(
            IncomingUploadFile(
                filename=file.filename or "upload.jpg",
                content_type=file.content_type or "application/octet-stream",
                content=await file.read(),
            )
        )

    try:
        photos = upload_photos(incoming_files, parsed_payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ApiResponse(data=photos, message="照片上传成功")
