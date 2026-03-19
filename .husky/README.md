# Git hooks (Husky)

Pre-commit runs **lint**, **build**, and **lint-staged** before each commit.

## If hooks don't run before commit

1. **Check where Git looks for hooks**
   ```bash
   npm run hooks:verify
   ```
   It should print `.husky/_`. If it prints something else or nothing, hooks are not using this folder.

2. **Point Git to this folder and reinstall**
   ```bash
  npm run hooks:install
   ```
   Then try committing again; the pre-commit hook should run (lint, build, lint-staged).

3. **After clone / if you use `npm install --ignore-scripts`**
   Run once:
   ```bash
   npm run prepare
   npm run hooks:install
   ```
