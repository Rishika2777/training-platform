# Setup Guide - Fixing npm Issues on Windows

## Problems

### Problem 1: Segmentation Fault
If you encounter a segmentation fault error when running `npm start` in Git Bash:
```
/c/Program Files/nodejs/npm: line 65:   617 Segmentation fault      "$NODE_EXE" "$NPM_CLI_JS" "$@"
```

This is a known issue with npm on Windows when using Git Bash (MINGW64).

### Problem 2: Out of Memory Error
If you encounter an out of memory error:
```
# Fatal process out of memory: Zone
fatal error: runtime: cannot allocate memory
```

This happens when Node.js runs out of memory during the build process.

## Quick Fix

### Option 1: Use Local Development Scripts (Recommended - Won't Affect Other Systems)

**For PowerShell:**
```powershell
# Standard (4GB memory)
.\start-dev.ps1

# Low memory systems (< 8GB RAM)
.\start-dev-low-memory.ps1

# High memory systems (> 16GB RAM)
.\start-dev-high-memory.ps1
```

**For CMD:**
```cmd
# Standard (4GB memory)
start-dev.bat

# Low memory systems
start-dev-low-memory.bat

# High memory systems
start-dev-high-memory.bat
```

**For Git Bash:**
```bash
# Standard (4GB memory)
bash start-dev.sh

# Low memory systems
bash start-dev-low-memory.sh

# High memory systems
bash start-dev-high-memory.sh
```

**Note:** These scripts are gitignored and won't be pushed to the repository, so they won't affect other systems.

### Option 2: Use PowerShell or CMD with npm start
Instead of Git Bash, use PowerShell or Command Prompt:
```powershell
npm start
```

### Option 3: Run Fix Script
Run the fix script in PowerShell:
```powershell
.\fix-npm-issue.ps1
```

Or in Git Bash:
```bash
bash fix-npm-issue.sh
```

## Permanent Solutions

### Solution 1: Use PowerShell for Development (Best)
Always use PowerShell or CMD for npm commands on Windows. Git Bash has compatibility issues with npm.

### Solution 2: Configure npm for Git Bash
If you must use Git Bash, configure npm:
```bash
npm config set script-shell /bin/bash
```

### Solution 3: Reinstall Node.js
If the issue persists:
1. Uninstall Node.js from Control Panel
2. Download and install the latest LTS version from [nodejs.org](https://nodejs.org/)
3. Restart your terminal

### Solution 4: Use nvm-windows
Install Node Version Manager for Windows:
1. Download from [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
2. Install Node.js via nvm: `nvm install lts`
3. Use it: `nvm use lts`

## Development Workflow

### Recommended: Use Local Development Scripts

**PowerShell:**
```powershell
# Install dependencies
npm install

# Start development server with memory management
.\start-dev.ps1              # Standard (4GB)
.\start-dev-low-memory.ps1   # For < 8GB RAM systems
.\start-dev-high-memory.ps1  # For > 16GB RAM systems
```

**CMD:**
```cmd
npm install
start-dev.bat              # Standard (4GB)
start-dev-low-memory.bat   # For < 8GB RAM systems
start-dev-high-memory.bat  # For > 16GB RAM systems
```

**Git Bash:**
```bash
npm install
bash start-dev.sh              # Standard (4GB)
bash start-dev-low-memory.sh   # For < 8GB RAM systems
bash start-dev-high-memory.sh  # For > 16GB RAM systems
```

### Memory Management
Local development scripts are provided (gitignored, won't affect other systems):
- **Standard (`start-dev.*`)**: Uses 4GB memory - works for most systems
- **Low Memory (`start-dev-low-memory.*`)**: Uses 2GB memory - for systems with < 8GB RAM
- **High Memory (`start-dev-high-memory.*`)**: Uses 8GB memory - for systems with > 16GB RAM

These scripts are local-only and won't be committed to the repository.

### If Using Git Bash
If you must use Git Bash, try:
```bash
# Set npm to use bash shell
npm config set script-shell /bin/bash

# Then run commands
npm start
```

## Troubleshooting

### Out of Memory Errors

If you get "Fatal process out of memory" errors:

1. **Use the local low-memory script:**
   ```powershell
   # PowerShell
   .\start-dev-low-memory.ps1
   
   # CMD
   start-dev-low-memory.bat
   
   # Git Bash
   bash start-dev-low-memory.sh
   ```

2. **Close other applications** to free up system memory

3. **Check your system memory:**
   - Windows: Open Task Manager (Ctrl+Shift+Esc) and check available memory
   - If you have less than 8GB total RAM, always use `npm run start:low-memory`

4. **Clear build cache:**
   ```bash
   rm -rf .angular/cache
   npm start
   ```

### Segmentation Fault Errors

1. **Use PowerShell or CMD instead of Git Bash**

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Remove and reinstall node_modules:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### General Issues

**Check npm version:**
```bash
npm --version
```

If npm version is very old or shows errors, update it:
```bash
npm install -g npm@latest
```

**Verify Node.js version:**
```bash
node --version
```

Should be Node.js 18.x or higher for Angular 21.

## Notes
- Error files (`*.stackdump`, `debug.log`) are automatically ignored by git
- The `.npmrc` file is gitignored and won't affect other systems
- Use PowerShell/CMD for the most reliable experience on Windows

