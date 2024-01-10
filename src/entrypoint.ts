import type { Component } from 'vue'
import { CallbackFn, Params } from './types'

export function vueSSR(component: Component, { routes, scrollBehavior }: Params, cb?: CallbackFn) {
  return {
    component,
    routes,
    scrollBehavior,
    cb,
  }
}
