import { createRouter, createWebHistory } from "vue-router"

import MembersView from "../views/MembersView.vue"
import TimelineView from "../views/TimelineView.vue"
import UploadView from "../views/UploadView.vue"
import WallView from "../views/WallView.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/timeline" },
    { path: "/members", component: MembersView },
    { path: "/upload", component: UploadView },
    { path: "/timeline", component: TimelineView },
    { path: "/wall", component: WallView },
  ],
})

export default router
