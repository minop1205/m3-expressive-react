// Minimal static file server for the VRT web server (no dependencies).
// Usage: node scripts/serve-static.mjs <dir> <port>
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'

const [dir = 'storybook-static', port = '6906'] = process.argv.slice(2)
const root = resolve(dir)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
}

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let filePath = normalize(join(root, urlPath))
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }
  if (!existsSync(filePath)) {
    res.writeHead(404).end('not found')
    return
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  })
  createReadStream(filePath).pipe(res)
}).listen(Number(port), '127.0.0.1', () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}`)
})
