export type Person = {
  id: number
  name: string
}

export type Photo = {
  id: number
  title: string | null
  image_url: string
  shot_month: string | null
  persons: Person[]
}

export type ApiResponse<T> = {
  data: T
  message?: string | null
}

export type UpdatePhotoPayload = {
  title: string | null
  shot_month: string | null
  person_ids: number[]
}

export type UploadPhotoPayload = {
  title: string | null
  shot_month: string | null
  person_ids: number[]
}
