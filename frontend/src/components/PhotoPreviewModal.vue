<script setup lang="ts">
type PhotoPreview = {
  title: string | null
  image_url: string
  shot_month?: string | null
  personNames?: string
}

defineProps<{
  photo: PhotoPreview | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div v-if="photo" class="preview-mask" @click="emit('close')">
    <div class="preview-panel" @click.stop>
      <button class="preview-close" @click="emit('close')">×</button>

      <img
        :src="photo.image_url"
        :alt="photo.title || '大图预览'"
        class="preview-image"
      />

      <div class="preview-info">
        <h3>{{ photo.title || "未命名照片" }}</h3>
        <p>{{ photo.personNames || "未标记人物" }}</p>
        <p>{{ photo.shot_month || "未填写时间" }}</p>
      </div>
    </div>
  </div>
</template>
