import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTemplate } from 'vite-plugin-vue-ssr/plugin'
import express from 'express'

const app = express()

const __dirname = dirname(fileURLToPath(import.meta.url))

app.use(
  '/',
  (await import('serve-static')).default(resolve('dist/client'), {
    index: false,
  }),
)
app.use('*', async (req, res) => {
  const url = req.originalUrl

  const main = (await import(resolve(__dirname, './dist/server/main.js'))).default

  const template = readFileSync(resolve('dist/client/index.html'), 'utf-8')

  const manifest = JSON.parse(
    readFileSync(resolve('dist/client/ssr-manifest.json'), 'utf-8'),
  )

  const html = await generateTemplate(main, url, template, req, res, manifest)

  // when html is undefined, the route is redirected
  if (html === undefined) {
    return
  }

  res.end(html)
})

app.listen(3000, () => {
  console.log('http://localhost:3000')
})
