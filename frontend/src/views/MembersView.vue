<script setup lang="ts">
import { onMounted, ref } from "vue"

import { createPerson, listPersons } from "../api/client"
import type { Person } from "../types"

const persons = ref<Person[]>([])
const name = ref("")
const loading = ref(false)

async function fetchPersons() {
  persons.value = await listPersons()
}

async function addPerson() {
  const cleanName = name.value.trim()

  if (!cleanName) {
    alert("请输入成员名字")
    return
  }

  const exists = persons.value.some((person) => person.name.trim() === cleanName)
  if (exists) {
    alert("该成员已存在，不能重复添加")
    return
  }

  try {
    loading.value = true
    await createPerson(cleanName)
    name.value = ""
    await fetchPersons()
  } catch (error) {
    alert(error instanceof Error ? error.message : "新增成员失败，请稍后再试")
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPersons().catch((error) => {
    alert(error instanceof Error ? error.message : "获取成员失败，请稍后再试")
  })
})
</script>

<template>
  <div class="page-stack">
    <section class="hero-card">
      <h1>成员管理</h1>
      <p>维护 RFZ 固定成员。成员名称不能重复。</p>
    </section>

    <section class="panel-card">
      <h2>新增成员</h2>
      <div class="inline-form">
        <input
          v-model="name"
          class="text-input"
          placeholder="输入成员名字"
          @keydown.enter="addPerson"
        />
        <button class="primary-btn" :disabled="loading" @click="addPerson">
          {{ loading ? "添加中..." : "新增成员" }}
        </button>
      </div>
    </section>

    <section class="panel-card">
      <div class="section-title-row">
        <h2>成员列表</h2>
        <span class="badge">{{ persons.length }} 人</span>
      </div>

      <p v-if="persons.length === 0" class="empty-text">暂无成员。</p>

      <div v-else class="member-grid">
        <div v-for="person in persons" :key="person.id" class="member-card">
          <div class="member-avatar">{{ person.name.slice(0, 1) }}</div>
          <div>
            <div class="member-name">{{ person.name }}</div>
            <div class="member-meta">RFZ 成员</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
