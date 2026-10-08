const fs = require('node:fs');
const path = require('node:path');

module.exports = (options) => ({
  ...options,
  resolve: {
    ...options.resolve,
    alias: {
      ...options.resolve?.alias,
      '@main': path.resolve(__dirname, 'apps/main/src'),
    },
    extensionAlias: {
      ...options.resolve?.extensionAlias,
      '.js': ['.ts', '.js'],
    },
  },
  plugins: [
    ...(options.plugins ?? []),
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap('WriteCommonJsPackageScope', () => {
          const packagePath = path.join(
            compiler.options.output.path,
            'package.json',
          );
          const packageContent = '{"type":"commonjs"}\n';

          if (
            !fs.existsSync(packagePath) ||
            fs.readFileSync(packagePath, 'utf8') !== packageContent
          ) {
            fs.writeFileSync(packagePath, packageContent);
          }
        });
      },
    },
  ],
});
