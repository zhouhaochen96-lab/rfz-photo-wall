import "./globals.css"
import type { ReactNode } from "react"
import Navbar from "@/components/Navbar"

export const metadata = {
  title: "RFZ照片墙",
  description: "高中毕业以来的共同回忆",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Navbar />
        <main className="page-container">{children}</main>
      </body>
    </html>
  )
}