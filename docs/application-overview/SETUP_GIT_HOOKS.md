# Git Hooks Setup Guide

## Overview

This project uses **Husky** for Git hooks to ensure code quality before commits and pushes to GitHub.

### What's Configured

1. **Pre-commit Hook**: Runs linting and formatting on staged files
2. **Pre-push Hook**: Runs full linting and build validation before pushing to GitHub

### Features

- ✅ **ESLint**: Detects unused variables and functions
- ✅ **Prettier**: Code formatting
- ✅ **Build Validation**: Checks if all required files exist
- ✅ **Automatic Fixes**: Auto-fixes linting issues when possible

## Installation

### Step 1: Install Dependencies

```bash
npm install
```

This will install:
- `eslint` - Linting tool
- `prettier` - Code formatter
- `husky` - Git hooks manager
- `lint-staged` - Run linters on staged files

### Step 2: Initialize Husky

```bash
npm run prepare
```

This sets up Husky and creates the `.husky` directory with hooks.

### Step 3: Verify Installation

```bash
# Test linting
npm run lint

# Test build validation
npm run validate

# Test formatting
npm run format:check
```

## Usage

### Manual Commands

```bash
# Lint all files
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format all files
npm run format

# Check formatting without fixing
npm run format:check

# Validate build
npm run validate

# Run all pre-push checks manually
npm run pre-push
```

### Automatic (Git Hooks)

#### Pre-commit
When you run `git commit`, it will:
1. Run ESLint on staged files
2. Auto-fix issues when possible
3. Format code with Prettier
4. Block commit if errors remain

#### Pre-push
When you run `git push`, it will:
1. Run ESLint on all files
2. Validate build structure
3. Block push if errors found

## ESLint Rules

### Unused Variables/Functions Detection

ESLint is configured to detect:
- ✅ Unused variables
- ✅ Unused function parameters
- ✅ Unused functions
- ✅ Dead code

### Special Cases

For AngularJS dependency injection, function parameters are allowed (DI uses all parameters):
```javascript
// This is OK - AngularJS DI uses all parameters
app.controller('MyController', function($scope, $location, MyService) {
    // Even if not all are used, it's OK for DI
});
```

### Ignoring Variables

Prefix with underscore to ignore:
```javascript
function myFunction(_unusedParam, usedParam) {
    // _unusedParam won't trigger lint error
    return usedParam;
}
```

## Configuration Files

- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `.eslintignore` - Files to ignore in linting
- `.prettierignore` - Files to ignore in formatting
- `.husky/pre-commit` - Pre-commit hook
- `.husky/pre-push` - Pre-push hook
- `package.json` - Scripts and lint-staged config

## Troubleshooting

### Hook Not Running

If hooks don't run:
```bash
# Reinstall Husky
npm run prepare

# Make hooks executable (Linux/Mac)
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Too Many Linting Errors

If you have many errors, fix them gradually:
```bash
# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format

# Then fix remaining issues manually
```

### Skip Hooks (Not Recommended)

Only use in emergencies:
```bash
# Skip pre-commit
git commit --no-verify

# Skip pre-push
git push --no-verify
```

## Common Issues

### "Command not found: husky"

Run:
```bash
npm install
npm run prepare
```

### "ESLint errors in node_modules"

This is normal. ESLint ignores `node_modules/` by default.

### "Prettier conflicts with ESLint"

Prettier and ESLint are configured to work together. If conflicts occur:
1. Run `npm run lint:fix` first
2. Then run `npm run format`

## Best Practices

1. **Commit Often**: Small commits are easier to fix
2. **Fix Linting Early**: Don't let errors accumulate
3. **Use Auto-fix**: Run `npm run lint:fix` before committing
4. **Review Changes**: Always review what was auto-fixed
5. **Don't Skip Hooks**: Only skip in true emergencies

## Integration with CI/CD

The same checks run in Git hooks can be added to CI/CD:

```yaml
# Example GitHub Actions
- name: Run ESLint
  run: npm run lint

- name: Validate Build
  run: npm run validate
```

## Support

For issues or questions:
1. Check ESLint documentation: https://eslint.org/
2. Check Husky documentation: https://typicode.github.io/husky/
3. Check Prettier documentation: https://prettier.io/

