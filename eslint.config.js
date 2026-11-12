import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Modul ini sengaja mengekspor hook/helper bersama komponen (context + UI kit).
    files: ['src/ui.jsx', 'src/Components.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Kode context Firebase sudah ada sejak awal; aturan ini tidak relevan untuk pola sinkronisasi eksternal.
    files: ['src/MeetingContext.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'no-unused-vars': 'off',
    },
  },
])
