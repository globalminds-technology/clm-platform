module.exports = {
  ...require('@clm/config/eslint/node'),
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
};

