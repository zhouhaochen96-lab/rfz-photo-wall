export type CurrentWall = {
  id: number
  name: string
}

const STORAGE_KEY = "rfz_current_wall"

export function getCurrentWall(): CurrentWall | null {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setCurrentWall(wall: CurrentWall) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wall))
}

export function clearCurrentWall() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}