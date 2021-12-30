import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home')
  },
  {
    path: '/3d',
    component: () => import('../views/Solver3d')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
