import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import { createApp, defineEventHandler, fromNodeMiddleware, toNodeListener } from 'h3'
import { generateTemplate } from 'vite-plugin-vue-ssr/plugin'
import serveStatic from 'serve-static'

const __dirname = dirname(fileURLToPath(import.meta.url))

const main = (await import(resolve(__dirname, './dist/server/main.js'))).default

const template = readFileSync(resolve('dist/client/index.html'), 'utf-8')

const manifest = JSON.parse(
  readFileSync(resolve('dist/client/.vite/ssr-manifest.json'), 'utf-8')
)

const app = createApp()

app.use(fromNodeMiddleware(serveStatic(resolve('dist/client'), { index: false })))
app.use(defineEventHandler(async (event) => {
  const url = event.node.req.originalUrl ?? '/'

  const { html, redirect } = await generateTemplate(main, url, template, event, manifest)

  return html
}))

createServer(toNodeListener(app)).listen(3000, () => console.log('server listening on 3000'))
