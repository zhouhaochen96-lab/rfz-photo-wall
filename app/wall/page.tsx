"use client"

import { useEffect, useState } from "react"
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

export default function WallPage() {
  const router = useRouter()
  const [wall, setWall] = useState<CurrentWall | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [activePersonId, setActivePersonId] = useState<number | null>(null)

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
      .order("id")

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
      .order("id", { ascending: false })

    if (error) {
      console.log(error)
      return
    }

    setPhotos((data as Photo[]) || [])
  }

  const deletePhoto = async (photo: Photo) => {
    if (!confirm("确定删除这张照片吗？")) return

    await supabase.from("photo_persons").delete().eq("photo_id", photo.id)
    await supabase.from("photos").delete().eq("id", photo.id)

    fetchPhotos()
  }

  const filteredPhotos = activePersonId
    ? photos.filter((p) => p.photo_persons?.some((r) => r.person_id === activePersonId))
    : photos

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>照片墙模式</h1>
        <p>当前照片墙：{wall?.name || "未选择"}。鼠标悬浮可以放大查看详情。</p>
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

      <section className="photo-wall-grid">
        {filteredPhotos.map((photo) => {
          const personNames =
            photo.photo_persons
              ?.map((r) => r.persons?.name)
              .filter(Boolean)
              .join(" · ") || "未标记人物"

          return (
            <div key={photo.id} className="photo-wall-card">
              <img src={photo.image_url} alt="" />

              <div className="photo-wall-overlay">
                <h3>{photo.title || "未命名照片"}</h3>
                <p>{personNames}</p>
                <p>{photo.shot_month || "未填写时间"}</p>
                <div className="card-actions">
                  <button className="secondary-btn" onClick={() => setEditingPhoto(photo)}>
                    编辑
                  </button>
                  <button className="danger-btn" onClick={() => deletePhoto(photo)}>
                    删除
                  </button>
                </div>
              </div>
            </div>
          )
        })}
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