# RFZ Photo Wall

前端使用 `Vue 3 + Vite`，后端使用 `FastAPI`，数据和图片存储使用 `Supabase`。

## 项目结构

- `frontend/`：前端页面
- `backend/`：后端 API
- `docs/`：补充说明文档

## 运行前准备

先分别配置前后端环境变量。

### 后端环境变量

参考 `backend/.env.example`，在 `backend/.env` 中填写：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=photos
BACKEND_CORS_ORIGINS=http://localhost:5173
```

### 前端环境变量

参考 `frontend/.env.example`，在 `frontend/.env` 中填写：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

后端默认运行在：

```text
http://localhost:8000
```

健康检查接口：

```text
http://localhost:8000/api/health
```

## 启动前端

新开一个终端执行：

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在：

```text
http://localhost:5173
```

## 推荐启动顺序

1. 先启动后端 `uvicorn app.main:app --reload`
2. 再启动前端 `npm run dev`
3. 浏览器打开 `http://localhost:5173`

## 常见问题

### 1. 缺少 Python 依赖

如果启动后端时报错：

```text
ModuleNotFoundError: No module named 'supabase'
```

说明当前虚拟环境还没安装依赖，重新执行：

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 前端请求不到后端

请确认：

- `frontend/.env` 中的 `VITE_API_BASE_URL` 是否正确
- 后端是否已经启动在 `http://localhost:8000`
- `BACKEND_CORS_ORIGINS` 是否包含 `http://localhost:5173`
