# Fix npm segmentation fault issue on Windows
# This script fixes common npm issues that cause segmentation faults
# Run this script in PowerShell: .\fix-npm-issue.ps1

Write-Host "=== Fixing npm Segmentation Fault Issue ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js and npm versions
Write-Host "Step 1: Checking Node.js and npm versions..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host "npm version: $npmVersion" -ForegroundColor Green
Write-Host ""

# Step 2: Clear npm cache
Write-Host "Step 2: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "npm cache cleared successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Verify npm installation
Write-Host "Step 3: Verifying npm installation..." -ForegroundColor Yellow
npm --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm is not working properly. Please reinstall Node.js." -ForegroundColor Red
    exit 1
}
Write-Host "npm is working correctly" -ForegroundColor Green
Write-Host ""

# Step 4: Update npm to latest stable version
Write-Host "Step 4: Updating npm to latest stable version..." -ForegroundColor Yellow
npm install -g npm@latest
Write-Host "npm updated successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Remove node_modules and package-lock.json (optional - uncomment if needed)
Write-Host "Step 5: Checking for corrupted node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "node_modules folder exists. If issues persist, delete it and run: npm install" -ForegroundColor Yellow
} else {
    Write-Host "node_modules folder not found. Run: npm install" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Check for memory issues
Write-Host "Step 6: Checking system memory..." -ForegroundColor Yellow
$totalMemory = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
Write-Host "Total system memory: $([math]::Round($totalMemory, 2)) GB" -ForegroundColor Green
if ($totalMemory -lt 8) {
    Write-Host "WARNING: System has less than 8GB RAM. Use 'npm run start:low-memory' instead." -ForegroundColor Yellow
} elseif ($totalMemory -lt 16) {
    Write-Host "System has adequate memory. Standard 'npm start' should work." -ForegroundColor Green
} else {
    Write-Host "System has plenty of memory. You can use 'npm run start:high-memory' for faster builds." -ForegroundColor Green
}
Write-Host ""

# Step 7: Recommendations
Write-Host "=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. Use PowerShell or CMD instead of Git Bash to avoid segmentation faults" -ForegroundColor White
Write-Host "2. If you encounter 'out of memory' errors:" -ForegroundColor White
Write-Host "   - For systems with < 8GB RAM: npm run start:low-memory" -ForegroundColor White
Write-Host "   - For systems with 8-16GB RAM: npm start (default)" -ForegroundColor White
Write-Host "   - For systems with > 16GB RAM: npm run start:high-memory" -ForegroundColor White
Write-Host "3. If you must use Git Bash, try: npm config set script-shell /bin/bash" -ForegroundColor White
Write-Host "4. If issues persist, reinstall Node.js from nodejs.org" -ForegroundColor White
Write-Host ""

Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host "Try running 'npm start' in PowerShell or CMD now." -ForegroundColor Green

