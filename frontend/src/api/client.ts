import type {
  ApiResponse,
  Person,
  Photo,
  UpdatePhotoPayload,
  UploadPhotoPayload,
} from "../types"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000"

type ErrorDetailItem = {
  msg?: string
  loc?: Array<string | number>
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "请求失败，请稍后再试"
  }

  const record = payload as Record<string, unknown>

  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message
  }

  if (Array.isArray(record.detail)) {
    const messages = record.detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null
        }

        const detailItem = item as ErrorDetailItem
        if (!detailItem.msg) {
          return null
        }

        const location = Array.isArray(detailItem.loc) ? detailItem.loc.join(".") : ""
        return location ? `${location}: ${detailItem.msg}` : detailItem.msg
      })
      .filter((message): message is string => Boolean(message))

    if (messages.length > 0) {
      return messages.join("\n")
    }
  }

  return "请求失败，请稍后再试"
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload))
  }

  return (payload as ApiResponse<T>).data
}

export function listPersons() {
  return request<Person[]>("/api/persons")
}

export function createPerson(name: string) {
  return request<Person>("/api/persons", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  })
}

export function listPhotos(view: "timeline" | "wall") {
  return request<Photo[]>(`/api/photos?view=${view}`)
}

export function updatePhoto(photoId: number, payload: UpdatePhotoPayload) {
  return request<Photo>(`/api/photos/${photoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
}

export function removePhoto(photoId: number) {
  return request<{ id: number }>(`/api/photos/${photoId}`, {
    method: "DELETE",
  })
}

export async function uploadPhotos(files: File[], items: UploadPhotoPayload[]) {
  const formData = new FormData()
  formData.append("payload", JSON.stringify({ items }))

  files.forEach((file) => {
    formData.append("files", file)
  })

  return request<Photo[]>("/api/photos/upload", {
    method: "POST",
    body: formData,
  })
}
