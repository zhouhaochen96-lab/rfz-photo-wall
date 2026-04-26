<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue"

import EditPhotoModal from "../components/EditPhotoModal.vue"
import PhotoPreviewModal from "../components/PhotoPreviewModal.vue"
import { listPersons, listPhotos, removePhoto } from "../api/client"
import type { Person, Photo } from "../types"
import { downloadPhotoToLocal } from "../utils/download"

type PreviewPhoto = {
  title: string | null
  image_url: string
  shot_month?: string | null
  personNames?: string
}

type MonthGroup = {
  month: string
  photos: Photo[]
}

type YearGroup = {
  year: string
  months: MonthGroup[]
}

type TimelinePoint = {
  id: string
  year: string
  month: string
  label: string
}

const persons = ref<Person[]>([])
const photos = ref<Photo[]>([])
const activePersonId = ref<number | null>(null)
const editingPhoto = ref<Photo | null>(null)
const deletingId = ref<number | null>(null)
const downloadingId = ref<number | null>(null)
const previewPhoto = ref<PreviewPhoto | null>(null)
const activeTimelinePointId = ref<string>("")

async function fetchPersons() {
  persons.value = await listPersons()
}

async function fetchPhotos() {
  photos.value = await listPhotos("timeline")
}

function getPersonNames(photo: Photo) {
  return photo.persons.map((person) => person.name).join(" · ") || "未标记人物"
}

async function deletePhoto(photo: Photo) {
  const ok = window.confirm(`确定删除这张照片吗？\n\n${photo.title || "未命名照片"}`)
  if (!ok) return

  try {
    deletingId.value = photo.id
    await removePhoto(photo.id)
    await fetchPhotos()
  } catch (error) {
    alert(error instanceof Error ? error.message : "删除失败，请稍后再试")
  } finally {
    deletingId.value = null
  }
}

async function downloadPhoto(photo: Photo) {
  try {
    downloadingId.value = photo.id
    await downloadPhotoToLocal(photo)
  } catch (error) {
    alert(error instanceof Error ? error.message : "下载失败，请稍后再试")
  } finally {
    downloadingId.value = null
  }
}

const filteredPhotos = computed(() => {
  if (!activePersonId.value) return photos.value

  return photos.value.filter((photo) =>
    photo.persons.some((person) => person.id === activePersonId.value),
  )
})

const groupedPhotos = computed<YearGroup[]>(() => {
  const groups: Record<string, Record<string, Photo[]>> = {}

  filteredPhotos.value.forEach((photo) => {
    const month = photo.shot_month || "未填写时间"
    const year = month !== "未填写时间" ? month.split("-")[0] : "未填写时间"

    if (!groups[year]) groups[year] = {}
    if (!groups[year][month]) groups[year][month] = []

    groups[year][month].push(photo)
  })

  return Object.entries(groups)
    .sort((a, b) => {
      if (a[0] === "未填写时间") return 1
      if (b[0] === "未填写时间") return -1
      return Number(b[0]) - Number(a[0])
    })
    .map(([year, months]) => ({
      year,
      months: Object.entries(months)
        .sort((a, b) => {
          if (a[0] === "未填写时间") return 1
          if (b[0] === "未填写时间") return -1
          return b[0].localeCompare(a[0])
        })
        .map(([month, photosInMonth]) => ({
          month,
          photos: photosInMonth,
        })),
    }))
})

const timelinePoints = computed<TimelinePoint[]>(() =>
  groupedPhotos.value.flatMap((yearGroup) =>
    yearGroup.months.map((monthGroup) => ({
      id: `timeline-${yearGroup.year}-${monthGroup.month}`.replace(/[^a-zA-Z0-9-_]/g, "_"),
      year: yearGroup.year,
      month: monthGroup.month,
      label: `${yearGroup.year} / ${monthGroup.month}`,
    })),
  ),
)

function getTimelinePointId(year: string, month: string) {
  return `timeline-${year}-${month}`.replace(/[^a-zA-Z0-9-_]/g, "_")
}

async function jumpToTimelinePoint(pointId: string) {
  activeTimelinePointId.value = pointId
  await nextTick()
  const target = document.getElementById(pointId)
  if (!target) return

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  })
}

watch(
  timelinePoints,
  (points) => {
    if (points.length === 0) {
      activeTimelinePointId.value = ""
      return
    }

    const hasActivePoint = points.some((point) => point.id === activeTimelinePointId.value)
    if (!hasActivePoint) {
      activeTimelinePointId.value = points[0].id
    }
  },
  { immediate: true },
)

onMounted(() => {
  Promise.all([fetchPersons(), fetchPhotos()]).catch((error) => {
    alert(error instanceof Error ? error.message : "获取照片失败，请稍后再试")
  })
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>时间轴</h1>
      <p>按年份和月份回看高中毕业以来的共同回忆。</p>
    </section>

    <section class="panel-card">
      <h2>按成员筛选</h2>
      <div class="filter-row">
        <button
          :class="activePersonId === null ? 'filter-btn active' : 'filter-btn'"
          @click="activePersonId = null"
        >
          全部
        </button>

        <button
          v-for="person in persons"
          :key="person.id"
          :class="activePersonId === person.id ? 'filter-btn active' : 'filter-btn'"
          @click="activePersonId = activePersonId === person.id ? null : person.id"
        >
          {{ person.name }}
        </button>
      </div>
    </section>

    <section class="panel-card timeline-layout">
      <aside v-if="timelinePoints.length > 0" class="timeline-sidebar">
        <div class="timeline-sidebar-title">时间导航</div>
        <div class="timeline-rail">
          <button
            v-for="point in timelinePoints"
            :key="point.id"
            :class="
              activeTimelinePointId === point.id
                ? 'timeline-point timeline-point-active'
                : 'timeline-point'
            "
            @click="jumpToTimelinePoint(point.id)"
          >
            <span class="timeline-point-dot" />
            <span class="timeline-point-branch" />
            <span class="timeline-point-label">{{ point.label }}</span>
          </button>
        </div>
      </aside>

      <div class="timeline-content">
        <h2>时间轴照片墙</h2>

        <p v-if="groupedPhotos.length === 0" class="empty-text">暂无照片。</p>

        <div v-else>
          <div v-for="yearGroup in groupedPhotos" :key="yearGroup.year" class="year-block">
            <div class="year-title">{{ yearGroup.year }}</div>

            <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-block">
              <div :id="getTimelinePointId(yearGroup.year, monthGroup.month)" class="timeline-anchor" />
              <div class="month-title">{{ monthGroup.month }}</div>

              <div class="timeline-grid">
                <div v-for="photo in monthGroup.photos" :key="photo.id" class="photo-card">
                  <img
                    :src="photo.image_url"
                    alt=""
                    class="photo-image clickable-image"
                    @click="
                      previewPhoto = {
                        title: photo.title,
                        image_url: photo.image_url,
                        shot_month: photo.shot_month,
                        personNames: getPersonNames(photo),
                      }
                    "
                  />

                  <div class="photo-card-body">
                    <div class="photo-title">{{ photo.title || "未命名照片" }}</div>
                    <div class="photo-meta">{{ getPersonNames(photo) }}</div>
                    <div class="photo-submeta">{{ photo.shot_month || "未填写时间" }}</div>

                    <div class="card-actions">
                      <button
                        class="secondary-btn"
                        :disabled="downloadingId === photo.id"
                        @click="downloadPhoto(photo)"
                      >
                        {{ downloadingId === photo.id ? "下载中..." : "下载" }}
                      </button>
                      <button class="secondary-btn" @click="editingPhoto = photo">编辑</button>
                      <button
                        class="danger-btn"
                        :disabled="deletingId === photo.id"
                        @click="deletePhoto(photo)"
                      >
                        {{ deletingId === photo.id ? "删除中..." : "删除" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <EditPhotoModal
      :open="Boolean(editingPhoto)"
      :photo="editingPhoto"
      :persons="persons"
      @close="editingPhoto = null"
      @saved="fetchPhotos"
    />
    <PhotoPreviewModal :photo="previewPhoto" @close="previewPhoto = null" />
  </div>
</template>
