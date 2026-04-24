"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { setCurrentWall } from "@/lib/currentWall"

type PhotoWall = {
  id: number
  name: string
  description: string | null
  code: string | null
}

export default function WallsPage() {
  const router = useRouter()
  const [walls, setWalls] = useState<PhotoWall[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [customCode, setCustomCode] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchWalls = async () => {
    const { data } = await supabase
      .from("photo_walls")
      .select("*")
      .order("id", { ascending: true })

    setWalls(data || [])
  }

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push("/login")
  }

  const createWall = async () => {
    const cleanName = name.trim()
    const cleanCode = customCode.trim().toUpperCase()

    if (!cleanName) {
      alert("请输入照片墙名称")
      return
    }

    if (!cleanCode) {
      alert("请输入照片墙编码")
      return
    }

    if (!/^[A-Z0-9_-]{4,20}$/.test(cleanCode)) {
      alert("编码只能包含大写字母、数字、下划线或短横线，长度 4-20 位")
      return
    }

    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      router.push("/login")
      return
    }

    const { data: wall, error } = await supabase
      .from("photo_walls")
      .insert([
        {
          name: cleanName,
          description: description.trim() || null,
          code: cleanCode,
          created_by: user.id,
        },
      ])
      .select()
      .single()

    setLoading(false)

    if (error || !wall) {
      alert("创建失败：编码可能已经被占用")
      console.log(error)
      return
    }

    await supabase.from("wall_members").insert([
      {
        wall_id: wall.id,
        user_id: user.id,
        role: "owner",
      },
    ])

    setName("")
    setDescription("")
    setCustomCode("")
    fetchWalls()
    alert(`创建成功，照片墙编码是：${cleanCode}`)
  }

  const enterByCode = async () => {
    const cleanCode = joinCode.trim().toUpperCase()

    if (!cleanCode) {
      alert("请输入照片墙编码")
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      router.push("/login")
      return
    }

    const { data: wall, error } = await supabase
      .from("photo_walls")
      .select("*")
      .eq("code", cleanCode)
      .single()

    if (error || !wall) {
      alert("没有找到这个编码对应的照片墙")
      return
    }

    await supabase.from("wall_members").upsert(
      [
        {
          wall_id: wall.id,
          user_id: user.id,
          role: "member",
        },
      ],
      {
        onConflict: "wall_id,user_id",
      }
    )

    setCurrentWall({ id: wall.id, name: wall.name })
    router.push("/timeline")
  }

  const enterWall = (wall: PhotoWall) => {
    setCurrentWall({ id: wall.id, name: wall.name })
    router.push("/timeline")
  }

  useEffect(() => {
    checkUser()
    fetchWalls()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>选择照片墙</h1>
        <p>通过照片墙编码加入已有照片墙，或创建新的照片墙。</p>
      </section>

      <section className="panel-card">
        <h2>通过编码进入照片墙</h2>
        <div className="inline-form">
          <input
            className="text-input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="输入照片墙编码，例如 RFZ2026"
          />
          <button className="primary-btn" onClick={enterByCode}>
            进入照片墙
          </button>
        </div>
      </section>

      <section className="panel-card">
        <h2>创建新的照片墙</h2>

        <div className="form-grid">
          <div className="form-block">
            <label className="form-label">照片墙名称</label>
            <input
              className="text-input full-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：RFZ高中照片墙"
            />
          </div>

          <div className="form-block">
            <label className="form-label">自定义编码</label>
            <input
              className="text-input full-input"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="例如：RFZ2026"
            />
            <p className="helper-text">朋友之后用这个编码加入照片墙。</p>
          </div>

          <div className="form-block">
            <label className="form-label">简介</label>
            <input
              className="text-input full-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个照片墙"
            />
          </div>

          <button className="primary-btn" onClick={createWall} disabled={loading}>
            {loading ? "创建中..." : "创建照片墙"}
          </button>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>已有照片墙</h2>
          <span className="badge">{walls.length} 个</span>
        </div>

        <div className="wall-grid">
          {walls.map((wall) => (
            <div key={wall.id} className="wall-card">
              <h3>{wall.name}</h3>
              <p>{wall.description || "暂无简介"}</p>
              <p className="helper-text">编码：{wall.code || "未设置"}</p>
              <button className="secondary-btn" onClick={() => enterWall(wall)}>
                进入
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}