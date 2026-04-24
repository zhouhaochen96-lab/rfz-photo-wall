"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { clearCurrentWall, getCurrentWall, type CurrentWall } from "@/lib/currentWall"

const navItems = [
  { href: "/walls", label: "照片墙" },
  { href: "/members", label: "成员" },
  { href: "/upload", label: "上传" },
  { href: "/timeline", label: "时间轴" },
  { href: "/wall", label: "平铺墙" },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [wall, setWall] = useState<CurrentWall | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    setWall(getCurrentWall())

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null)
    })
  }, [pathname])

  const logout = async () => {
    await supabase.auth.signOut()
    clearCurrentWall()
    router.push("/login")
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/timeline" className="brand">
          RFZ照片墙
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          {wall && <span className="wall-pill">{wall.name}</span>}
          {email ? (
            <button className="ghost-btn small-btn" onClick={logout}>
              退出
            </button>
          ) : (
            <Link href="/login" className="ghost-btn small-btn">
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}