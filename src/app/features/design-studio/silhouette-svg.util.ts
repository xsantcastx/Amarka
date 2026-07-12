import { SilhouetteId } from './product-catalog.types';

/**
 * Single source of truth for every product silhouette.
 *
 * Both the editor (ProductSilhouetteComponent renders this markup inline) and
 * the mockup generator (drawn onto an offscreen <canvas>) consume these
 * strings, so the customer always sees the exact artwork that lands in the
 * quote email.
 *
 * Conventions:
 *  - shared 400x500 viewBox
 *  - garment body filled with the chosen product color
 *  - construction details (seams, ribbing, collars) drawn with translucent
 *    black/white overlays so they read on any fabric color
 */
export function silhouetteSvgMarkup(silhouette: SilhouetteId, colorHex: string): string {
  const body = SILHOUETTE_PATHS[silhouette]?.(colorHex) ?? `<rect fill="${colorHex}" x="100" y="100" width="200" height="300" rx="12" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">${body}</svg>`;
}

const SHADOW = `<ellipse cx="200" cy="470" rx="130" ry="12" fill="rgba(0,0,0,0.08)" />`;
const DARK = 'rgba(0,0,0,0.14)';
const DARKER = 'rgba(0,0,0,0.22)';
const LIGHT = 'rgba(255,255,255,0.16)';

/* Short-sleeve tee body shared by t-shirt & polo (polo layers its collar on top). */
function teeBody(c: string, neck: 'crew' | 'polo'): string {
  const neckline =
    neck === 'crew'
      ? `<path fill="none" stroke="${DARKER}" stroke-width="7" d="M164 76 Q200 108 236 76" />
         <path fill="none" stroke="${LIGHT}" stroke-width="2.5" d="M162 82 Q200 116 238 82" />`
      : '';
  return `
    ${SHADOW}
    <path fill="${c}" d="M163 74
      Q200 100 237 74
      L272 87 L340 132 L321 197 Q316 205 306 202 L272 184
      L272 428 Q272 440 260 442 Q200 452 140 442 Q128 440 128 428 L128 184
      L94 202 Q84 205 79 197 L60 132 L128 87 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M272 184 L272 92" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M128 184 L128 92" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M306 199 L318 160" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M94 199 L82 160" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M136 432 Q200 442 264 432" />
    ${neckline}`;
}

function teeBackBody(c: string): string {
  return `
    ${SHADOW}
    <path fill="${c}" d="M160 72 Q200 82 240 72
      L272 87 L340 132 L321 197 Q316 205 306 202 L272 184
      L272 428 Q272 440 260 442 Q200 452 140 442 Q128 440 128 428 L128 184
      L94 202 Q84 205 79 197 L60 132 L128 87 Z" />
    <path fill="none" stroke="${DARKER}" stroke-width="6" d="M162 74 Q200 88 238 74" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M272 184 L272 92" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M128 184 L128 92" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M136 432 Q200 442 264 432" />`;
}

/* Long-sleeve body shared by hoodie / sweatshirt / long-sleeve tee. */
function longSleeveBody(c: string, opts: { cuffs?: boolean; hemBand?: boolean } = {}): string {
  const cuffs = opts.cuffs
    ? `<path fill="none" stroke="${DARKER}" stroke-width="4" d="M60 356 L106 372" />
       <path fill="none" stroke="${DARKER}" stroke-width="4" d="M340 356 L294 372" />
       <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M58 366 L104 382" />
       <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M342 366 L296 382" />`
    : '';
  const hem = opts.hemBand
    ? `<path fill="none" stroke="${DARKER}" stroke-width="4" d="M132 420 Q200 432 268 420" />
       <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M133 430 Q200 441 267 430" />`
    : `<path fill="none" stroke="${DARK}" stroke-width="2.5" d="M136 432 Q200 442 264 432" />`;
  return `
    ${SHADOW}
    <path fill="${c}" d="M163 74
      Q200 100 237 74
      L274 88 L330 126 L352 340 Q353 352 342 356 L302 370 Q292 373 289 362 L272 250
      L272 428 Q272 440 260 442 Q200 452 140 442 Q128 440 128 428 L128 250
      L111 362 Q108 373 98 370 L58 356 Q47 352 48 340 L70 126 L126 88 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M272 240 L274 96" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M128 240 L126 96" />
    ${cuffs}
    ${hem}`;
}

const SILHOUETTE_PATHS: Record<SilhouetteId, (colorHex: string) => string> = {
  /* ── T-shirt ─────────────────────────────────────────────── */
  'shirt-front': c => teeBody(c, 'crew'),
  'shirt-back': c => teeBackBody(c),

  /* ── Polo ────────────────────────────────────────────────── */
  'polo-front': c => `
    ${teeBody(c, 'polo')}
    <path fill="${c}" stroke="${DARKER}" stroke-width="3" d="M163 74 L184 98 L200 88 L216 98 L237 74 L244 86 L214 116 L200 106 L186 116 L156 86 Z" />
    <rect fill="none" stroke="${DARK}" stroke-width="2.5" x="192" y="104" width="16" height="46" rx="3" />
    <circle cx="200" cy="120" r="3" fill="${DARKER}" />
    <circle cx="200" cy="138" r="3" fill="${DARKER}" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M312 186 L326 176" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M88 186 L74 176" />`,
  'polo-back': c => `
    ${teeBackBody(c)}
    <path fill="${c}" stroke="${DARKER}" stroke-width="3" d="M158 72 Q200 92 242 72 L246 84 Q200 106 154 84 Z" />`,

  /* ── Hoodie ──────────────────────────────────────────────── */
  'hoodie-front': c => `
    ${longSleeveBody(c, { cuffs: true, hemBand: true })}
    <path fill="${c}" stroke="${DARKER}" stroke-width="3.5" d="M146 92 Q140 46 200 40 Q260 46 254 92 Q256 106 240 110 Q200 132 160 110 Q144 106 146 92 Z" />
    <path fill="none" stroke="${DARKER}" stroke-width="3" d="M164 100 Q160 62 200 56 Q240 62 236 100 Q220 118 200 118 Q180 118 164 100 Z" />
    <path fill="none" stroke="${DARKER}" stroke-width="3" stroke-linecap="round" d="M186 118 L182 158" />
    <path fill="none" stroke="${DARKER}" stroke-width="3" stroke-linecap="round" d="M214 118 L218 158" />
    <circle cx="182" cy="162" r="3.5" fill="${DARKER}" />
    <circle cx="218" cy="162" r="3.5" fill="${DARKER}" />
    <path fill="none" stroke="${DARKER}" stroke-width="3.5" d="M148 330 L164 296 L236 296 L252 330 L252 408 L148 408 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M164 300 L164 404" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M236 300 L236 404" />`,
  'hoodie-back': c => `
    ${longSleeveBody(c, { cuffs: true, hemBand: true })}
    <path fill="${c}" stroke="${DARKER}" stroke-width="3.5" d="M150 96 Q142 44 200 38 Q258 44 250 96 Q240 112 200 116 Q160 112 150 96 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M200 116 L200 436" />`,

  /* ── Long-sleeve tee ─────────────────────────────────────── */
  'longsleeve-front': c => `
    ${longSleeveBody(c, { cuffs: true })}
    <path fill="none" stroke="${DARKER}" stroke-width="7" d="M164 76 Q200 108 236 76" />
    <path fill="none" stroke="${LIGHT}" stroke-width="2.5" d="M162 82 Q200 116 238 82" />`,
  'longsleeve-back': c => `
    ${longSleeveBody(c, { cuffs: true })}
    <path fill="none" stroke="${DARKER}" stroke-width="6" d="M162 74 Q200 88 238 74" />`,

  /* ── Sweatshirt ──────────────────────────────────────────── */
  'sweatshirt-front': c => `
    ${longSleeveBody(c, { cuffs: true, hemBand: true })}
    <path fill="none" stroke="${DARKER}" stroke-width="9" d="M162 78 Q200 106 238 78" />
    <path fill="none" stroke="${LIGHT}" stroke-width="2.5" d="M160 86 Q200 116 240 86" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M170 92 Q200 116 230 92" />`,
  'sweatshirt-back': c => `
    ${longSleeveBody(c, { cuffs: true, hemBand: true })}
    <path fill="none" stroke="${DARKER}" stroke-width="7" d="M160 76 Q200 92 240 76" />`,

  /* ── Sleeves (print-area views) ──────────────────────────── */
  'sleeve-left': c => `
    ${SHADOW}
    <path fill="${c}" d="M168 58 Q226 54 248 104 L266 316 Q268 336 248 342 Q200 354 152 342 Q132 336 134 316 L152 104 Q158 70 168 58 Z" />
    <path fill="none" stroke="${DARKER}" stroke-width="4" d="M140 322 Q200 338 260 322" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M141 332 Q200 347 259 332" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M156 96 Q200 84 244 96" />`,
  'sleeve-right': c => `
    ${SHADOW}
    <path fill="${c}" d="M232 58 Q174 54 152 104 L134 316 Q132 336 152 342 Q200 354 248 342 Q268 336 266 316 L248 104 Q242 70 232 58 Z" />
    <path fill="none" stroke="${DARKER}" stroke-width="4" d="M140 322 Q200 338 260 322" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M141 332 Q200 347 259 332" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M156 96 Q200 84 244 96" />`,

  /* ── Drinkware ───────────────────────────────────────────── */
  'mug-front': c => `
    ${SHADOW}
    <path fill="none" stroke="${c}" stroke-width="26" d="M292 176 Q348 176 348 240 Q348 304 292 304" />
    <path fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="26" d="M292 176 Q348 176 348 240 Q348 304 292 304" opacity="0.3" />
    <rect fill="${c}" x="108" y="118" width="184" height="264" rx="16" />
    <path fill="${LIGHT}" d="M120 130 Q124 122 134 122 L134 378 Q124 378 120 370 Z" />
    <ellipse cx="200" cy="122" rx="88" ry="9" fill="rgba(0,0,0,0.18)" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M112 368 Q200 384 288 368" />`,
  'mug-handle': c => `
    ${SHADOW}
    <path fill="none" stroke="${c}" stroke-width="30" d="M282 162 Q364 162 364 240 Q364 318 282 318" />
    <path fill="none" stroke="rgba(0,0,0,0.14)" stroke-width="6" d="M282 148 Q378 152 378 240 Q378 328 282 332" />
    <rect fill="${c}" x="108" y="118" width="184" height="264" rx="16" />
    <path fill="${LIGHT}" d="M120 130 Q124 122 134 122 L134 378 Q124 378 120 370 Z" />
    <ellipse cx="200" cy="122" rx="88" ry="9" fill="rgba(0,0,0,0.18)" />`,
  'tumbler-wrap': c => `
    ${SHADOW}
    <path fill="${c}" d="M146 92 L254 92 L262 388 Q262 406 244 412 Q200 424 156 412 Q138 406 138 388 Z" />
    <path fill="rgba(0,0,0,0.16)" d="M142 66 L258 66 Q264 66 264 74 L262 92 L138 92 L136 74 Q136 66 142 66 Z" />
    <ellipse cx="200" cy="66" rx="58" ry="8" fill="rgba(0,0,0,0.22)" />
    <path fill="${LIGHT}" d="M152 100 L164 100 L170 408 Q160 406 156 402 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M140 122 L260 122" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M142 382 Q200 398 258 382" />`,
  'bottle-wrap': c => `
    ${SHADOW}
    <rect fill="rgba(0,0,0,0.24)" x="176" y="42" width="48" height="26" rx="6" />
    <path fill="${c}" d="M172 68 L228 68 L228 104 Q272 132 272 192 L272 408 Q272 426 254 432 Q200 446 146 432 Q128 426 128 408 L128 192 Q128 132 172 104 Z" />
    <path fill="${LIGHT}" d="M140 190 Q140 140 176 112 L188 112 Q150 144 150 194 L150 420 Q144 418 140 412 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M130 200 L270 200" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M132 402 Q200 418 268 402" />`,

  /* ── Promo ───────────────────────────────────────────────── */
  'hat-front': c => `
    <ellipse cx="200" cy="330" rx="140" ry="12" fill="rgba(0,0,0,0.08)" />
    <path fill="${c}" d="M92 258 Q98 136 200 128 Q302 136 308 258 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M152 140 Q142 196 144 258" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M248 140 Q258 196 256 258" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M200 128 L200 258" />
    <circle cx="200" cy="124" r="7" fill="${c}" stroke="${DARKER}" stroke-width="2.5" />
    <path fill="${c}" stroke="${DARKER}" stroke-width="3" d="M84 258 L316 258 Q330 284 310 300 Q200 322 90 300 Q70 284 84 258 Z" />
    <path fill="${LIGHT}" d="M96 262 L304 262 Q310 274 300 284 Q200 302 100 284 Q90 274 96 262 Z" opacity="0.5" />`,
  'tote-front': c => `
    ${SHADOW}
    <path fill="none" stroke="${c}" stroke-width="15" stroke-linecap="round" d="M152 138 L152 78 Q200 40 248 78 L248 138" />
    <path fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="4" d="M152 128 L152 78 Q200 42 248 78 L248 128" />
    <path fill="${c}" d="M96 140 Q96 132 104 132 L296 132 Q304 132 304 140 L288 416 Q287 428 275 431 Q200 448 125 431 Q113 428 112 416 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M100 158 L300 158" />
    <path fill="${LIGHT}" d="M110 166 L122 166 L128 428 Q118 425 116 418 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M118 420 Q200 436 282 420" />`,
  'tote-back': c => `
    ${SHADOW}
    <path fill="none" stroke="${c}" stroke-width="15" stroke-linecap="round" opacity="0.55" d="M152 138 L152 78 Q200 40 248 78 L248 138" />
    <path fill="${c}" d="M96 140 Q96 132 104 132 L296 132 Q304 132 304 140 L288 416 Q287 428 275 431 Q200 448 125 431 Q113 428 112 416 Z" />
    <path fill="none" stroke="${DARK}" stroke-width="3" d="M100 158 L300 158" />
    <path fill="none" stroke="${DARK}" stroke-width="2.5" d="M118 420 Q200 436 282 420" />`,
};
