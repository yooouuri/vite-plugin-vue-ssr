import { SSRContext } from 'vue/server-renderer'
import { load } from 'cheerio'
import { ModuleNode } from 'vite'
import type { Head } from '@unhead/schema'
import { basename } from 'node:path'
import { State } from '../types'

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

function renderCssForSsr(mods: Set<ModuleNode>, styles = new Map<string, string>(), checkedComponents = new Set()) {
  for (const mod of mods) {
    if ((mod.file?.endsWith('.scss')
        || mod.file?.endsWith('.css')
        || mod.id?.includes('vue&type=style')) &&
      mod.ssrModule
    ) {
      styles.set(mod.id, mod.ssrModule.default)
    }

    if (mod.importedModules.size > 0 && !checkedComponents.has(mod.id)) {
      checkedComponents.add(mod.id)

      renderCssForSsr(mod.importedModules, styles, checkedComponents)
    }
  }

  let result = ''

  // TODO: reduce
  styles.forEach((content, id) => {
    result = result.concat(`<style type="text/css" data-vite-dev-id="${id}">${content}</style>`)
  })

  return result
}

export async function generateHtml(template: string,
                                   rendered: string,
                                   modules: Set<ModuleNode>,
                                   ctx: SSRContext,
                                   state: State,
                                   head: Head) {
  const $ = load(template)

  $('#app').html(rendered)

  const preloadLinks = renderPreloadLinks(ctx.modules, {})
  $('head').append(preloadLinks)

  const styles = renderCssForSsr(modules)
  $('head').append(styles)

  if (state !== undefined) {
    const devalue = (await import('@nuxt/devalue')).default
    $('body').append(`<script>window.__INITIAL_STATE__ = ${devalue(state.value)}</script>`)
  }

  return $.html()
}
