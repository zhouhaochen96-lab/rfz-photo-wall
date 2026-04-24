"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import EditPhotoModal from "@/components/EditPhotoModal"

type Person = {
  id: number
  name: string
}

type PhotoPersonRelation = {
  person_id: number
  persons: {
    id: number
    name: string
  } | null
}

type Photo = {
  id: number
  title: string | null
  image_url: string
  shot_month?: string | null
  photo_persons?: PhotoPersonRelation[]
}

export default function TimelinePage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activePersonId, setActivePersonId] = useState<number | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchPersons = async () => {
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      console.log("获取成员失败:", error)
      return
    }

    setPersons(data || [])
  }

  const fetchPhotos = async () => {
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
      .order("shot_month", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })

    if (error) {
      console.log("获取照片失败:", error)
      return
    }

    setPhotos((data as Photo[]) || [])
  }

  const deletePhoto = async (photo: Photo) => {
    const ok = confirm(`确定删除这张照片吗？\n\n${photo.title || "未命名照片"}`)
    if (!ok) return

    try {
      setDeletingId(photo.id)

      const { error: relationError } = await supabase
        .from("photo_persons")
        .delete()
        .eq("photo_id", photo.id)

      if (relationError) {
        console.log("删除人物关系失败:", relationError)
        alert("删除人物关系失败")
        return
      }

      const { error: photoError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id)

      if (photoError) {
        console.log("删除照片记录失败:", photoError)
        alert("删除照片记录失败")
        return
      }

      fetchPhotos()
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPhotos = useMemo(() => {
    if (!activePersonId) return photos

    return photos.filter((photo) =>
      photo.photo_persons?.some((relation) => relation.person_id === activePersonId)
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
    fetchPersons()
    fetchPhotos()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>时间轴</h1>
        <p>按年份和月份回看高中毕业以来的共同回忆。</p>
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

          {persons.map((person) => (
            <button
              key={person.id}
              className={activePersonId === person.id ? "filter-btn active" : "filter-btn"}
              onClick={() =>
                setActivePersonId(activePersonId === person.id ? null : person.id)
              }
            >
              {person.name}
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
                          ?.map((relation) => relation.persons?.name)
                          .filter(Boolean)
                          .join(" · ") || "未标记人物"

                      return (
                        <div key={photo.id} className="photo-card">
                          <img src={photo.image_url} alt="" className="photo-image" />

                          <div className="photo-card-body">
                            <div className="photo-title">
                              {photo.title || "未命名照片"}
                            </div>
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
                              <button
                                className="danger-btn"
                                onClick={() => deletePhoto(photo)}
                                disabled={deletingId === photo.id}
                              >
                                {deletingId === photo.id ? "删除中..." : "删除"}
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
        onSaved={fetchPhotos}
      />
    </div>
  )
}