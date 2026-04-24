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

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push("/walls")
  }

  const register = async () => {
    if (!email || !password) {
      alert("请输入邮箱和密码")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert("注册邮件已发送，请先去邮箱完成验证。")
  }

  const resetPassword = async () => {
    if (!email) {
      alert("请先输入邮箱")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert("找回密码邮件已发送，请查收邮箱。")
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>登录 RFZ照片墙</h1>
        <p>登录后通过照片墙编码进入对应照片墙。</p>

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

          <button className="ghost-btn" onClick={resetPassword} disabled={loading}>
            忘记密码
          </button>
        </div>
      </section>
    </div>
  )
}