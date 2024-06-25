import { parse, HTMLElement } from 'node-html-parser'
import type { VueHeadClient, MergeHead } from '@unhead/vue'
import { State } from '../types'

export async function generateHtml(template: string,
                                   preloadLinks: string,
                                   rendered: string,
                                   teleports: Record<string, string>,
                                   state: State,
                                   head: VueHeadClient<MergeHead>,
                                   styles?: string) {
  const root = parse(template, { comment: true })

  root.getElementById('app')?.set_content(rendered)

  const htmlHead = root.querySelector('head')

  htmlHead?.insertAdjacentHTML('beforeend', preloadLinks)

  if (styles !== undefined) {
    htmlHead?.insertAdjacentHTML('beforeend', styles)
  }

  if (state.value !== undefined) {
    const { uneval } = await import('devalue')

    htmlHead?.insertAdjacentHTML('afterend', `<script>window.__INITIAL_STATE__ = ${uneval(state.value)}</script>`)
  }

  const body = root.querySelector('body')

  if (teleports['#teleports'] !== undefined) {
    body?.insertAdjacentHTML('afterend', `<div id="teleports">${teleports['#teleports']}</div>`)
  }

  const resolvedTags = await head.resolveTags()

  const htmlTitle = root.querySelector('title')

  if (htmlTitle !== null) {
    const title = resolvedTags.find(t => t.tag === 'title')

    if (title !== undefined) {
      htmlTitle.textContent = title.textContent ?? ''
    }
  }

  const allowedTags = ['meta', 'link', 'base', 'style', 'script', 'noscript']

  resolvedTags
    .filter(tag => tag.tag === allowedTags.find(allowed => allowed === tag.tag))
    .forEach(tag => {
      let props = ''

      for (const [key, value] of Object.entries(tag.props)) {
        props = `${props} ${key}="${value}"`
      }

      const el = new HTMLElement(tag.tag, {}, props)

      if (tag.innerHTML !== undefined) {
        el.textContent = tag.innerHTML
      }

      htmlHead?.appendChild(el)
    })

  const bodyAttrs = resolvedTags.find(t => t.tag === 'bodyAttrs')

  if (bodyAttrs !== undefined) {
    for (const [key, value] of Object.entries(bodyAttrs.props)) {
      body?.setAttribute(key, value)
    }
  }

  const htmlAttrs = resolvedTags.find(t => t.tag === 'htmlAttrs')
  const htmlRoot = root.querySelector('html')

  if (htmlAttrs !== undefined) {
    for (const [key, value] of Object.entries(htmlAttrs.props)) {
      htmlRoot?.setAttribute(key, value)
    }
  }

  return root.toString()
}
