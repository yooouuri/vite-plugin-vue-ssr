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
import { Router } from 'vue-router'
import { renderCssForSsr } from './renderCssForSsr'
import { renderPreloadLinks } from './renderPreloadLinks'

declare function vueSSRFn(App: App, params: Params, cb: CallbackFn): { App: App } & Params & { cb: CallbackFn }

type UnknownFunc = (...args: unknown[]) => void

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
          server.middlewares.use(async (request, response, next) => {
            try {
              const url = request.originalUrl ?? '/'

              let template: string | undefined = readFileSync(resolve(cwd(), 'index.html'), 'utf-8')
              template = await server.transformIndexHtml(url, template)

              const { App, routes, cb, scrollBehavior }: ReturnType<typeof vueSSRFn> = (await server.ssrLoadModule(resolve(cwd(), ssr as string))).default

              const { vueSSR } = (await import('./vue'))

              function callbackFn(request: Request, response: Response) {
                return async function({ app, router, state }: { app: App, router: Router, state: any }) {
                  return await cb({ app, router, state, request, response })
                }
              }

              // @ts-ignore
              const { app, router, state, head } = await vueSSR(App, { routes, scrollBehavior }, callbackFn(request, response), true, true)

              await router.push(url.replace(router.options.history.base, ''))
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
                  redirect = `${router.options.history.base}${url}`
                },
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

              response.setHeader('Set-Cookie', [...cookies])

              if (redirect !== null) {
                // https://github.com/vitejs/vite/discussions/6562#discussioncomment-1999566
                response.writeHead(302, {
                  location: redirect,
                }).end()

                return
              }

              response.end(html)
            } catch (e) {
              server.ssrFixStacktrace(e as Error)
              next(e)
            }
          })

          // @ts-ignore
          globalThis.vite = server
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

  function callbackFn(request: Request, response: Response) {
    return async function({ app, router, state }: { app: App, router: Router, state: any }) {
      return await cb({ app, router, state, request, response })
    }
  }

  // @ts-ignore
  const { app, router, state, head } = await vueSSR(App, { routes, scrollBehavior }, callbackFn(request, response), true, true)

  await router.push(url.replace(router.options.history.base, ''))
  await router.isReady()

  let redirect = null

  const ctx: SSRContext = {
    request,
    response,
    redirect: (url: string) => {
      redirect = `${router.options.history.base}${url}`
    },
  }

  const { errorHandler } = app.config

  let _err

  // see: https://github.com/vuejs/core/issues/7876
  // and: https://github.com/vuejs/core/issues/9364
  if (process.env.NODE_ENV === 'production') {
    app.config.errorHandler = (err, instance, info) => {
      if (typeof errorHandler === 'function') {
        (errorHandler as UnknownFunc).call(app, err, instance, info)
      }

      _err = err
    }
  }

  const rendered = await renderToString(app, ctx)

  if (_err) {
    throw _err
  }

  const preloadLinks = renderPreloadLinks(ctx.modules, manifest ?? {})

  const html = await generateHtml(template, preloadLinks, rendered, ctx.teleports ?? {}, state, head)

  return {
    html,
    redirect,
  }
}

export { generateTemplate }
