from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.common import ApiResponse
from app.schemas.person import CreatePersonRequest, Person
from app.services.persons import PersonAlreadyExistsError, create_person, list_persons

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.get("", response_model=ApiResponse[list[Person]])
def get_persons() -> ApiResponse[list[Person]]:
    return ApiResponse(data=list_persons())


@router.post("", response_model=ApiResponse[Person], status_code=status.HTTP_201_CREATED)
def post_person(payload: CreatePersonRequest) -> ApiResponse[Person]:
    try:
        person = create_person(payload.name)
    except PersonAlreadyExistsError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ApiResponse(data=person, message="成员创建成功")
