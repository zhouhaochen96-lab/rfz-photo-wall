"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/members", label: "成员管理" },
  { href: "/upload", label: "上传照片" },
  { href: "/timeline", label: "时间轴" },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/timeline" className="brand">
          RFZ照片墙
        </Link>

        <nav className="nav-links">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}