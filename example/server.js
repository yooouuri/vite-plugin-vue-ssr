import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateTemplate } from 'vite-plugin-vue-ssr/plugin'
import express from 'express'
import cookieParser from 'cookie-parser'
import serveStatic from 'serve-static'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()

app.use(cookieParser())
app.use('/', serveStatic(resolve('dist/client'), { index: false }))
app.use('*', async (req, res) => {
  const url = req.originalUrl

  const main = (await import(resolve(__dirname, './dist/server/main.js'))).default

  const template = readFileSync(resolve('dist/client/index.html'), 'utf-8')

  const manifest = JSON.parse(
    readFileSync(resolve('dist/client/ssr-manifest.json'), 'utf-8')
  )

  const { html, redirect } = await generateTemplate(main, url, template, req, res, manifest)

  if (redirect !== null) {
    res.redirect(redirect)
    return
  }

  res.status(200)
    .set({ 'Content-Type': 'text/html' })
    .end(html)
})

app.listen(3000, () => {
  console.log('http://localhost:3000')
})
