import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'curly': ['error', 'all'],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
    '@stylistic/space-unary-ops': ['error', { words: true, nonwords: true }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
})
