"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { setCurrentWall } from "@/lib/currentWall"

type PhotoWall = {
  id: number
  name: string
  description: string | null
}

export default function WallsPage() {
  const router = useRouter()
  const [walls, setWalls] = useState<PhotoWall[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
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

      const { data: wall, error } = await supabase
        .from("photo_walls")
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            created_by: user.id,
          },
        ])
        .select()
        .single()

      if (error || !wall) {
        console.log("创建照片墙失败:", error)
        alert("创建失败")
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
      alert("照片墙创建成功")
    } finally {
      setLoading(false)
    }
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
        <p>一个账号可以进入不同的照片墙，每个照片墙的数据相互独立。</p>
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
          <p className="empty-text">暂无照片墙，先创建一个吧。</p>
        ) : (
          <div className="wall-grid">
            {walls.map((wall) => (
              <div key={wall.id} className="wall-card">
                <h3>{wall.name}</h3>
                <p>{wall.description || "暂无简介"}</p>
                <button className="primary-btn" onClick={() => enterWall(wall)}>
                  进入照片墙
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}