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

type GroupedPhotos = {
  year: string
  months: {
    month: string
    photos: Photo[]
  }[]
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

  useEffect(() => {
    fetchPersons()
    fetchPhotos()
  }, [])

  const filteredPhotos = useMemo(() => {
    if (!activePersonId) return photos

    return photos.filter((photo) =>
      photo.photo_persons?.some((relation) => relation.person_id === activePersonId)
    )
  }, [photos, activePersonId])

  const groupedPhotos = useMemo<GroupedPhotos[]>(() => {
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
          .map(([month, photos]) => ({
            month,
            photos,
          })),
      }))
  }, [filteredPhotos])

  const handleDeletePhoto = async (photo: Photo) => {
    const ok = window.confirm(
      `确定要删除这张照片吗？\n\n${photo.title || "未命名照片"}`
    )
    if (!ok) return

    try {
      setDeletingId(photo.id)

      const filePath = (() => {
        try {
          const url = new URL(photo.image_url)
          const marker = "/storage/v1/object/public/photos/"
          const index = url.pathname.indexOf(marker)
          if (index === -1) return null
          return decodeURIComponent(url.pathname.slice(index + marker.length))
        } catch {
          return null
        }
      })()

      const { error: deleteRelationsError } = await supabase
        .from("photo_persons")
        .delete()
        .eq("photo_id", photo.id)

      if (deleteRelationsError) {
        console.log("删除人物关系失败:", deleteRelationsError)
        alert("删除人物关系失败，请查看控制台")
        return
      }

      const { error: deletePhotoError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id)

      if (deletePhotoError) {
        console.log("删除 photos 失败:", deletePhotoError)
        alert("删除照片记录失败，请查看控制台")
        return
      }

      if (filePath) {
        const { error: storageDeleteError } = await supabase.storage
          .from("photos")
          .remove([filePath])

        if (storageDeleteError) {
          console.log("删除存储文件失败:", storageDeleteError)
        }
      }

      fetchPhotos()
      alert("照片已删除")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <h1>时间轴</h1>
          <p>按年份和月份回看你们的照片，也可以按成员筛选，随时补编辑旧照片信息。</p>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>按成员筛选</h2>
          <span className="badge">
            {activePersonId
              ? `当前：${persons.find((p) => p.id === activePersonId)?.name || "未知成员"}`
              : "当前：全部照片"}
          </span>
        </div>

        <div className="filter-row">
          <button
            className={activePersonId === null ? "filter-btn active" : "filter-btn"}
            onClick={() => setActivePersonId(null)}
          >
            查看全部
          </button>

          {persons.map((person) => {
            const active = activePersonId === person.id
            return (
              <button
                key={person.id}
                className={active ? "filter-btn active" : "filter-btn"}
                onClick={() => setActivePersonId(active ? null : person.id)}
              >
                {person.name}
              </button>
            )
          })}
        </div>
      </section>

      <section className="panel-card">
        <h2>时间轴照片墙</h2>

        {groupedPhotos.length === 0 ? (
          <p className="empty-text">
            {activePersonId ? "这个成员暂时还没有关联照片。" : "还没有照片，快去上传第一张吧。"}
          </p>
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
                          <img
                            src={photo.image_url}
                            alt={photo.title || "photo"}
                            className="photo-image"
                          />

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
                                onClick={() => handleDeletePhoto(photo)}
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