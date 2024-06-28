import { parse } from 'node-html-parser'
import type { VueHeadClient, MergeHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { State } from '../types'

function rawAttributesToAttributes(raw: string) {
  const attrs: Record<string, any> = {}

  const re = /([a-zA-Z()[\]#@$.?:][a-zA-Z0-9-_:()[\]#]*)(?:\s*=\s*((?:'[^']*')|(?:"[^"]*")|\S+))?/g
  let match

  while ((match = re.exec(raw))) {
    const key = match[1]
    let val = match[2] || null
    if (val && (val[0] === `'` || val[0] === `"`)) val = val.slice(1, val.length - 1)
    attrs[key] = attrs[key] || val
  }

  return attrs
}

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

  const body = root.querySelector('body')
  const html = root.querySelector('html')

  if (state.value !== undefined) {
    const { uneval } = await import('devalue')

    body?.insertAdjacentHTML('beforeend', `<script id="state">window.__INITIAL_STATE__ = ${uneval(state.value)}</script>`)
  }

  if (teleports['#teleports'] !== undefined) {
    body?.insertAdjacentHTML('beforeend', `<div id="teleports">${teleports['#teleports']}</div>`)
  }

  const payload = await renderSSRHead(head)

  if (payload.headTags.includes('<title>')) {
    root.querySelector('title')?.remove()
  }

  htmlHead?.insertAdjacentHTML('afterbegin', payload.headTags)
  html?.setAttributes(rawAttributesToAttributes(payload.htmlAttrs))
  body?.setAttributes(rawAttributesToAttributes(payload.bodyAttrs))
  body?.insertAdjacentHTML('afterbegin', payload.bodyTagsOpen)
  body?.insertAdjacentHTML('beforeend', payload.bodyTags)

  return root.toString()
}
