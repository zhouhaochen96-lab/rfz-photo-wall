"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getCurrentWall, type CurrentWall } from "@/lib/currentWall"

type Person = {
  id: number
  name: string
  wall_id: number
}

export default function MembersPage() {
  const router = useRouter()
  const [wall, setWall] = useState<CurrentWall | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const init = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }

    const current = getCurrentWall()
    if (!current) {
      router.push("/walls")
      return
    }

    setWall(current)
    fetchPersons(current.id)
  }

  const fetchPersons = async (wallId: number) => {
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .eq("wall_id", wallId)
      .order("id", { ascending: true })

    if (error) {
      console.log(error)
      return
    }

    setPersons(data || [])
  }

  const addPerson = async () => {
    if (!wall) return

    const cleanName = name.trim()
    if (!cleanName) return

    const exists = persons.some((p) => p.name.trim() === cleanName)
    if (exists) {
      alert("该成员已存在，不能重复添加")
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase
        .from("persons")
        .insert([{ name: cleanName, wall_id: wall.id }])

      if (error) {
        if (error.code === "23505") {
          alert("该成员已存在，不能重复添加")
        } else {
          console.log(error)
          alert("新增成员失败")
        }
        return
      }

      setName("")
      fetchPersons(wall.id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <h1>成员管理</h1>
        <p>当前照片墙：{wall?.name || "未选择"}</p>
      </section>

      <section className="panel-card">
        <h2>新增成员</h2>
        <div className="inline-form">
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入成员名字"
          />
          <button className="primary-btn" onClick={addPerson} disabled={loading}>
            {loading ? "添加中..." : "新增成员"}
          </button>
        </div>
      </section>

      <section className="panel-card">
        <div className="section-title-row">
          <h2>成员列表</h2>
          <span className="badge">{persons.length} 人</span>
        </div>

        <div className="member-grid">
          {persons.map((p) => (
            <div key={p.id} className="member-card">
              <div className="member-avatar">{p.name.slice(0, 1)}</div>
              <div>
                <div className="member-name">{p.name}</div>
                <div className="member-meta">ID #{p.id}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}