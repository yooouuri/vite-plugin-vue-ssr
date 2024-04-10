import { SSRContext, renderToString } from 'vue/server-renderer'
import type { App } from 'vue'
import { load } from 'cheerio'
import devalue from '@nuxt/devalue'
import { basename } from 'node:path'
import type { HeadTag } from '@vueuse/head'
import type { Request, Response } from 'express'
import { Router } from 'vue-router'
import type { Params, CallbackFn } from '../types'

function renderPreloadLinks(modules: string[], manifest: any /* TODO */) {
  let links = ''
  const seen = new Set()
  modules.forEach(id => {
    const files = manifest[id]
    if (files) {
      files.forEach((file: any /* TODO */) => {
        if (!seen.has(file)) {
          seen.add(file)
          const filename = basename(file)
          if (manifest[filename]) {
            for (const depFile of manifest[filename]) {
              links += renderPreloadLink(depFile)
              seen.add(depFile)
            }
          }
          links += renderPreloadLink(file)
        }
      })
    }
  })
  return links
}

function renderPreloadLink(file: string) {
  if (file.endsWith('.js')) {
    return `<link rel="modulepreload" crossorigin href="${file}">`
  } else if (file.endsWith('.css')) {
    return `<link rel="stylesheet" href="${file}">`
  } else if (file.endsWith('.woff')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
  } else if (file.endsWith('.woff2')) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
  } else if (file.endsWith('.gif')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
  } else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
  } else if (file.endsWith('.png')) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`
  } else {
    // TODO
    return ''
  }
}

export async function generateTemplate(
  { App, routes, cb }: { App: App } & Params & { cb: CallbackFn }, 
  url: string,
  template: string,
  request: Request,
  response: Response,
  manifest: object = {}) {
  const { vueSSR } = (await import('./vue'))

  function callbackFn(request: Request, response: Response) {
    return async function({ app, router, state }: { app: App, router: Router, state: any }) {
      return await cb({ app, router, state, request, response })
    }
  }
 
  // @ts-ignore
  const { app, router, state, head } = await vueSSR(App, { routes }, callbackFn(request, response), true, true)

  const $ = load(template)

  await router.push(url)
  await router.isReady()

  let redirect = null

  const ctx: SSRContext = {
    request,
    response,
    redirect: (url: string) => {
      redirect = url
    },
  }

  const html = await renderToString(app, ctx)
  $('#app').html(html)

  const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
  $('head').append(preloadLinks)

  const resolvedTags = await head.resolveTags() as HeadTag[]

  let tags = ['title', 'meta', 'link', 'base', 'style', 'script', 'noscript']

  if ($('title').length === 1) {
    tags = tags.filter(t => t !== 'title')
    const title = resolvedTags.find(t => t.tag === 'title')

    if (title !== undefined) {
      // @ts-ignore
      $('title').text(title.textContent)
    }
  }

  tags.map(tag => {
    resolvedTags.filter(t => t.tag === tag)
      .map(t => {
        let props = ''

        for (const [key, value] of Object.entries(t.props)) {
          props = `${props} ${key}="${value}"`
        }

        if (t.innerHTML !== undefined) {
          $('head').append(`<${tag} ${props}>${t.innerHTML}</${tag}>`)
        } else {
          $('head').append(`<${tag} ${props}>`)
        }
      })
  })

  const bodyAttrs = resolvedTags.find(t => t.tag === 'bodyAttrs')

  if (bodyAttrs !== undefined) {
    for (const [key, value] of Object.entries(bodyAttrs.props)) {
      $('body').attr(key, value)
    }
  }

  const htmlAttrs = resolvedTags.find(t => t.tag === 'htmlAttrs')

  if (htmlAttrs !== undefined) {
    for (const [key, value] of Object.entries(htmlAttrs.props)) {
      $('html').attr(key, value)
    }
  }

  if (state !== undefined) {
    $('body').append(`<script>window.__INITIAL_STATE__ = ${devalue(state.value)}</script>`)
  }

  const teleports = ctx.teleports ?? {}

  if (teleports['#teleports'] !== undefined) {
    $('body').append(`<div id="teleports">${teleports['#teleports']}</div>`)
  }

  return { html: $.html(), redirect }
}
