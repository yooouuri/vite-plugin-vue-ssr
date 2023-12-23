import type { SSRContext } from 'vue/server-renderer'
import { load } from 'cheerio'
import { ModuleNode } from 'vite'
import type { VueHeadClient, MergeHead } from '@unhead/vue'
import { basename } from 'node:path'
import { State } from '../types'
import { renderCssForSsr } from './renderCssForSsr'

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

export async function generateHtml(template: string,
                                   rendered: string,
                                   ctx: SSRContext,
                                   state: State,
                                   head: VueHeadClient<MergeHead>,
                                   cssModules?: Set<ModuleNode>,
                                   manifest?: object) {
  const $ = load(template)

  $('#app').html(rendered)

  const preloadLinks = renderPreloadLinks(ctx.modules, manifest ?? {})
  $('head').append(preloadLinks)

  if (cssModules !== undefined) {
    const styles = renderCssForSsr(cssModules)
    $('head').append(styles)
  }

  if (state.value !== undefined) {
    const { uneval } = await import('devalue')

    $('body').append(`<script>window.__INITIAL_STATE__ = ${uneval(state.value)}</script>`)
  }

  const teleports = ctx.teleports ?? {}

  if (teleports['#teleports'] !== undefined) {
    $('body').append(`<div id="teleports">${teleports['#teleports']}</div>`)
  }

  const resolvedTags = await head.resolveTags()

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
    resolvedTags
      .filter(t => t.tag === tag)
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

  return $.html()
}
