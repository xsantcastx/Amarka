
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "preload": [
      "chunk-5TNF7YIN.js",
      "chunk-TG7RGSM4.js"
    ],
    "route": "/"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-HQOEZ7YR.js",
      "chunk-MD3T3OE3.js",
      "chunk-TG7RGSM4.js"
    ],
    "route": "/enquire"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-ISI67BQB.js",
      "chunk-MD3T3OE3.js",
      "chunk-TG7RGSM4.js"
    ],
    "route": "/design"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-W5AHHP7R.js"
    ],
    "route": "/privacy-policy"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-RZNDDZ5T.js"
    ],
    "route": "/cookie-policy"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-D5BPJG2S.js"
    ],
    "route": "/terms"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-7XXFPJFT.js"
    ],
    "route": "/maintenance"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-LC7MEEVS.js"
    ],
    "route": "/404"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-LC7MEEVS.js"
    ],
    "route": "/500"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-LC7MEEVS.js"
    ],
    "route": "/offline"
  },
  {
    "renderMode": 2,
    "redirectTo": "/404",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 16440, hash: 'e9bf3fcdadad9c156bc0b90260c632c7b0700a224221bb2c56e9d8695887602d', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 7923, hash: '8f82b58b0ad803340a8cedbe0ebcb04ea5505594d5b068f3434029e281482ad5', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    '404/index.html': {size: 99134, hash: '3abd1ec997770fca384486d125d55a5c7ca9d002ac3d420c09706830bd9e6a02', text: () => import('./assets-chunks/404_index_html.mjs').then(m => m.default)},
    'enquire/index.html': {size: 111566, hash: '5d8b09334c7a1f2cd9bd4e722bda0c85bc2b2073976eb72fae7837d0b72f3d89', text: () => import('./assets-chunks/enquire_index_html.mjs').then(m => m.default)},
    'index.html': {size: 115165, hash: '577888cd40b9dcc6b656570a9e922370f978a49283fb27f1e909b79d147a82bf', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'terms/index.html': {size: 97006, hash: '932d5b30d1dfac2c1609fabdcec6eb3b0cd804440bc36212461cdec68a4f53da', text: () => import('./assets-chunks/terms_index_html.mjs').then(m => m.default)},
    'privacy-policy/index.html': {size: 97249, hash: '1cec8b11054e8b8e6ae694bc32299e98b411906c9c696dfe4c21e1fad519b147', text: () => import('./assets-chunks/privacy-policy_index_html.mjs').then(m => m.default)},
    'offline/index.html': {size: 99113, hash: '19163e34fda82deacba0f921b69effa63be50c7163ad7dde8dd168bc8463713f', text: () => import('./assets-chunks/offline_index_html.mjs').then(m => m.default)},
    'cookie-policy/index.html': {size: 96983, hash: '4e1766858e3085f21033aca35ec7d3baf192070046d98ddb245d08eb33277a1f', text: () => import('./assets-chunks/cookie-policy_index_html.mjs').then(m => m.default)},
    '500/index.html': {size: 99122, hash: '22f2a9eae7d8b94bf26f332d41c0bdae476c47f4b3e7d1c3a7eb37989db18668', text: () => import('./assets-chunks/500_index_html.mjs').then(m => m.default)},
    'styles-2V7B6PIM.css': {size: 68160, hash: 'GJbJldvZ1mY', text: () => import('./assets-chunks/styles-2V7B6PIM_css.mjs').then(m => m.default)}
  },
};
