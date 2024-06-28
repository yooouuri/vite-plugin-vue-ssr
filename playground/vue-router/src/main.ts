import { vueSSR } from 'vite-plugin-vue-ssr'
import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import App from '@/App.vue'

const Counter = () => import('@/Counter.vue')

export default vueSSR(App, {}, async ({ app }) => {
  const router = createRouter({
    history: import.meta.env.SSR ? createMemoryHistory('/') : createWebHistory('/'),
    routes: [
      {
        path: '/',
        name: 'counter',
        component: Counter,
      },
    ],
  })
  app.use(router)

  return {
    router,
  }
})
