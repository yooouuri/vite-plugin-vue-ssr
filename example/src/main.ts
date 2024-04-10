import { vueSSR } from 'vite-plugin-vue-ssr'
import { createPinia } from 'pinia'
import App from '@/App.vue'

const Counter = () => import('@/Counter.vue')

export default vueSSR(App, {}, async ({ app, state }) => {
  const pinia = createPinia()
  app.use(pinia)

  if (import.meta.env.SSR) {
    state.value = pinia.state.value
  } else {
    pinia.state.value = state.value
  }

  const routes = [
    {
      path: '/',
      name: 'counter',
      component: Counter,
    },
  ]

  const router = createRouter({
    history: import.meta.env.SSR ? createMemoryHistory('/') : createWebHistory('/'),
    routes,
  })
  app.use(router)

  return {
    router,
  }
})
