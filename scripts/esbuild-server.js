// Bundles server/src/index.ts into server/dist/bundle.js for Docker.
// @kt82/shared is inlined; all other server deps remain external (loaded from node_modules at runtime).
const { buildSync } = require('esbuild')
const path = require('path')

const { dependencies } = require(path.join(__dirname, '../server/package.json'))

const external = Object.keys(dependencies || {}).filter(
  dep => dep !== '@kt82/shared' && !dep.startsWith('@types/')
)

buildSync({
  entryPoints: [path.join(__dirname, '../server/src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(__dirname, '../server/dist/bundle.js'),
  external,
  format: 'cjs',
})

console.log('Server bundled to server/dist/bundle.js')
