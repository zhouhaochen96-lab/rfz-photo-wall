"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getCurrentWall, type CurrentWall } from "@/lib/currentWall"
import EditPhotoModal from "@/components/EditPhotoModal"

type Person = { id: number; name: string }
type PhotoPersonRelation = {
  person_id: number
  persons: { id: number; name: string } | null
}
type Photo = {
  id: number
  title: string | null
  image_url: string
  shot_month?: string | null
  photo_persons?: PhotoPersonRelation[]
}

export default function TimelinePage() {
  const router = useRouter()
  const [wall, setWall] = useState<CurrentWall | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activePersonId, setActivePersonId] = useState<number | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)

  const init = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) return router.push("/login")

    const current = getCurrentWall()
    if (!current) return router.push("/walls")

    setWall(current)
    fetchPersons(current.id)
    fetchPhotos(current.id)
  }

  const fetchPersons = async (wallId: number) => {
    const { data } = await supabase
      .from("persons")
      .select("*")
      .eq("wall_id", wallId)
      .order("id", { ascending: true })

    setPersons(data || [])
  }

  const fetchPhotos = async (wallId?: number) => {
    const targetWallId = wallId || wall?.id
    if (!targetWallId) return

    const { data, error } = await supabase
      .from("photos")
      .select(`
        *,
        photo_persons (
          person_id,
          persons (
            id,
            name
          )
        )
      `)
      .eq("wall_id", targetWallId)
      .order("shot_month", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setPhotos((data as Photo[]) || [])
  }

  const filteredPhotos = useMemo(() => {
    if (!activePersonId) return photos
    return photos.filter((p) =>
      p.photo_persons?.some((r) => r.person_id === activePersonId)
    )
  }, [photos, activePersonId])

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Record<string, Photo[]>> = {}

    filteredPhotos.forEach((photo) => {
      const month = photo.shot_month || "未填写时间"
      const year = month !== "未填写时间" ? month.split("-")[0] : "未填写时间"
      if (!groups[year]) groups[year] = {}
      if (!groups[year][month]) groups[year][month] = []
      groups[year][month].push(photo)
    })

    return Object.entries(groups)
      .sort((a, b) => {
        if (a[0] === "未填写时间") return 1
        if (b[0] === "未填写时间") return -1
        return Number(b[0]) - Number(a[0])
      })
      .map(([year, months]) => ({
        year,
        months: Object.entries(months)
          .sort((a, b) => {
            if (a[0] === "未填写时间") return 1
            if (b[0] === "未填写时间") return -1
            return b[0].localeCompare(a[0])
          })
          .map(([month, photos]) => ({ month, photos })),
      }))
  }, [filteredPhotos])

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>时间轴</h1>
        <p>当前照片墙：{wall?.name || "未选择"}</p>
      </section>

      <section className="panel-card">
        <h2>按成员筛选</h2>
        <div className="filter-row">
          <button
            className={activePersonId === null ? "filter-btn active" : "filter-btn"}
            onClick={() => setActivePersonId(null)}
          >
            全部
          </button>
          {persons.map((p) => (
            <button
              key={p.id}
              className={activePersonId === p.id ? "filter-btn active" : "filter-btn"}
              onClick={() => setActivePersonId(activePersonId === p.id ? null : p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <h2>时间轴照片墙</h2>

        {groupedPhotos.length === 0 ? (
          <p className="empty-text">暂无照片。</p>
        ) : (
          groupedPhotos.map((yearGroup) => (
            <div key={yearGroup.year} className="year-block">
              <div className="year-title">{yearGroup.year}</div>

              {yearGroup.months.map((monthGroup) => (
                <div key={monthGroup.month} className="month-block">
                  <div className="month-title">{monthGroup.month}</div>

                  <div className="timeline-grid">
                    {monthGroup.photos.map((photo) => {
                      const personNames =
                        photo.photo_persons
                          ?.map((r) => r.persons?.name)
                          .filter(Boolean)
                          .join(" · ") || "未标记人物"

                      return (
                        <div key={photo.id} className="photo-card">
                          <img src={photo.image_url} alt="" className="photo-image" />
                          <div className="photo-card-body">
                            <div className="photo-title">{photo.title || "未命名照片"}</div>
                            <div className="photo-meta">{personNames}</div>
                            <div className="photo-submeta">
                              {photo.shot_month || "未填写时间"}
                            </div>
                            <div className="card-actions">
                              <button
                                className="secondary-btn"
                                onClick={() => setEditingPhoto(photo)}
                              >
                                编辑
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      <EditPhotoModal
        open={!!editingPhoto}
        photo={editingPhoto}
        persons={persons}
        onClose={() => setEditingPhoto(null)}
        onSaved={() => fetchPhotos()}
      />
    </div>
  )
}