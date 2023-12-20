import type { App } from 'vue'
import type { RouteRecordRaw, Router, RouterScrollBehavior } from 'vue-router'
import type { Request, Response } from 'express'

export type State = { value?: any }

export type Params = {
  routes: RouteRecordRaw[]
  scrollBehavior?: RouterScrollBehavior
}

export type CallbackFn = (params: {
  app: App
  router: Router
  state: State
  request?: Request
  response?: Response
}) => void
