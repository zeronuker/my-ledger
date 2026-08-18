import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'
import { commitSha } from './brand-kit/scripts/commit-sha.mjs'

export default defineConfig({
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha()),
  },
  resolve: {
    alias: {
      '@brand/BrandBanner': resolve(__dirname, 'brand-kit/component/BrandBanner.jsx'),
      '@brand/UpdatePrompt': resolve(__dirname, 'brand-kit/component/UpdatePrompt.jsx'),
      '@brand/useUpdate': resolve(__dirname, 'brand-kit/component/useUpdate.js'),
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'brand-kit/static/css/brand.css', dest: 'brand' },
        { src: 'brand-kit/static/logo/logo-mark.svg', dest: 'brand' },
        { src: 'brand-kit/static/logo/logo-mark-light.svg', dest: 'brand' },
      ],
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'brand/icons/ledger/apple-touch-icon-180.png',
        'brand/icons/ledger/icon-192.png',
        'brand/icons/ledger/icon-512.png',
        'brand/icons/ledger/icon-maskable-512.png',
      ],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
        globIgnores: ['build-info.json'],
      },
    }),
  ],
  server: {
    host: true,
    fs: { allow: ['.'] },
  },
})
