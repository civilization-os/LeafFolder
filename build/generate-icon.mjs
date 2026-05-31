// Generate app icons from SVG source
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, 'icon.svg')
const outDir = __dirname

const sizes = [64, 128, 256, 512]

async function main() {
  const svg = fs.readFileSync(svgPath)

  for (const size of sizes) {
    const pngPath = path.join(outDir, `icon-${size}.png`)
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath)
    console.log(`✓ Generated ${size}x${size} → icon-${size}.png`)

    // Also save as icon.png (latest size, overwritten by biggest)
    if (size === 256) {
      await sharp(svg).resize(256, 256).png().toFile(path.join(outDir, 'icon.png'))
      console.log('✓ Generated 256x256 → icon.png')
    }
  }
}

main().catch(console.error)
