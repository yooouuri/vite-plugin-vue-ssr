import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import type { Plugin } from 'vite'
import type { App } from 'vue'
import { renderToString, SSRContext } from 'vue/server-renderer'
import { Router } from 'vue-router'
import { createApp, defineEventHandler, H3Event, toNodeListener } from 'h3'
import { transformEntrypoint } from './transformEntrypoint'
import { generateHtml } from './generateHtml'
import type { Params, CallbackFn } from '../types'
import { renderCssForSsr } from './renderCssForSsr'
import { renderPreloadLinks } from './renderPreloadLinks'

declare function vueSSRFn(App: App, params: Params, cb: CallbackFn): { App: App } & Params & { cb: CallbackFn }

export default function vueSsrPlugin(): Plugin {
  let ssr: boolean | string | undefined

  const virtualModuleId = 'virtual:ssr-entry-point'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-vue-ssr',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `export function vueSSR(App, { routes, head, scrollBehavior }, cb) {
          return {
            App,
            routes,
            head,
            scrollBehavior,
            cb,
          }
        }`
      }
    },
    config(config, { command }) {
      ssr = config.build?.ssr

      // serve without config.build.ssr is forced into SSR
      // serve with config.build.ssr false is SPA
      if (command === 'serve' && ssr === undefined) {
        config.build = {
          ssr: 'src/main.ts',
        }

        ssr = config.build.ssr
      }

      config.appType = ssr ? 'custom' : 'spa'
    },
    transformIndexHtml() {
      if (ssr) return

      return [
        {
          tag: 'div',
          attrs: {
            id: 'teleports',
          },
          injectTo: 'body',
        }
      ]
    },
    transform(code, id, options) {
      if (id.endsWith('main.ts')) {
        return transformEntrypoint(code, options?.ssr ?? false, !!ssr)
      }
    },
    configureServer(server) {
      if (ssr) {
        return () => {
          const app = createApp()
          app.use(defineEventHandler(async (event) => {
            const url = event.node.req.originalUrl ?? '/'

            let template: string | undefined = readFileSync(resolve(cwd(), 'index.html'), 'utf-8')
            template = await server.transformIndexHtml(url, template)

            const { App, routes, cb, scrollBehavior }: ReturnType<typeof vueSSRFn> = (await server.ssrLoadModule(resolve(cwd(), ssr as string))).default

            const { vueSSR } = (await import('./vue'))

            function callbackFn(event: H3Event) {
              return async function({ app, router, state }: { app: App, router: Router, state: any }) {
                return await cb({ app, router, state, event })
              }
            }

            // @ts-ignore
            const { app, router, state, head } = await vueSSR(App, { routes, scrollBehavior }, callbackFn(event), true, true)

            await router.push(url.replace(router.options.history.base, ''))
            await router.isReady()

            const ctx: SSRContext = {
              event,
            }

            const rendered = await renderToString(app, ctx)

            const loadedModules = server.moduleGraph.getModulesByFile(resolve(cwd(), ssr as string))

            let styles

            if (loadedModules !== undefined) {
              styles = renderCssForSsr(loadedModules)
            }

            const preloadLinks = renderPreloadLinks(ctx.modules, {})

            const html = await generateHtml(
              template,
              preloadLinks,
              rendered,
              ctx.teleports ?? {},
              state,
              head,
              styles
            )

            return html
          }))

          server.middlewares.use(toNodeListener(app))
        }
      }
    },
  }
}

async function generateTemplate(
  { App, routes, scrollBehavior, cb }: { App: App } & Params & { cb: CallbackFn }, 
  url: string,
  template: string,
  event: H3Event,
  manifest: object = {})
{
  const { vueSSR } = (await import('./vue'))

  function callbackFn(event: H3Event) {
    return async function({ app, router, state }: { app: App, router: Router, state: any }) {
      return await cb({ app, router, state, event })
    }
  }

  // @ts-ignore
  const { app, router, state, head } = await vueSSR(App, { routes, scrollBehavior }, callbackFn(event), true, true)

  await router.push(url.replace(router.options.history.base, ''))
  await router.isReady()

  const ctx: SSRContext = {
    event,
  }

  const rendered = await renderToString(app, ctx)

  const preloadLinks = renderPreloadLinks(ctx.modules, manifest ?? {})

  const html = await generateHtml(template, preloadLinks, rendered, ctx.teleports ?? {}, state, head)

  return html
}

export { generateTemplate }
