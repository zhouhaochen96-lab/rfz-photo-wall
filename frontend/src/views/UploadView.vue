<script setup lang="ts">
import exifr from "exifr"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import { listPersons, uploadPhotos } from "../api/client"
import type { Person, UploadPhotoPayload } from "../types"

type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
  title: string
  shotMonth: string
  selectedPersons: number[]
}

const persons = ref<Person[]>([])
const pendingPhotos = ref<PendingPhoto[]>([])
const uploading = ref(false)

const defaultShotMonth = ref("")
const defaultSelectedPersons = ref<number[]>([])
const defaultTitle = ref("")

async function getPhotoMonth(file: File) {
  try {
    const exif = await exifr.parse(file)
    const date = exif?.DateTimeOriginal || exif?.CreateDate || exif?.ModifyDate

    if (date) {
      const parsedDate = new Date(date)
      if (!Number.isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear()
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0")
        return `${year}-${month}`
      }
    }

    if (file.lastModified) {
      const lastModifiedDate = new Date(file.lastModified)
      const year = lastModifiedDate.getFullYear()
      const month = String(lastModifiedDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  } catch (error) {
    console.log("读取照片 EXIF 失败:", error)

    if (file.lastModified) {
      const lastModifiedDate = new Date(file.lastModified)
      const year = lastModifiedDate.getFullYear()
      const month = String(lastModifiedDate.getMonth() + 1).padStart(2, "0")
      return `${year}-${month}`
    }

    return ""
  }
}

async function fetchPersons() {
  persons.value = await listPersons()
}

function revokePreviewUrl(url: string) {
  URL.revokeObjectURL(url)
}

function getSelectedPersonNames(personIds: number[]) {
  return persons.value
    .filter((person) => personIds.includes(person.id))
    .map((person) => person.name)
}

async function handleFilesChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0) return

  const imageFiles = files.filter((file) => file.type.startsWith("image/"))

  if (imageFiles.length === 0) {
    alert("请选择图片文件")
    return
  }

  const newItems: PendingPhoto[] = []

  for (const file of imageFiles) {
    const autoMonth = await getPhotoMonth(file)

    newItems.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      title: file.name.replace(/\.[^/.]+$/, ""),
      shotMonth: autoMonth || defaultShotMonth.value,
      selectedPersons: [...defaultSelectedPersons.value],
    })
  }

  pendingPhotos.value = [...pendingPhotos.value, ...newItems]
  target.value = ""
}

function updatePendingField(id: string, field: "title" | "shotMonth", value: string) {
  pendingPhotos.value = pendingPhotos.value.map((item) =>
    item.id === id ? { ...item, [field]: value } : item,
  )
}

function handlePendingTitleInput(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  updatePendingField(id, "title", target.value)
}

function handlePendingShotMonthInput(id: string, event: Event) {
  const target = event.target as HTMLInputElement
  updatePendingField(id, "shotMonth", target.value)
}

function toggleDefaultPerson(personId: number) {
  defaultSelectedPersons.value = defaultSelectedPersons.value.includes(personId)
    ? defaultSelectedPersons.value.filter((id) => id !== personId)
    : [...defaultSelectedPersons.value, personId]
}

function togglePendingPerson(photoId: string, personId: number) {
  pendingPhotos.value = pendingPhotos.value.map((item) => {
    if (item.id !== photoId) return item

    return {
      ...item,
      selectedPersons: item.selectedPersons.includes(personId)
        ? item.selectedPersons.filter((id) => id !== personId)
        : [...item.selectedPersons, personId],
    }
  })
}

function applyDefaultMonthToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    shotMonth: defaultShotMonth.value,
  }))
}

function applyDefaultTitleToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    title: defaultTitle.value,
  }))
}

function applyDefaultPersonsToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    selectedPersons: [...defaultSelectedPersons.value],
  }))
}

function applyDefaultsToAll() {
  pendingPhotos.value = pendingPhotos.value.map((item) => ({
    ...item,
    title: defaultTitle.value || item.title,
    shotMonth: defaultShotMonth.value,
    selectedPersons: [...defaultSelectedPersons.value],
  }))
}

function removePendingPhoto(id: string) {
  const target = pendingPhotos.value.find((item) => item.id === id)
  if (target) revokePreviewUrl(target.previewUrl)
  pendingPhotos.value = pendingPhotos.value.filter((item) => item.id !== id)
}

function clearAllPending() {
  pendingPhotos.value.forEach((item) => revokePreviewUrl(item.previewUrl))
  pendingPhotos.value = []
}

async function handleBatchUpload() {
  if (pendingPhotos.value.length === 0) {
    alert("请先选择照片")
    return
  }

  try {
    uploading.value = true

    const files = pendingPhotos.value.map((item) => item.file)
    const items: UploadPhotoPayload[] = pendingPhotos.value.map((item) => ({
      title: item.title.trim() || null,
      shot_month: item.shotMonth || null,
      person_ids: item.selectedPersons,
    }))

    await uploadPhotos(files, items)
    alert("批量上传成功！")
    clearAllPending()
  } catch (error) {
    alert(error instanceof Error ? error.message : "上传失败，请稍后再试")
  } finally {
    uploading.value = false
  }
}

const defaultPersonNames = computed(() =>
  getSelectedPersonNames(defaultSelectedPersons.value),
)

onMounted(() => {
  fetchPersons().catch((error) => {
    alert(error instanceof Error ? error.message : "获取成员失败，请稍后再试")
  })
})

onBeforeUnmount(() => {
  pendingPhotos.value.forEach((item) => revokePreviewUrl(item.previewUrl))
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>上传照片</h1>
      <p>支持多图上传、批量套用默认月份和人物，也可以逐张微调。</p>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>选择照片</h2>
        <span class="badge">{{ pendingPhotos.length }} 张待上传</span>
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        :disabled="uploading"
        @change="handleFilesChange"
      />

      <p class="helper-text">
        选择后不会立刻上传。系统会尝试自动读取照片拍摄月份，读不到时可手动选择。
      </p>
    </section>

    <div class="form-block">
      <label class="form-label">默认照片标题</label>
      <div class="action-row">
        <input
          v-model="defaultTitle"
          class="text-input full-input"
          placeholder="例如：2024年五一聚会"
          :disabled="uploading"
        />

        <button
          class="secondary-btn"
          :disabled="uploading || pendingPhotos.length === 0"
          @click="applyDefaultTitleToAll"
        >
          应用标题到全部
        </button>
      </div>
    </div>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>批量默认设置</h2>
        <span class="badge">先套用默认值，再逐张微调</span>
      </div>

      <div class="form-block">
        <label class="form-label">默认拍摄月份</label>
        <div class="action-row">
          <input
            v-model="defaultShotMonth"
            class="text-input month-input"
            type="month"
            :disabled="uploading"
          />
          <button
            class="secondary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultMonthToAll"
          >
            应用月份到全部
          </button>
        </div>
      </div>

      <div class="form-block">
        <label class="form-label">默认人物</label>

        <p v-if="persons.length === 0" class="helper-text">
          暂无成员，请先到“成员管理”页面添加。
        </p>

        <div v-else class="checkbox-wrap">
          <label
            v-for="person in persons"
            :key="person.id"
            class="checkbox-tag"
          >
            <input
              type="checkbox"
              :checked="defaultSelectedPersons.includes(person.id)"
              :disabled="uploading"
              @change="toggleDefaultPerson(person.id)"
            />
            <span>{{ person.name }}</span>
          </label>
        </div>

        <p class="helper-text">
          默认已选：{{ defaultPersonNames.length > 0 ? defaultPersonNames.join("、") : "未选择" }}
        </p>

        <div class="action-row">
          <button
            class="secondary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultPersonsToAll"
          >
            应用人物到全部
          </button>

          <button
            class="primary-btn"
            :disabled="uploading || pendingPhotos.length === 0"
            @click="applyDefaultsToAll"
          >
            标题、月份和人物一起应用到全部
          </button>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <div>
          <h2>上传预览</h2>
          <p class="helper-text">每张照片都可以单独设置标题、拍摄月份和人物。</p>
        </div>
      </div>

      <p v-if="pendingPhotos.length === 0" class="empty-text">还没有选择照片。</p>

      <div v-else class="upload-grid">
        <div v-for="item in pendingPhotos" :key="item.id" class="upload-card">
          <img
            :src="item.previewUrl"
            :alt="item.title || '待上传照片'"
            class="upload-preview"
          />

          <div class="form-block">
            <label class="form-label">照片标题</label>
            <input
              :value="item.title"
              class="text-input full-input"
              placeholder="照片标题"
              :disabled="uploading"
              @input="handlePendingTitleInput(item.id, $event)"
            />
          </div>

          <div class="form-block">
            <label class="form-label">拍摄月份</label>
            <input
              :value="item.shotMonth"
              class="text-input month-input"
              type="month"
              :disabled="uploading"
              @input="handlePendingShotMonthInput(item.id, $event)"
            />
          </div>

          <div class="form-block">
            <label class="form-label">照片人物</label>

            <p v-if="persons.length === 0" class="helper-text">暂无成员。</p>

            <div v-else class="checkbox-wrap">
              <label
                v-for="person in persons"
                :key="person.id"
                class="checkbox-tag"
              >
                <input
                  type="checkbox"
                  :checked="item.selectedPersons.includes(person.id)"
                  :disabled="uploading"
                  @change="togglePendingPerson(item.id, person.id)"
                />
                <span>{{ person.name }}</span>
              </label>
            </div>

            <p class="helper-text">
              已选：{{
                getSelectedPersonNames(item.selectedPersons).length > 0
                  ? getSelectedPersonNames(item.selectedPersons).join("、")
                  : "未选择"
              }}
            </p>
          </div>

          <button
            class="danger-outline-btn"
            :disabled="uploading"
            @click="removePendingPhoto(item.id)"
          >
            移除这张
          </button>
        </div>
      </div>

      <div v-if="pendingPhotos.length > 0" class="upload-footer-actions">
        <button class="secondary-btn" :disabled="uploading" @click="clearAllPending">
          清空全部
        </button>

        <button class="primary-btn" :disabled="uploading" @click="handleBatchUpload">
          {{ uploading ? "上传中..." : "确认批量上传" }}
        </button>
      </div>
    </section>
  </div>
</template>
