import { type Component, type App, createSSRApp, createApp } from 'vue'
import {
  Router,
  createMemoryHistory,
  createRouter,
  createWebHistory
} from 'vue-router'
import { MergeHead, VueHeadClient, createHead } from '@unhead/vue'
import type { State, CallbackFn, Params } from '../types'

export function vueSSR(component: Component, params: Params, cb?: CallbackFn, ssrBuild = true, ssr = true): { app: App, router: Router, state: State, head: VueHeadClient<MergeHead>, scrollBehavior: any, cb: CallbackFn | undefined }  {
  const { routes, scrollBehavior } = params

  const state: State = {
    value: undefined,
  }

  if (!ssr) {
    // @ts-ignore
    state.value = window.__INITIAL_STATE__ as object
  }

  const app = ssrBuild ? createSSRApp(component) : createApp(component)

  const router = createRouter({
    history: ssr ? createMemoryHistory('/') : createWebHistory('/'),
    routes,
    scrollBehavior,
  })
  app.use(router)

  const head = createHead()
  app.use(head)

  if (cb !== undefined) {
    cb({ app, router, state })
  }

  return {
    app,
    router,
    state,
    head,
    scrollBehavior,
    cb,
  }
}
