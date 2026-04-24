"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // 关键：解析 URL 里的 token 并建立 session
      const { error } = await supabase.auth.getSession()

      if (error) {
        console.log("auth callback error:", error)
      }

      // 成功后跳转
      router.replace("/walls")
    }

    handleAuth()
  }, [router])

  return (
    <div style={{ padding: 40 }}>
      <h2>正在验证邮箱...</h2>
      <p>请稍候，正在为你完成登录。</p>
    </div>
  )
}