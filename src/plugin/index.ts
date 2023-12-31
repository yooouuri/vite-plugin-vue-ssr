import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import type { Plugin } from 'vite'
import type { App } from 'vue'
import { renderToString, SSRContext } from 'vue/server-renderer'
// @ts-ignore
import cookieParser from 'cookie-parser'
import type { Request, Response } from 'express'
// @ts-ignore
import * as cookie from 'cookie'
import { transformEntrypoint } from './transformEntrypoint'
import { generateHtml } from './generateHtml'
import type { Params, CallbackFn } from '../types'

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
          server.middlewares.use(cookieParser())
          server.middlewares.use(async (request, response) => {
            const url = request.originalUrl
  
            let template: string | undefined = readFileSync(resolve(cwd(), 'index.html'), 'utf-8')
            template = await server.transformIndexHtml(url!, template)

            const { App, routes, cb, scrollBehavior }: ReturnType<typeof vueSSRFn> = (await server.ssrLoadModule(resolve(cwd(), ssr as string))).default

            const { vueSSR } = (await import('./vue'))

            const { app, router, state, head } = vueSSR(App, { routes, scrollBehavior }, undefined, true, true)

            if (cb !== undefined) {
              // @ts-ignore
              cb({ app, router, state, request, response })
            }

            await router.push(url!)
            await router.isReady()

            let redirect = null

            const cookies = new Set<string>()

            const ctx: SSRContext = {
              request,
              response: {
                // https://github.com/expressjs/express/blob/master/lib/response.js#L854-L887
                cookie: (name: string, value: string, options: any) => {
                  cookies.add(cookie.serialize(name, value, options))
                },
                ...response,
              },
              redirect: (url: string) => {
                redirect = url
              },
            }

            const rendered = await renderToString(app, ctx)

            const loadedModules = server.moduleGraph.getModulesByFile(resolve(cwd(), ssr as string))

            const html = await generateHtml(
              template,
              rendered,
              ctx,
              state,
              head,
              loadedModules)

            response.setHeader('Set-Cookie', [...cookies])

            if (redirect !== null) {
              // https://github.com/vitejs/vite/discussions/6562#discussioncomment-1999566
              response.writeHead(302, {
                location: redirect,
              }).end()

              return
            }

            response.end(html)
          })
        }
      }
    },
  }
}

async function generateTemplate(
  { App, routes, scrollBehavior, cb }: { App: App } & Params & { cb: CallbackFn }, 
  url: string,
  template: string,
  request: Request,
  response: Response,
  manifest: object = {})
{
  const { vueSSR } = (await import('./vue'))

  const { app, router, state, head } = vueSSR(App, { routes, scrollBehavior }, undefined, true, true)

  if (cb !== undefined) {
    cb({ app, router, state, request, response })
  }

  await router.push(url!)
  await router.isReady()

  let redirect = null

  const ctx: SSRContext = {
    request,
    response,
    redirect: (url: string) => {
      redirect = url
    },
  }

  const rendered = await renderToString(app, ctx)

  const html = await generateHtml(template, rendered, ctx, state, head, undefined, manifest)

  return {
    html,
    redirect,
  }
}

export { generateTemplate }
