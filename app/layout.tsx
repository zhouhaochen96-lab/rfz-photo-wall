import "./globals.css"
import { ReactNode } from "react"
import Navbar from "@/components/Navbar"

export const metadata = {
  title: "RFZ照片墙",
  description: "我们的高中毕业回忆档案馆",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <Navbar />
          <main className="page-container">{children}</main>
        </div>
      </body>
    </html>
  )
}