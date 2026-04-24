"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/members", label: "成员管理" },
  { href: "/upload", label: "上传照片" },
  { href: "/timeline", label: "时间轴" },
  { href: "/wall", label: "照片墙" },
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
      </div>
    </header>
  )
}