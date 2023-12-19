import { SSRContext, renderToString } from 'vue/server-renderer'
import { load } from 'cheerio'
import devalue from '@nuxt/devalue'
import { basename } from 'node:path'
import type { App } from 'vue'
import type { HeadTag } from '@vueuse/head'
import type { Request, Response } from 'express'
import type { Params, CallbackFn } from '../types'
import {ModuleNode, ViteDevServer} from "vite";

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

// export async function generateTemplate(
//   { App, routes, cb }: { App: App } & Params & { cb: CallbackFn },
//   url: string,
//   template: string,
//   request: Request,
//   response: Response,
//   manifest: object = {}) {
//   // const { vueSSR } = (await import('./vue'))
//   //
//   // const { app, router, state, head } = vueSSR(App, { routes }, undefined, true, true)
//   //
//   // if (cb !== undefined) {
//   //   cb({ app, router, state, request, response })
//   // }
//   //
//   // const $ = load(template)
//   //
//   // await router.push(url)
//   // await router.isReady()
//
//   let redirect = null
//
//   const ctx: SSRContext = {
//     request,
//     response,
//     redirect: (url: string) => {
//       redirect = url
//     },
//   }
//
//   const html = await renderToString(app, ctx)
//   $('#app').html(html)
//
//   const preloadLinks = renderPreloadLinks(ctx.modules, manifest)
//   $('head').append(preloadLinks)
//
//   const resolvedTags = await head.resolveTags() as HeadTag[]
//
//   let tags = ['title', 'meta', 'link', 'base', 'style', 'script', 'noscript']
//
//   if ($('title').length === 1) {
//     tags = tags.filter(t => t !== 'title')
//     const title = resolvedTags.find(t => t.tag === 'title')
//
//     if (title !== undefined) {
//       // @ts-ignore
//       $('title').text(title.textContent)
//     }
//   }
//
//   tags.map(tag => {
//     resolvedTags.filter(t => t.tag === tag)
//       .map(t => {
//         let props = ''
//
//         for (const [key, value] of Object.entries(t.props)) {
//           props = `${props} ${key}="${value}"`
//         }
//
//         if (t.innerHTML !== undefined) {
//           $('head').append(`<${tag} ${props}>${t.innerHTML}</${tag}>`)
//         } else {
//           $('head').append(`<${tag} ${props}>`)
//         }
//       })
//   })
//
//   const bodyAttrs = resolvedTags.find(t => t.tag === 'bodyAttrs')
//
//   if (bodyAttrs !== undefined) {
//     for (const [key, value] of Object.entries(bodyAttrs.props)) {
//       $('body').attr(key, value)
//     }
//   }
//
//   const htmlAttrs = resolvedTags.find(t => t.tag === 'htmlAttrs')
//
//   if (htmlAttrs !== undefined) {
//     for (const [key, value] of Object.entries(htmlAttrs.props)) {
//       $('html').attr(key, value)
//     }
//   }
//
//   if (state !== undefined) {
//     $('body').append(`<script>window.__INITIAL_STATE__ = ${devalue(state.value)}</script>`)
//   }
//
//   const teleports = ctx.teleports ?? {}
//
//   if (teleports['#teleports'] !== undefined) {
//     $('body').append(`<div id="teleports">${teleports['#teleports']}</div>`)
//   }
//
//   return { html: $.html(), redirect }
// }

export async function generateHtml(template: string,
                                   rendered: string,
                                   modules: Set<ModuleNode>,
                                   ctx: SSRContext) {
  function collectCss(
    mods: Set<ModuleNode>,
    styles = new Map<string, string>(),
    checkedComponents = new Set(),
  ) {
    for (const mod of mods) {
      if (
        (mod.file?.endsWith(".scss") ||
          mod.file?.endsWith(".css") ||
          mod.id?.includes("vue&type=style")) &&
        mod.ssrModule
      ) {
        styles.set(mod.id, mod.ssrModule.default);
      }
      if (mod.importedModules.size > 0 && !checkedComponents.has(mod.id)) {
        checkedComponents.add(mod.id);
        collectCss(mod.importedModules, styles, checkedComponents);
      }
    }

    let result: string[] = []
    styles.forEach((content, id) => {
      const styleTag = `<style type="text/css" data-vite-dev-id="${id}">${content}</style>`;
      result.push(styleTag)
    });
    return result;
  }

  const $ = load(template)

  $('#app').html(rendered)

  const preloadLinks = renderPreloadLinks(ctx.modules, {})
  $('head').append(preloadLinks)

  const result = collectCss(modules)

  for (const tag of result) {
    $('head').append(tag)
  }

  console.log($.html())

  return $.html()
}
