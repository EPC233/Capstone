#!/bin/bash
# Script to fix Android emulator connection issues

# Path to Android SDK
ANDROID_SDK="$HOME/Library/Android/sdk"
ADB="$ANDROID_SDK/platform-tools/adb"

echo "🔧 Fixing Android emulator connection..."

# Kill and restart ADB server
echo "1. Restarting ADB server..."
$ADB kill-server
sleep 2
$ADB start-server
sleep 2

# Check connected devices
echo ""
echo "2. Checking connected devices..."
$ADB devices

# Try to reconnect if emulator is listed but not connected
echo ""
echo "3. Attempting to reconnect..."
$ADB reconnect

# Wait a moment
sleep 3

# Check again
echo ""
echo "4. Final device status:"
$ADB devices

echo ""
echo "✅ Done! If you still see issues:"
echo "   - Make sure the emulator window is open and fully booted"
echo "   - Try restarting the emulator"
echo "   - Try: npm start -- --reset-cache"

