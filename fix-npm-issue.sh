#!/bin/bash
# Fix npm segmentation fault issue on Windows (Git Bash)
# This script fixes common npm issues that cause segmentation faults
# Run this script in Git Bash: bash fix-npm-issue.sh

echo "=== Fixing npm Segmentation Fault Issue ==="
echo ""

# Step 1: Check Node.js and npm versions
echo "Step 1: Checking Node.js and npm versions..."
NODE_VERSION=$(node --version 2>/dev/null)
NPM_VERSION=$(npm --version 2>/dev/null || echo "npm not working")

if [ -z "$NODE_VERSION" ]; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

echo "Node.js version: $NODE_VERSION"
echo "npm version: $NPM_VERSION"
echo ""

# Step 2: Clear npm cache
echo "Step 2: Clearing npm cache..."
npm cache clean --force 2>/dev/null || echo "Warning: Could not clear npm cache"
echo "npm cache cleared"
echo ""

# Step 3: Verify npm installation
echo "Step 3: Verifying npm installation..."
if ! npm --version > /dev/null 2>&1; then
    echo "ERROR: npm is not working properly. Please reinstall Node.js."
    exit 1
fi
echo "npm is working correctly"
echo ""

# Step 4: Update npm to latest stable version
echo "Step 4: Updating npm to latest stable version..."
npm install -g npm@latest 2>/dev/null || echo "Warning: Could not update npm globally"
echo "npm update attempted"
echo ""

# Step 5: Check for memory issues
echo "Step 5: Checking system memory..."
if command -v free > /dev/null 2>&1; then
    TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
    echo "Total system memory: ${TOTAL_MEM} GB"
    if [ "$TOTAL_MEM" -lt 8 ]; then
        echo "WARNING: System has less than 8GB RAM. Use 'npm run start:low-memory' instead."
    elif [ "$TOTAL_MEM" -lt 16 ]; then
        echo "System has adequate memory. Standard 'npm start' should work."
    else
        echo "System has plenty of memory. You can use 'npm run start:high-memory' for faster builds."
    fi
else
    echo "Could not determine system memory. Use appropriate npm script based on your system."
fi
echo ""

# Step 6: Recommendations
echo "=== Recommendations ==="
echo "1. Use PowerShell or CMD instead of Git Bash to avoid segmentation faults"
echo "2. If you encounter 'out of memory' errors:"
echo "   - For systems with < 8GB RAM: npm run start:low-memory"
echo "   - For systems with 8-16GB RAM: npm start (default)"
echo "   - For systems with > 16GB RAM: npm run start:high-memory"
echo "3. If you must use Git Bash, try: npm config set script-shell /bin/bash"
echo "4. If issues persist, reinstall Node.js from nodejs.org"
echo ""

echo "=== Fix Complete ==="
echo "Try running 'npm start' in PowerShell or CMD now."

