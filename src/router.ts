import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import CombatView from './views/CombatView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/combat',
      name: 'combat',
      component: CombatView,
    },
  ],
})

export default router
