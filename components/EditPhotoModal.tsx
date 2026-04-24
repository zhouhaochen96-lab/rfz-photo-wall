"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

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

export default function EditPhotoModal({
  open,
  photo,
  persons,
  onClose,
  onSaved,
}: {
  open: boolean
  photo: Photo | null
  persons: Person[]
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState("")
  const [shotMonth, setShotMonth] = useState("")
  const [selectedPersons, setSelectedPersons] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!photo) return
    setTitle(photo.title || "")
    setShotMonth(photo.shot_month || "")
    setSelectedPersons(photo.photo_persons?.map((item) => item.person_id) || [])
  }, [photo])

  const togglePerson = (id: number) => {
    setSelectedPersons((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  const selectedPersonNames = useMemo(() => {
    return persons
      .filter((person) => selectedPersons.includes(person.id))
      .map((person) => person.name)
  }, [persons, selectedPersons])

  const saveEdit = async () => {
    if (!photo) return

    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from("photos")
        .update({
          title: title.trim() || null,
          shot_month: shotMonth || null,
        })
        .eq("id", photo.id)

      if (updateError) {
        console.log("更新照片失败:", updateError)
        alert("更新照片失败，请查看控制台")
        return
      }

      const { error: deleteError } = await supabase
        .from("photo_persons")
        .delete()
        .eq("photo_id", photo.id)

      if (deleteError) {
        console.log("删除旧人物关系失败:", deleteError)
        alert("删除旧人物关系失败，请查看控制台")
        return
      }

      const relations = selectedPersons.map((personId) => ({
        photo_id: photo.id,
        person_id: personId,
      }))

      if (relations.length > 0) {
        const { error: insertError } = await supabase
          .from("photo_persons")
          .insert(relations)

        if (insertError) {
          console.log("写入新人物关系失败:", insertError)
          alert("写入新人物关系失败，请查看控制台")
          return
        }
      }

      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open || !photo) return null

  return (
    <div className="modal-mask">
      <div className="modal-panel">
        <div className="modal-header">
          <h2>编辑照片</h2>
          <button className="ghost-btn small-btn" onClick={onClose}>
            关闭
          </button>
        </div>

        <img src={photo.image_url} alt={photo.title || "photo"} className="modal-image" />

        <div className="form-block">
          <label className="form-label">照片标题</label>
          <input
            className="text-input full-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="修改照片标题"
          />
        </div>

        <div className="form-block">
          <label className="form-label">拍摄月份</label>
          <input
            className="text-input month-input"
            type="month"
            value={shotMonth}
            onChange={(e) => setShotMonth(e.target.value)}
          />
        </div>

        <div className="form-block">
          <label className="form-label">照片人物</label>
          <div className="checkbox-wrap">
            {persons.map((person) => (
              <label key={person.id} className="checkbox-tag">
                <input
                  type="checkbox"
                  checked={selectedPersons.includes(person.id)}
                  onChange={() => togglePerson(person.id)}
                />
                <span>{person.name}</span>
              </label>
            ))}
          </div>
          <p className="helper-text">
            已选：{selectedPersonNames.length > 0 ? selectedPersonNames.join("、") : "未选择"}
          </p>
        </div>

        <div className="modal-actions">
          <button className="primary-btn" onClick={saveEdit} disabled={saving}>
            {saving ? "保存中..." : "保存修改"}
          </button>
          <button className="secondary-btn" onClick={onClose} disabled={saving}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}