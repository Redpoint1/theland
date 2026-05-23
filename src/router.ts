import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import CombatView from './views/CombatView.vue'
import InventoryView from './views/InventoryView.vue'
import ProfessionsView from './views/ProfessionsView.vue'
import MistVillageView from './views/MistVillageView.vue'
import BonusesView from './views/BonusesView.vue'
import SettingsView from './views/SettingsView.vue'

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
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryView,
    },
    {
      path: '/professions',
      name: 'professions',
      component: ProfessionsView,
    },
    {
      path: '/mist-village',
      name: 'mist-village',
      component: MistVillageView,
    },
    {
      path: '/bonuses',
      name: 'bonuses',
      component: BonusesView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
})

export default router
