#!/bin/bash
set -e

cd APP_DIR_PLACEHOLDER
echo "🔄 Updating NEPSE API..."

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm ci --omit=dev

echo "🔄 Reloading application..."
export PM2_HOME="/home/$USER/.pm2"
pm2 reload ecosystem.config.js || pm2 restart ecosystem.config.js

echo "✅ Application updated successfully!"
echo "📊 Current status:"
pm2 status
