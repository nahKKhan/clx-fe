import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at / and publish the build under the repository path.
  server: { proxy: { '/api': 'http://127.0.0.1:8012' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8012' } },
  base: command === 'build' || isPreview ? '/clx-fe/' : '/',
}));
