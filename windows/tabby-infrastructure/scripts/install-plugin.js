const fs = require('fs')
const path = require('path')

const targetDir = '/mnt/c/Users/vibis/AppData/Roaming/tabby/plugins/node_modules/tabby-infrastructure'

console.log('Installing tabby-infrastructure to:', targetDir)

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true })
}

fs.mkdirSync(path.join(targetDir, 'dist'), { recursive: true })
fs.copyFileSync(path.join(__dirname, '../package.json'), path.join(targetDir, 'package.json'))

// Copy dist directory
const distSrc = path.join(__dirname, '../dist')
if (fs.existsSync(distSrc)) {
  for (const file of fs.readdirSync(distSrc)) {
    fs.copyFileSync(path.join(distSrc, file), path.join(targetDir, 'dist', file))
  }
}

console.log('Successfully installed tabby-infrastructure!')
console.log('Restart Tabby or reload (Ctrl+Shift+R) to use the plugin.')
