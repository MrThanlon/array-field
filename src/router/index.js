import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/Home')
  },
  {
    path: '/2d',
    component: () => import('../views/Solver2d')
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
