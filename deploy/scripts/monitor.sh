#!/bin/bash

# NEPSE API Monitoring Script
# Usage: ./monitor.sh [--watch]

WATCH_MODE=false
if [ "$1" = "--watch" ]; then
    WATCH_MODE=true
fi

check_service() {
    local service=$1
    local status=$(systemctl is-active $service 2>/dev/null)
    if [ "$status" = "active" ]; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: $status"
    fi
}

check_api_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        echo "✅ API Health: OK"
    else
        echo "❌ API Health: Failed (HTTP $response)"
    fi
}

check_disk_space() {
    local usage=$(df /var/www/nepse-api | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$usage" -lt 80 ]; then
        echo "✅ Disk Space: ${usage}% used"
    elif [ "$usage" -lt 90 ]; then
        echo "⚠️ Disk Space: ${usage}% used (Warning)"
    else
        echo "❌ Disk Space: ${usage}% used (Critical)"
    fi
}

check_memory() {
    local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2 }')
    echo "📊 Memory Usage: ${mem_usage}%"
}

check_pm2_processes() {
    echo "📋 PM2 Processes:"
    sudo -u nepse pm2 jlist | jq -r '.[] | "  \(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory / 1024 / 1024 | floor)MB)"' 2>/dev/null || echo "  PM2 not responding"
}

check_database() {
    # Load environment variables
    if [ -f "/var/www/nepse-api/.env" ]; then
        source /var/www/nepse-api/.env
    fi
    
    local count=$(mysql -u ${DB_USER:-nepse} -p${DB_PASSWORD:-nepse_password} -h ${DB_HOST:-localhost} ${DB_NAME:-nepse_db} -N -e "SELECT COUNT(*) FROM stock_prices;" 2>/dev/null || echo "0")
    if [ "$count" != "0" ]; then
        echo "✅ Database: ${count} price records"
    else
        echo "❌ Database: Unable to connect or no data"
    fi
}

show_recent_logs() {
    echo "📋 Recent Errors (last 10 lines):"
    if [ -f "/var/www/nepse-api/logs/api-err.log" ]; then
        tail -5 /var/www/nepse-api/logs/api-err.log | sed 's/^/  /'
    else
        echo "  No error logs found"
    fi
}

run_checks() {
    clear
    echo "🔍 NEPSE API System Status - $(date)"
    echo "================================================="
    echo ""
    echo "🔧 System Services:"
    check_service "nginx"
    check_service "nepse-pm2"
    echo ""
    echo "🌐 API Status:"
    check_api_health
    echo ""
    echo "💾 Resources:"
    check_disk_space
    check_memory
    echo ""
    check_pm2_processes
    echo ""
    check_database
    echo ""
    show_recent_logs
    echo ""
    echo "================================================="
}

if [ "$WATCH_MODE" = true ]; then
    while true; do
        run_checks
        echo "Refreshing in 30 seconds... (Press Ctrl+C to exit)"
        sleep 30
    done
else
    run_checks
fi
