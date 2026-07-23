import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works from any path — a GitHub Pages project site
// serves from /<repo-name>/, and absolute asset URLs would 404 there.
export default defineConfig({
  base: './',
  plugins: [react()],
});
