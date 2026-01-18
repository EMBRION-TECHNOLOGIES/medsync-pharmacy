#!/bin/bash
# Get local IP address for development
# Usage: source scripts/get-local-ip.sh && echo $LOCAL_IP

# Try to get IP from environment variable first
if [ -n "$LOCAL_IP" ]; then
  echo "$LOCAL_IP"
  exit 0
fi

# Try common network interfaces
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

# Fallback to common development IPs
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="192.168.88.87"
fi

echo "$LOCAL_IP"
