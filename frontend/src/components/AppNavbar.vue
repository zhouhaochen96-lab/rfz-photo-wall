<script setup lang="ts">
import { computed } from "vue"
import { RouterLink, useRoute } from "vue-router"

const route = useRoute()

const navItems = [
  { href: "/members", label: "成员管理" },
  { href: "/upload", label: "上传照片" },
  { href: "/timeline", label: "时间轴" },
  { href: "/wall", label: "照片墙" },
]

const currentPath = computed(() => route.path)
</script>

<template>
  <header class="navbar">
    <div class="navbar-inner">
      <RouterLink to="/timeline" class="brand">RFZ照片墙</RouterLink>

      <nav class="nav-links">
        <RouterLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          :class="currentPath === item.href ? 'nav-link active' : 'nav-link'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
