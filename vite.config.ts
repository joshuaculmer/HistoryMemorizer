import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves a project site from /<repo>/, so built asset URLs need that
// prefix. BASE_PATH carries the repo name; taking the last path segment also
// undoes the leading-slash mangling Git Bash applies to values that look like
// Unix paths.
const raw = process.env.BASE_PATH ?? 'HistoryMemorizer'
const repo = raw.split('/').filter(Boolean).pop() ?? 'HistoryMemorizer'

// Preview mirrors the built site so it can verify a deploy; dev stays at the root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? `/${repo}/` : '/',
  plugins: [react()],
}))
