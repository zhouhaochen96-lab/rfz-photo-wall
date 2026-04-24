<script setup lang="ts">
import { computed, ref, watch } from "vue"

import { updatePhoto } from "../api/client"
import type { Person, Photo } from "../types"

const props = defineProps<{
  open: boolean
  photo: Photo | null
  persons: Person[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const title = ref("")
const shotMonth = ref("")
const selectedPersons = ref<number[]>([])
const saving = ref(false)

watch(
  () => props.photo,
  (photo) => {
    if (!photo) {
      title.value = ""
      shotMonth.value = ""
      selectedPersons.value = []
      return
    }

    title.value = photo.title || ""
    shotMonth.value = photo.shot_month || ""
    selectedPersons.value = photo.persons.map((person) => person.id)
  },
  { immediate: true },
)

const selectedPersonNames = computed(() =>
  props.persons
    .filter((person) => selectedPersons.value.includes(person.id))
    .map((person) => person.name),
)

function togglePerson(personId: number) {
  selectedPersons.value = selectedPersons.value.includes(personId)
    ? selectedPersons.value.filter((id) => id !== personId)
    : [...selectedPersons.value, personId]
}

async function saveEdit() {
  if (!props.photo) return

  try {
    saving.value = true
    await updatePhoto(props.photo.id, {
      title: title.value.trim() || null,
      shot_month: shotMonth.value || null,
      person_ids: selectedPersons.value,
    })
    emit("saved")
    emit("close")
  } catch (error) {
    alert(error instanceof Error ? error.message : "保存失败，请稍后再试")
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open && photo" class="modal-mask">
    <div class="modal-panel">
      <div class="modal-header">
        <h2>编辑照片</h2>
        <button class="ghost-btn small-btn" @click="emit('close')">关闭</button>
      </div>

      <img :src="photo.image_url" :alt="photo.title || 'photo'" class="modal-image" />

      <div class="form-block">
        <label class="form-label">照片标题</label>
        <input
          v-model="title"
          class="text-input full-input"
          placeholder="修改照片标题"
        />
      </div>

      <div class="form-block">
        <label class="form-label">拍摄月份</label>
        <input v-model="shotMonth" class="text-input month-input" type="month" />
      </div>

      <div class="form-block">
        <label class="form-label">照片人物</label>
        <div class="checkbox-wrap">
          <label
            v-for="person in persons"
            :key="person.id"
            class="checkbox-tag"
          >
            <input
              type="checkbox"
              :checked="selectedPersons.includes(person.id)"
              @change="togglePerson(person.id)"
            />
            <span>{{ person.name }}</span>
          </label>
        </div>

        <p class="helper-text">
          已选：{{ selectedPersonNames.length > 0 ? selectedPersonNames.join("、") : "未选择" }}
        </p>
      </div>

      <div class="modal-actions">
        <button class="primary-btn" :disabled="saving" @click="saveEdit">
          {{ saving ? "保存中..." : "保存修改" }}
        </button>
        <button class="secondary-btn" :disabled="saving" @click="emit('close')">
          取消
        </button>
      </div>
    </div>
  </div>
</template>
