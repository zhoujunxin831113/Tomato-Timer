import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  plugins: [
    react(),
    // 插件需在 dev 下也加载以提供 virtual:pwa-register 虚拟模块；
    // devOptions.enabled 默认 false，dev 不生成/注册 SW，PWA 仅在 build 生效；
    // SW 只缓存静态资源，不写入任何动态状态
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: '番茄钟计时器',
        short_name: '番茄钟',
        description: '基于番茄工作法的专注计时工具',
        theme_color: '#EF4444',
        background_color: '#F8FAFC',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: false,
  },
}));
