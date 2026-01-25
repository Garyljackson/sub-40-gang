module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['api', 'ui', 'db', 'auth', 'strava', 'pwa', 'test', 'deps']],
  },
};
