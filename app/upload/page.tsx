"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

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

export default function UploadPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [uploading, setUploading] = useState(false)

  // 批量默认设置
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
  }, [])

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const imageFiles = files.filter((file) => file.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      alert("请选择图片文件")
      return
    }

    const newItems: PendingPhoto[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""),
      shotMonth: defaultShotMonth,
      selectedPersons: [...defaultSelectedPersons],
    }))

    setPendingPhotos((prev) => [...prev, ...newItems])
    e.target.value = ""
  }

  const updatePendingField = (
    id: string,
    field: "title" | "shotMonth",
    value: string
  ) => {
    setPendingPhotos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const togglePendingPerson = (photoId: string, personId: number) => {
    setPendingPhotos((prev) =>
      prev.map((item) => {
        if (item.id !== photoId) return item

        const alreadySelected = item.selectedPersons.includes(personId)

        return {
          ...item,
          selectedPersons: alreadySelected
            ? item.selectedPersons.filter((id) => id !== personId)
            : [...item.selectedPersons, personId],
        }
      })
    )
  }

  const toggleDefaultPerson = (personId: number) => {
    setDefaultSelectedPersons((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
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

        const imageUrl = publicUrlData.publicUrl

        const { data: photoData, error: insertError } = await supabase
          .from("photos")
          .insert([
            {
              title: item.title.trim() || null,
              image_url: imageUrl,
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
          const { error: relError } = await supabase
            .from("photo_persons")
            .insert(relations)

          if (relError) {
            console.log("写入人物关联失败:", relError)
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
      .filter((p) => defaultSelectedPersons.includes(p.id))
      .map((p) => p.name)
  }, [persons, defaultSelectedPersons])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <h1>上传照片</h1>
          <p>支持一次选择多张照片，先批量套用默认月份和默认人物，再逐张微调后统一上传。</p>
        </div>
      </section>

      <section className="panel-card">
        <h2>选择照片</h2>
        <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>批量默认设置</h2>
          <span className="badge">先批量套用，再逐张修改</span>
        </div>

        <div className="form-grid">
          <div className="form-block">
            <label className="form-label">默认拍摄月份</label>
            <div className="action-row">
              <input
                className="text-input month-input"
                type="month"
                value={defaultShotMonth}
                onChange={(e) => setDefaultShotMonth(e.target.value)}
              />
              <button
                className="secondary-btn"
                onClick={applyDefaultMonthToAll}
                disabled={pendingPhotos.length === 0 || uploading}
              >
                应用月份到全部
              </button>
            </div>
          </div>

          <div className="form-block">
            <label className="form-label">默认人物</label>
            <div className="checkbox-wrap">
              {persons.map((person) => (
                <label key={person.id} className="checkbox-tag">
                  <input
                    type="checkbox"
                    checked={defaultSelectedPersons.includes(person.id)}
                    onChange={() => toggleDefaultPerson(person.id)}
                  />
                  <span>{person.name}</span>
                </label>
              ))}
            </div>

            <div className="helper-text">
              默认已选：
              {defaultPersonNames.length > 0 ? defaultPersonNames.join("、") : "未选择"}
            </div>

            <div className="action-row" style={{ marginTop: "10px" }}>
              <button
                className="secondary-btn"
                onClick={applyDefaultPersonsToAll}
                disabled={pendingPhotos.length === 0 || uploading}
              >
                应用人物到全部
              </button>
              <button
                className="primary-btn"
                onClick={applyDefaultsToAll}
                disabled={pendingPhotos.length === 0 || uploading}
              >
                月份和人物一起应用到全部
              </button>
            </div>
          </div>
        </div>
      </section>

      {pendingPhotos.length > 0 && (
        <section className="panel-card">
          <div className="section-title-row">
            <h2>上传预览</h2>
            <div className="action-row">
              <span className="badge">{pendingPhotos.length} 张待上传</span>
              <button
                className="secondary-btn"
                onClick={clearAllPending}
                disabled={uploading}
              >
                清空全部
              </button>
              <button
                className="primary-btn"
                onClick={handleBatchUpload}
                disabled={uploading}
              >
                {uploading ? "上传中..." : "确认批量上传"}
              </button>
            </div>
          </div>

          <div className="upload-grid">
            {pendingPhotos.map((item) => {
              const selectedPersonNames = persons
                .filter((p) => item.selectedPersons.includes(p.id))
                .map((p) => p.name)

              return (
                <div key={item.id} className="upload-card">
                  <img src={item.previewUrl} alt={item.title} className="upload-preview" />

                  <div className="form-block">
                    <label className="form-label">照片标题</label>
                    <input
                      className="text-input"
                      value={item.title}
                      onChange={(e) =>
                        updatePendingField(item.id, "title", e.target.value)
                      }
                      placeholder="照片标题"
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
                    />
                  </div>

                  <div className="form-block">
                    <label className="form-label">照片人物</label>
                    <div className="checkbox-wrap">
                      {persons.map((person) => (
                        <label key={person.id} className="checkbox-tag">
                          <input
                            type="checkbox"
                            checked={item.selectedPersons.includes(person.id)}
                            onChange={() => togglePendingPerson(item.id, person.id)}
                          />
                          <span>{person.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="helper-text">
                      已选：
                      {selectedPersonNames.length > 0
                        ? selectedPersonNames.join("、")
                        : "未选择"}
                    </div>
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
        </section>
      )}
    </div>
  )
}