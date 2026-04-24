# 📸 RFZ 照片墙

一个用于记录高中毕业以来集体回忆的在线照片墙项目，支持多人协作上传、整理和浏览照片。

---

## 🌐 在线地址

👉 https://rfz-photo-wall.vercel.app/timeline

---

## ✨ 项目功能

### 👥 成员管理
- 新增成员
- 成员列表展示

### 📤 照片上传
- 多图批量上传
- 每张照片可独立：
  - 设置标题
  - 设置拍摄月份
  - 选择人物

### 🧠 批量优化
- 批量设置默认月份
- 批量设置默认人物
- 支持“批量套用 + 单独微调”

### 🕰 时间轴展示
- 按年份分组
- 按月份分组
- 照片瀑布流展示

### 🔍 筛选功能
- 按成员筛选照片

### ✏️ 编辑功能
- 修改照片标题
- 修改人物
- 修改时间

### 🗑 删除功能
- 删除照片（含数据库 + 存储）

---

## 🏗 技术架构

### 前端
- Next.js (App Router)
- React Hooks

### 后端 / 数据
- Supabase
  - PostgreSQL（数据）
  - Storage（图片）

### 部署
- Vercel

---

## 📊 数据结构设计

### persons（成员表）
| 字段 | 类型 |
|------|------|
| id | int |
| name | text |

---

### photos（照片表）
| 字段 | 类型 |
|------|------|
| id | int |
| title | text |
| image_url | text |
| shot_month | text |

---

### photo_persons（关系表）
| 字段 | 类型 |
|------|------|
| photo_id | int |
| person_id | int |

👉 多对多关系：一张照片可以对应多个成员

---

## 🚀 本地运行

```bash
npm install
npm run dev
