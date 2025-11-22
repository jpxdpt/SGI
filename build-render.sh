#!/bin/bash
set -e

echo "Starting build for Render..."
cd dashboard-sgi

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build completed. Checking dist location..."
pwd
ls -la dist

echo "Copying dist to root directory..."
cd ..
cp -r dashboard-sgi/dist ./dist

echo "Verifying dist in root..."
ls -la dist

echo "Build script completed successfully!"

#!/bin/bash
set -e

echo "Starting build for Render..."
cd dashboard-sgi

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build completed. Checking dist location..."
pwd
ls -la dist

echo "Copying dist to root directory..."
cd ..
cp -r dashboard-sgi/dist ./dist

echo "Verifying dist in root..."
ls -la dist

echo "Build script completed successfully!"

