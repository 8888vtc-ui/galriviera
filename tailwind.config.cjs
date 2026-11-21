module.exports = {
  content: ['./src/**/*.{astro,html,js,ts}', './scripts/generate-*.js'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: { gold: '#c6a972' }
    }
  }
};
