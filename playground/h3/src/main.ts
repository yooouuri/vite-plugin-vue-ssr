import { vueSSR } from 'vite-plugin-vue-ssr'
import { getRequestURL } from 'h3'
import App from '@/App.vue'

const Home = () => import('@/Home.vue')
const Cookie = () => import('@/Cookie.vue')
const Redirect = () => import('@/Redirect.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home,
  },
  {
    path: '/cookie',
    name: 'cookie',
    component: Cookie,
  },
  {
    path: '/redirect',
    name: 'redirect',
    component: Redirect,
  },
]

export default vueSSR(App, { routes }, async ({ event }) => {
  if (import.meta.env.SSR) {
    console.log(getRequestURL(event!))

    console.log(event)
  }
})
