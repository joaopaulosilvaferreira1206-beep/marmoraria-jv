const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const version = pkg.version
const releaseDir = path.resolve('release')

const exeFile = fs.readdirSync(releaseDir).find(f => f.endsWith('.exe'))
if (!exeFile) { console.error('Nenhum .exe em release/'); process.exit(1) }

const buf = fs.readFileSync(path.join(releaseDir, exeFile))
const sha512 = crypto.createHash('sha512').update(buf).digest('base64')
const size = buf.length

const yml = `version: ${version}
files:
  - url: ${exeFile}
    sha512: ${sha512}
    size: ${size}
path: ${exeFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`

fs.writeFileSync(path.join(releaseDir, 'latest.yml'), yml)
console.log(`latest.yml gerado: ${exeFile} (${size} bytes)`)
