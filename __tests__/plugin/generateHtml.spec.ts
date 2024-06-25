import { describe, expect, it } from 'vitest'
import { generateHtml } from '../../src/plugin/generateHtml'
import { type SSRContext, renderToString } from 'vue/server-renderer'
import { createSSRApp, defineComponent } from 'vue'
import { createHead, useHead } from '@unhead/vue'
import { parse } from 'node-html-parser'

describe('generate html', () => {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="/favicon.ico">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`

  it('should render html without modifications', async () => {
    const app = createSSRApp({
      template: `<div>{{ count }}</div>`,
      setup() {
        const count = 0
    
        return {
          count,
        }
      }
    })

    const head = createHead()
    app.use(head)

    const rendered = await renderToString(app, {})

    const output = await generateHtml(html, '', rendered, {}, {}, head)

    const root = parse(output, { comment: true })

    expect(root.querySelector('body')?.querySelector('#teleports')).toBeNull()
    expect(root.querySelector('title')?.textContent).toBe('Vite App')
    expect(root.querySelector('#app')?.textContent).toContain('0')
  })

  it('should change the title to "Hey"', async () => {
    const app = createSSRApp({
      template: `<div>{{ count }}</div>`,
      setup() {
        const count = 0

        useHead({
          title: 'Hey',
        })
    
        return {
          count,
        }
      }
    })

    const head = createHead()
    app.use(head)

    const rendered = await renderToString(app, {})

    const output = await generateHtml(html, '', rendered, {}, {}, head)

    const root = parse(output, { comment: true })

    expect(root.querySelector('title')?.textContent).toBe('Hey')
  })

  it('should create a teleports div with teleports', async () => {
    const teleported = defineComponent({
      template: '<div data-testid="teleported">Im teleported into #teleports</div>',
    })

    const app = createSSRApp({
      template: `<Teleport to="#teleports"><Teleported /></Teleport>`,
      components: {
        Teleported: teleported,
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const teleportedElement = root.querySelector('div[data-testid="teleported"]')

    expect(root.querySelector('#teleports')?.parentNode.rawTagName).toBe('body')
    expect(teleportedElement?.parentNode.id).toBe('teleports')
    expect(teleportedElement?.parentNode.rawTagName).toBe('div')
  })

  it('should add attributes to the body', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          bodyAttrs: {
            class: 'm-4',
            id: 'container',
          },
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const attributes = root.querySelector('body')?.attributes

    expect(attributes).toHaveProperty('class')
    expect(attributes).toHaveProperty('id')
    expect(attributes?.id).toBe('container')
    expect(attributes?.class).toBe('m-4')
  })

  it('should add attributes to the html', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          htmlAttrs: {
            class: 'm-4',
            id: 'container',
          },
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const attributes = root.querySelector('html')?.attributes

    expect(attributes).toHaveProperty('class')
    expect(attributes).toHaveProperty('id')
    expect(attributes?.id).toBe('container')
    expect(attributes?.class).toBe('m-4')
  })

  it('should add meta tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          meta: [
            {
              name: 'description',
              content: 'My page description',
            },
          ]
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const meta = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'meta'))
      .find(node => node.rawAttrs.includes('name="description" content="My page description"'))

    expect(meta).not.toBeUndefined()
  })

  it('should add link tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          link: [
            {
              rel: 'stylesheet',
              href: 'styles.css',
            },
          ]
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const meta = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'link'))
      .find(node => node.rawAttrs.includes('rel="stylesheet" href="styles.css"'))

    expect(meta).not.toBeUndefined()
  })

  it('should add noscript tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          noscript: [
            {
              textContent: 'Javascript is required',
            },
          ]
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const noscript = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'noscript'))

    expect(noscript).not.toBeUndefined()
    expect(noscript?.length).not.toBe(0)
    expect(noscript[0].childNodes[0].text).toBe('Javascript is required')
  })

  it('should add style tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          style: [
            {
              innerHTML: 'body {color: red}',
            },
          ]
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const style = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'style'))

    expect(style).not.toBeUndefined()
    expect(style?.length).not.toBe(0)
    expect(style[0]?.childNodes[0].text).toBe('body {color: red}')
  })

  it('should add script tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          script: [
            {
              innerHTML: 'const foo = \'bar\';',
            },
          ]
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const script = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'script'))

    expect(script).not.toBeUndefined()
    expect(script?.length).not.toBe(0)
    expect(script[0]?.childNodes[0].text).toBe('const foo = \'bar\';')
  })

  it('should add base tag to the head', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
      setup: () => {
        useHead({
          base: {
            href: 'https://www.w3schools.com/',
            target: '_blank',
          },
        })
      },
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, {}, head)

    const root = parse(output, { comment: true })

    const base = root.querySelector('head')?.childNodes
      .filter((node => node.rawTagName === 'base'))
      .find(node => node.rawAttrs.includes('href="https://www.w3schools.com/" target="_blank"'))

    expect(base).not.toBeUndefined()
  })

  it('should render a script block with state added to the window object', async () => {
    const app = createSSRApp({
      template: `<div>Hey</div>`,
    })

    const head = createHead()
    app.use(head)

    const ctx: SSRContext = {}

    const rendered = await renderToString(app, ctx)

    const state = {
      value: {
        foo: 'bar',
      },
    }

    const output = await generateHtml(html, '', rendered, ctx.teleports ?? {}, state, head)

    const root = parse(output, { comment: true })

    expect(root.querySelector('body > script#state')?.childNodes[0].text).toBe(`window.__INITIAL_STATE__ = {foo:"bar"}`)
  })
})
