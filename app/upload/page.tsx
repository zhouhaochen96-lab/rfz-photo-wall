"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import exifr from "exifr"

type Person = {
  id: number
  name: string
}

type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
  title: string
  shotMonth: string
  selectedPersons: number[]
}
async function getPhotoMonth(file: File) {
  try {
    const exif = await exifr.parse(file)

    const date =
      exif?.DateTimeOriginal ||
      exif?.CreateDate ||
      exif?.ModifyDate

    if (date) {
      const d = new Date(date)

      if (!Number.isNaN(d.getTime())) {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, "0")
        return `${year}-${month}`
      }
    }

    // 兜底：EXIF 读不到时，用文件最后修改时间
    if (file.lastModified) {
      const d = new Date(file.lastModified)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  } catch (error) {
    console.log("读取照片 EXIF 失败:", error)

    if (file.lastModified) {
      const d = new Date(file.lastModified)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  }
}

export default function UploadPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [uploading, setUploading] = useState(false)

  const [defaultShotMonth, setDefaultShotMonth] = useState("")
  const [defaultSelectedPersons, setDefaultSelectedPersons] = useState<number[]>([])

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

  useEffect(() => {
    fetchPersons()

    return () => {
      pendingPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter((file) => file.type.startsWith("image/"))

    if (imageFiles.length === 0) {
      alert("请选择图片文件")
      return
    }

const newItems: PendingPhoto[] = []

for (const file of imageFiles) {
  const autoMonth = await getPhotoMonth(file)

  newItems.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    title: file.name.replace(/\.[^/.]+$/, ""),
    shotMonth: autoMonth || defaultShotMonth,
    selectedPersons: [...defaultSelectedPersons],
  })
}

setPendingPhotos((prev) => [...prev, ...newItems])
e.target.value = ""
  }

  const updatePendingField = (
    id: string,
    field: "title" | "shotMonth",
    value: string
  ) => {
    setPendingPhotos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const toggleDefaultPerson = (personId: number) => {
    setDefaultSelectedPersons((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    )
  }

  const togglePendingPerson = (photoId: string, personId: number) => {
    setPendingPhotos((prev) =>
      prev.map((item) => {
        if (item.id !== photoId) return item

        return {
          ...item,
          selectedPersons: item.selectedPersons.includes(personId)
            ? item.selectedPersons.filter((id) => id !== personId)
            : [...item.selectedPersons, personId],
        }
      })
    )
  }

  const applyDefaultMonthToAll = () => {
    setPendingPhotos((prev) =>
      prev.map((item) => ({
        ...item,
        shotMonth: defaultShotMonth,
      }))
    )
  }

  const applyDefaultPersonsToAll = () => {
    setPendingPhotos((prev) =>
      prev.map((item) => ({
        ...item,
        selectedPersons: [...defaultSelectedPersons],
      }))
    )
  }

  const applyDefaultsToAll = () => {
    setPendingPhotos((prev) =>
      prev.map((item) => ({
        ...item,
        shotMonth: defaultShotMonth,
        selectedPersons: [...defaultSelectedPersons],
      }))
    )
  }

  const removePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearAllPending = () => {
    pendingPhotos.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setPendingPhotos([])
  }

  const handleBatchUpload = async () => {
    if (pendingPhotos.length === 0) {
      alert("请先选择照片")
      return
    }

    try {
      setUploading(true)

      for (const item of pendingPhotos) {
        const fileExt = item.file.name.split(".").pop()
        const filePath = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, item.file)

        if (uploadError) {
          console.log("上传图片失败:", uploadError)
          alert(`上传失败：${item.file.name}`)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath)

        const { data: photoData, error: insertError } = await supabase
          .from("photos")
          .insert([
            {
              title: item.title.trim() || null,
              image_url: publicUrlData.publicUrl,
              shot_month: item.shotMonth || null,
            },
          ])
          .select()
          .single()

        if (insertError || !photoData) {
          console.log("写入 photos 表失败:", insertError)
          alert(`写入数据库失败：${item.file.name}`)
          return
        }

        const relations = item.selectedPersons.map((personId) => ({
          photo_id: photoData.id,
          person_id: personId,
        }))

        if (relations.length > 0) {
          const { error: relationError } = await supabase
            .from("photo_persons")
            .insert(relations)

          if (relationError) {
            console.log("写入人物关联失败:", relationError)
            alert(`人物关联失败：${item.file.name}`)
            return
          }
        }
      }

      alert("批量上传成功！")
      clearAllPending()
    } finally {
      setUploading(false)
    }
  }

  const defaultPersonNames = useMemo(() => {
    return persons
      .filter((person) => defaultSelectedPersons.includes(person.id))
      .map((person) => person.name)
  }, [persons, defaultSelectedPersons])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>上传照片</h1>
        <p>支持多图上传、批量套用默认月份和人物，也可以逐张微调。</p>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>选择照片</h2>
          <span className="badge">{pendingPhotos.length} 张待上传</span>
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          disabled={uploading}
        />

        <p className="helper-text">选择后不会立刻上传。系统会尝试自动读取照片拍摄月份，读不到时可手动选择。</p>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>批量默认设置</h2>
          <span className="badge">先套用默认值，再逐张微调</span>
        </div>

        <div className="form-block">
          <label className="form-label">默认拍摄月份</label>
          <div className="action-row">
            <input
              className="text-input month-input"
              type="month"
              value={defaultShotMonth}
              onChange={(e) => setDefaultShotMonth(e.target.value)}
              disabled={uploading}
            />
            <button
              className="secondary-btn"
              onClick={applyDefaultMonthToAll}
              disabled={uploading || pendingPhotos.length === 0}
            >
              应用月份到全部
            </button>
          </div>
        </div>

        <div className="form-block">
          <label className="form-label">默认人物</label>

          {persons.length === 0 ? (
            <p className="helper-text">暂无成员，请先到“成员管理”页面添加。</p>
          ) : (
            <div className="checkbox-wrap">
              {persons.map((person) => (
                <label key={person.id} className="checkbox-tag">
                  <input
                    type="checkbox"
                    checked={defaultSelectedPersons.includes(person.id)}
                    onChange={() => toggleDefaultPerson(person.id)}
                    disabled={uploading}
                  />
                  <span>{person.name}</span>
                </label>
              ))}
            </div>
          )}

          <p className="helper-text">
            默认已选：
            {defaultPersonNames.length > 0 ? defaultPersonNames.join("、") : "未选择"}
          </p>

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={applyDefaultPersonsToAll}
              disabled={uploading || pendingPhotos.length === 0}
            >
              应用人物到全部
            </button>

            <button
              className="primary-btn"
              onClick={applyDefaultsToAll}
              disabled={uploading || pendingPhotos.length === 0}
            >
              月份和人物一起应用到全部
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <div>
            <h2>上传预览</h2>
            <p className="helper-text">每张照片都可以单独设置标题、拍摄月份和人物。</p>
          </div>

          <div className="action-row">
            <button
              className="secondary-btn"
              onClick={clearAllPending}
              disabled={uploading || pendingPhotos.length === 0}
            >
              清空全部
            </button>

            <button
              className="primary-btn"
              onClick={handleBatchUpload}
              disabled={uploading || pendingPhotos.length === 0}
            >
              {uploading ? "上传中..." : "确认批量上传"}
            </button>
          </div>
        </div>

        {pendingPhotos.length === 0 ? (
          <p className="empty-text">还没有选择照片。</p>
        ) : (
          <div className="upload-grid">
            {pendingPhotos.map((item) => {
              const selectedPersonNames = persons
                .filter((person) => item.selectedPersons.includes(person.id))
                .map((person) => person.name)

              return (
                <div key={item.id} className="upload-card">
                  <img
                    src={item.previewUrl}
                    alt={item.title || "待上传照片"}
                    className="upload-preview"
                  />

                  <div className="form-block">
                    <label className="form-label">照片标题</label>
                    <input
                      className="text-input full-input"
                      value={item.title}
                      onChange={(e) =>
                        updatePendingField(item.id, "title", e.target.value)
                      }
                      placeholder="照片标题"
                      disabled={uploading}
                    />
                  </div>

                  <div className="form-block">
                    <label className="form-label">拍摄月份</label>
                    <input
                      className="text-input month-input"
                      type="month"
                      value={item.shotMonth}
                      onChange={(e) =>
                        updatePendingField(item.id, "shotMonth", e.target.value)
                      }
                      disabled={uploading}
                    />
                  </div>

                  <div className="form-block">
                    <label className="form-label">照片人物</label>

                    {persons.length === 0 ? (
                      <p className="helper-text">暂无成员。</p>
                    ) : (
                      <div className="checkbox-wrap">
                        {persons.map((person) => (
                          <label key={person.id} className="checkbox-tag">
                            <input
                              type="checkbox"
                              checked={item.selectedPersons.includes(person.id)}
                              onChange={() => togglePendingPerson(item.id, person.id)}
                              disabled={uploading}
                            />
                            <span>{person.name}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    <p className="helper-text">
                      已选：
                      {selectedPersonNames.length > 0
                        ? selectedPersonNames.join("、")
                        : "未选择"}
                    </p>
                  </div>

                  <button
                    className="danger-outline-btn"
                    onClick={() => removePendingPhoto(item.id)}
                    disabled={uploading}
                  >
                    移除这张
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}