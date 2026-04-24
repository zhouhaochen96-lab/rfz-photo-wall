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

export default function WallPage() {
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

      await supabase.from("photo_persons").delete().eq("photo_id", photo.id)
      await supabase.from("photos").delete().eq("id", photo.id)

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

  useEffect(() => {
    fetchPersons()
    fetchPhotos()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>照片墙</h1>
        <p>平铺展示所有照片，鼠标悬浮可放大查看详情。</p>
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

      {filteredPhotos.length === 0 ? (
        <section className="panel-card">
          <p className="empty-text">暂无照片。</p>
        </section>
      ) : (
        <section className="photo-wall-grid">
          {filteredPhotos.map((photo) => {
            const personNames =
              photo.photo_persons
                ?.map((relation) => relation.persons?.name)
                .filter(Boolean)
                .join(" · ") || "未标记人物"

            return (
              <div key={photo.id} className="photo-wall-card">
                <img src={photo.image_url} alt={photo.title || "photo"} />

                <div className="photo-wall-overlay">
                  <h3>{photo.title || "未命名照片"}</h3>
                  <p>{personNames}</p>
                  <p>{photo.shot_month || "未填写时间"}</p>

                  <div className="card-actions">
                    <button className="secondary-btn" onClick={() => setEditingPhoto(photo)}>
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
        </section>
      )}

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