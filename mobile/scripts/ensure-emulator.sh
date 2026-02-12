#!/bin/bash
# Helper script to ensure Android emulator is running
# Can be called before pressing 'a' in Expo

# Path to Android SDK
ANDROID_SDK="$HOME/Library/Android/sdk"
EMULATOR="$ANDROID_SDK/emulator/emulator"
ADB="$ANDROID_SDK/platform-tools/adb"

# Your AVD name
AVD_NAME="Pixel_3a_API_34_extension_level_7_arm64-v8a"

# Function to check if emulator is running
is_emulator_running() {
    $ADB devices 2>/dev/null | grep -q "emulator.*device"
}

# Check if emulator is already running
if is_emulator_running; then
    echo "✅ Android emulator is already running"
    exit 0
fi

# Start emulator
echo "🚀 Starting Android emulator ($AVD_NAME)..."
$EMULATOR -avd "$AVD_NAME" > /dev/null 2>&1 &

# Wait for emulator to be ready
echo "⏳ Waiting for emulator to boot (this may take 30-60 seconds)..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if is_emulator_running; then
        echo "✅ Emulator is ready!"
        exit 0
    fi
    sleep 2
    attempt=$((attempt + 1))
    if [ $((attempt % 5)) -eq 0 ]; then
        echo "   Still waiting... ($attempt/$max_attempts)"
    fi
done

echo "❌ Emulator failed to start within timeout"
echo "💡 Try starting it manually: $EMULATOR -avd $AVD_NAME"
exit 1

