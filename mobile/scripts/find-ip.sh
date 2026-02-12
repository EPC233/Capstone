#!/bin/bash
# Script to find your computer's IP address for mobile device connection

echo "🔍 Finding your computer's IP address..."
echo ""

# Try different methods to find IP
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(hostname -I | awk '{print $1}' 2>/dev/null || ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
else
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
fi

if [ -z "$IP" ]; then
    echo "❌ Could not automatically detect IP address."
    echo ""
    echo "Please find your IP manually:"
    echo "  macOS: System Preferences → Network → Select WiFi → IP Address"
    echo "  Linux: Run 'ip addr' or 'ifconfig'"
    echo "  Windows: Run 'ipconfig' and look for IPv4 Address"
    exit 1
fi

echo "✅ Found IP address: $IP"
echo ""
echo "📝 Add this to your mobile/.env file:"
echo ""
echo "EXPO_PUBLIC_API_URL=http://$IP:8000"
echo ""
echo "Then restart Expo: npm start"
echo ""
echo "💡 Make sure:"
echo "   1. Your phone and computer are on the same WiFi network"
echo "   2. Your backend is running on port 8000"
echo "   3. Your firewall allows connections on port 8000"


