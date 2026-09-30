/**
 * Regenerates the motion-scheme spring tokens in src/styles/tokens.css
 * (the region between the `motion-scheme:generated` markers) from the Compose
 * spring parameters in src/tokens/motion.ts. See that module's header for
 * the derivation (spring ODE → settle duration → sampled `linear()` easing).
 *
 *   node scripts/generate-motion-tokens.ts          # rewrite tokens.css
 *   node scripts/generate-motion-tokens.ts --print  # print the region only
 *
 * Runs on Node >= 22.18 (native TypeScript type stripping).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  MOTION_TOKENS_END,
  MOTION_TOKENS_START,
  motionSchemeCssBlock,
  schemeSprings,
} from '../src/theme/motionScheme.ts'
import { effectsSprings, spatialSprings } from '../src/tokens/motion.ts'

const block = motionSchemeCssBlock(
  schemeSprings(spatialSprings, effectsSprings),
)

if (process.argv.includes('--print')) {
  console.log(block)
} else {
  const file = fileURLToPath(
    new URL('../src/styles/tokens.css', import.meta.url),
  )
  const css = readFileSync(file, 'utf8')
  const start = css.indexOf(MOTION_TOKENS_START)
  const end = css.indexOf(MOTION_TOKENS_END)
  if (start === -1 || end === -1) {
    throw new Error('motion-scheme markers not found in tokens.css')
  }
  const next =
    css.slice(0, start) + block + css.slice(end + MOTION_TOKENS_END.length)
  writeFileSync(file, next)
  console.log(
    next === css ? 'tokens.css already up to date' : 'tokens.css updated',
  )
}
