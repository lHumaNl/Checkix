#!/usr/bin/env bash

set -e

host="$1"
shift
port="$1"
shift
cmd="$@"

timeout="${TIMEOUT:-30}"
quieten="${QUIETEN:-0}"

wait_for() {
    local host="$1"
    local port="$2"
    local timeout="$3"
    
    local start_time=$(date +%s)
    
    while true; do
        if nc -z "$host" "$port" 2>/dev/null; then
            return 0
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ "$elapsed" -ge "$timeout" ]; then
            return 1
        fi
        
        [ "$quieten" -eq 0 ] && echo "Waiting for $host:$port... ($elapsed seconds elapsed)"
        sleep 1
    done
}

wait_for_wrapper() {
    if [ "$timeout" -gt 0 ]; then
        echo "Waiting $timeout seconds for $host:$port..."
    else
        echo "Waiting for $host:$port without a timeout..."
    fi
    
    if wait_for "$host" "$port" "$timeout"; then
        [ "$quieten" -eq 0 ] && echo "$host:$port is available after $(( $(date +%s) - start_time )) seconds"
        exec $cmd
    else
        echo "Operation timed out after $timeout seconds waiting for $host:$port"
        exit 1
    fi
}

start_time=$(date +%s)

if [ "$host" = "" ] || [ "$port" = "" ]; then
    echo "Usage: $0 host port [command]"
    echo "   or: TIMEOUT=30 $0 host port [command]"
    exit 1
fi

if ! command -v nc &> /dev/null; then
    echo "netcat (nc) is not installed. Installing..."
    apt-get update && apt-get install -y netcat-openbsd
fi

wait_for_wrapper
