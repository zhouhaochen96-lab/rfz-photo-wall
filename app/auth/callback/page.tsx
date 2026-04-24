"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.log("邮箱验证回调失败:", error)
          alert("邮箱验证失败，请重新登录")
          router.replace("/login")
          return
        }
      }

      router.replace("/walls")
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div style={{ padding: 40 }}>
      <h2>正在完成登录...</h2>
      <p>请稍候，正在跳转到照片墙选择页面。</p>
    </div>
  )
}