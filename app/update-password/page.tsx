"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const updatePassword = async () => {
    if (!password || !confirmPassword) {
      alert("请输入新密码")
      return
    }

    if (password !== confirmPassword) {
      alert("两次输入的密码不一致")
      return
    }

    if (password.length < 6) {
      alert("密码至少 6 位")
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        alert(error.message)
        return
      }

      alert("密码已更新，请重新登录")
      await supabase.auth.signOut()
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>设置新密码</h1>
        <p>请输入新的登录密码。</p>

        <div className="form-block">
          <label className="form-label">新密码</label>
          <input
            className="text-input full-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入新密码"
          />
        </div>

        <div className="form-block">
          <label className="form-label">确认新密码</label>
          <input
            className="text-input full-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="请再次输入新密码"
          />
        </div>

        <button className="primary-btn" onClick={updatePassword} disabled={loading}>
          {loading ? "更新中..." : "确认修改密码"}
        </button>
      </section>
    </div>
  )
}