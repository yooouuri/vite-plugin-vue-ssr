import { type Component, type App, createSSRApp, createApp } from 'vue'
import {
  Router,
  createMemoryHistory,
  createRouter,
  createWebHistory
} from 'vue-router'
import { MergeHead, VueHeadClient, createHead } from '@unhead/vue'
import type { State, CallbackFn, Params } from '../types'

export async function vueSSR(App: Component, params: Params, cb?: CallbackFn, ssrBuild = false, ssr = false): Promise<{ app: App, router: Router, state: State, head: VueHeadClient<MergeHead>, scrollBehavior: any, cb: CallbackFn | undefined }> {
  const { routes, scrollBehavior } = params

  const state: State = {
    value: undefined,
  }

  if (!ssr) {
    // @ts-ignore
    state.value = window.__INITIAL_STATE__ as object
  }

  const app = ssrBuild ? createSSRApp(App) : createApp(App)

  const head = createHead()
  app.use(head)

  let router = undefined

  if (cb !== undefined) {
    // @ts-ignore
    const callbackResult = await cb({ app, router, state })

    if (callbackResult !== undefined) {
      const { router: _router } = callbackResult

      router = _router
    }
  }

  if (router === undefined) {
    router = createRouter({
      history: ssr ? createMemoryHistory('/') : createWebHistory('/'),
      routes: routes ?? [],
      scrollBehavior,
    })
    app.use(router)
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
