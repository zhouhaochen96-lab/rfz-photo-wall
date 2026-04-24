<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

import EditPhotoModal from "../components/EditPhotoModal.vue"
import PhotoPreviewModal from "../components/PhotoPreviewModal.vue"
import { listPersons, listPhotos, removePhoto } from "../api/client"
import type { Person, Photo } from "../types"

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

const persons = ref<Person[]>([])
const photos = ref<Photo[]>([])
const activePersonId = ref<number | null>(null)
const editingPhoto = ref<Photo | null>(null)
const deletingId = ref<number | null>(null)
const previewPhoto = ref<PreviewPhoto | null>(null)

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

    <section class="panel-card">
      <h2>时间轴照片墙</h2>

      <p v-if="groupedPhotos.length === 0" class="empty-text">暂无照片。</p>

      <div v-else>
        <div v-for="yearGroup in groupedPhotos" :key="yearGroup.year" class="year-block">
          <div class="year-title">{{ yearGroup.year }}</div>

          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-block">
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
