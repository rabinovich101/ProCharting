#!/bin/bash

# Build packages in watch mode
echo "Starting development mode..."

# Run build in watch mode for all packages
pnpm -r --parallel dev &

# Wait a bit for initial builds
sleep 3

# Start the example dev server
cd examples/basic && pnpm dev