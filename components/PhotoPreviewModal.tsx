"use client"

type PhotoPreview = {
  title: string | null
  image_url: string
  shot_month?: string | null
  personNames?: string
}

export default function PhotoPreviewModal({
  photo,
  onClose,
}: {
  photo: PhotoPreview | null
  onClose: () => void
}) {
  if (!photo) return null

  return (
    <div className="preview-mask" onClick={onClose}>
      <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}>
          ×
        </button>

        <img
          src={photo.image_url}
          alt={photo.title || "大图预览"}
          className="preview-image"
        />

        <div className="preview-info">
          <h3>{photo.title || "未命名照片"}</h3>
          <p>{photo.personNames || "未标记人物"}</p>
          <p>{photo.shot_month || "未填写时间"}</p>
        </div>
      </div>
    </div>
  )
}