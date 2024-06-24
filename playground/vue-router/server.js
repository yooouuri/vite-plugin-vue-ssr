import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, defineEventHandler } from 'h3'
import { generateTemplate } from 'vite-plugin-vue-ssr/plugin'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = (await import(resolve(__dirname, './dist/server/main.js'))).default

const template = readFileSync(resolve('dist/client/index.html'), 'utf-8')

const manifest = JSON.parse(
  readFileSync(resolve('dist/client/.vite/ssr-manifest.json'), 'utf-8')
)

const app = createApp()

// app.use('/', serveStatic(resolve('dist/client'), { index: false }))
app.use(defineEventHandler(async (event) => {
  const url = event.node.req.originalUrl ?? '/'

  const { html, redirect } = await generateTemplate(main, url, template, event, manifest)

  return html
}))
