"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Person = {
  id: number
  name: string
  created_at?: string
}

export default function MembersPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

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

  const addPerson = async () => {
    if (!name.trim()) return

    try {
      setLoading(true)

      const { error } = await supabase
        .from("persons")
        .insert([{ name: name.trim() }])

      if (error) {
        console.log("新增成员失败:", error)
        alert("新增成员失败，请查看控制台")
        return
      }

      setName("")
      fetchPersons()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPersons()
  }, [])

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div>
          <h1>成员管理</h1>
          <p>维护 RFZ 固定成员，也可以在这里继续补充新的朋友。</p>
        </div>
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

        {persons.length === 0 ? (
          <p className="empty-text">还没有成员，先添加第一个吧。</p>
        ) : (
          <div className="member-grid">
            {persons.map((person) => (
              <div key={person.id} className="member-card">
                <div className="member-avatar">
                  {person.name?.slice(0, 1) || "?"}
                </div>
                <div>
                  <div className="member-name">{person.name}</div>
                  <div className="member-meta">ID #{person.id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}