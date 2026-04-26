<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

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

const persons = ref<Person[]>([])
const photos = ref<Photo[]>([])
const activePersonId = ref<number | null>(null)
const editingPhoto = ref<Photo | null>(null)
const deletingId = ref<number | null>(null)
const downloadingId = ref<number | null>(null)
const previewPhoto = ref<PreviewPhoto | null>(null)

async function fetchPersons() {
  persons.value = await listPersons()
}

async function fetchPhotos() {
  photos.value = await listPhotos("wall")
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

onMounted(() => {
  Promise.all([fetchPersons(), fetchPhotos()]).catch((error) => {
    alert(error instanceof Error ? error.message : "获取照片失败，请稍后再试")
  })
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>照片墙</h1>
      <p>平铺展示所有照片，鼠标悬浮可放大查看详情。</p>
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

    <section v-if="filteredPhotos.length === 0" class="panel-card">
      <p class="empty-text">暂无照片。</p>
    </section>

    <section v-else class="photo-wall-grid">
      <div
        v-for="photo in filteredPhotos"
        :key="photo.id"
        class="photo-wall-card"
        @click="
          previewPhoto = {
            title: photo.title,
            image_url: photo.image_url,
            shot_month: photo.shot_month,
            personNames: getPersonNames(photo),
          }
        "
      >
        <img :src="photo.image_url" :alt="photo.title || 'photo'" />

        <div class="photo-wall-overlay">
          <h3>{{ photo.title || "未命名照片" }}</h3>
          <p>{{ getPersonNames(photo) }}</p>
          <p>{{ photo.shot_month || "未填写时间" }}</p>

          <div class="card-actions" @click.stop>
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
