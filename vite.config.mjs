import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at / and publish the build under the repository path.
  base: command === 'build' || isPreview ? '/clx-fe/' : '/',
}));
