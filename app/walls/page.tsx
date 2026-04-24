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

function makeWallCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function WallsPage() {
  const router = useRouter()
  const [walls, setWalls] = useState<PhotoWall[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push("/login")
  }

  const fetchWalls = async () => {
    const { data, error } = await supabase
      .from("photo_walls")
      .select("*")
      .order("id", { ascending: true })

    if (error) {
      console.log("获取照片墙失败:", error)
      return
    }

    setWalls(data || [])
  }

  const createWall = async () => {
    if (!name.trim()) {
      alert("请输入照片墙名称")
      return
    }

    try {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (!user) {
        router.push("/login")
        return
      }

      const code = makeWallCode()

      const { data: wall, error } = await supabase
        .from("photo_walls")
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            code,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (error || !wall) {
        console.log("创建照片墙失败:", error)
        alert("创建失败，可能编码重复，请再试一次")
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
      fetchWalls()
      alert(`照片墙创建成功，编码是：${code}`)
    } finally {
      setLoading(false)
    }
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

        {walls.length === 0 ? (
          <p className="empty-text">暂无照片墙。</p>
        ) : (
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
        )}
      </section>
    </div>
  )
}