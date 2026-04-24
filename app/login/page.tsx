"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const login = async () => {
    if (!email || !password) {
      alert("请输入邮箱和密码")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        alert(error.message)
        return
      }

      router.push("/walls")
    } finally {
      setLoading(false)
    }
  }

  const register = async () => {
    if (!email || !password) {
      alert("请输入邮箱和密码")
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({ email, password })

      if (error) {
        alert(error.message)
        return
      }

      alert("注册成功。如果 Supabase 开启了邮箱验证，请先去邮箱确认。")
      router.push("/walls")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>登录 RFZ照片墙</h1>
        <p>登录后可以选择或创建属于你们自己的照片墙。</p>

        <div className="form-block">
          <label className="form-label">邮箱</label>
          <input
            className="text-input full-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱"
          />
        </div>

        <div className="form-block">
          <label className="form-label">密码</label>
          <input
            className="text-input full-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </div>

        <div className="action-row">
          <button className="primary-btn" onClick={login} disabled={loading}>
            {loading ? "处理中..." : "登录"}
          </button>
          <button className="secondary-btn" onClick={register} disabled={loading}>
            注册
          </button>
        </div>
      </section>
    </div>
  )
}