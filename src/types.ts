import type { App } from 'vue'
import type { RouteRecordRaw, Router, RouterScrollBehavior } from 'vue-router'
import type { H3Event } from 'h3'

export type State = { value?: Record<string, any> }

export type Params = {
  routes?: RouteRecordRaw[]
  scrollBehavior?: RouterScrollBehavior
}

export type CallbackFn = (params: {
  app: App
  router?: Router
  state: State
  event?: H3Event
}) => Promise<{ router: Router } | void>
