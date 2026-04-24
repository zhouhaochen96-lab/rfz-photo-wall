"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const login = async () => {
    setMessage("正在登录...")

    if (!email.trim() || !password.trim()) {
      setMessage("请输入邮箱和密码")
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      console.log("login data:", data)
      console.log("login error:", error)

      if (error) {
        setMessage(`登录失败：${error.message}`)
        return
      }

      setMessage("登录成功，正在跳转...")
      window.location.assign("/walls")
    } catch (err) {
      console.log("login catch error:", err)
      setMessage("登录异常，请打开控制台查看错误")
    } finally {
      setLoading(false)
    }
  }

  const register = async () => {
    setMessage("正在注册...")

    if (!email.trim() || !password.trim()) {
      setMessage("请输入邮箱和密码")
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`注册失败：${error.message}`)
        return
      }

      setMessage("注册邮件已发送，请去邮箱完成验证。")
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage("请先输入邮箱")
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setMessage(`发送失败：${error.message}`)
      return
    }

    setMessage("找回密码邮件已发送，请查收邮箱。")
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
            {loading ? "登录中..." : "登录"}
          </button>

          <button className="secondary-btn" onClick={register} disabled={loading}>
            注册
          </button>

          <button className="ghost-btn" onClick={resetPassword} disabled={loading}>
            忘记密码
          </button>
        </div>

        {message && <p className="helper-text" style={{ marginTop: 16 }}>{message}</p>}
      </section>
    </div>
  )
}