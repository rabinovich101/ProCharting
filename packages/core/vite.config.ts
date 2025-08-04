import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProCharting',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        '@procharting/types',
        '@procharting/utils',
        '@procharting/webgpu',
        '@procharting/webgl',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2,
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
      },
    },
    target: 'es2022',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['@procharting/types', '@procharting/utils', '@procharting/webgpu', '@procharting/webgl'],
  },
});