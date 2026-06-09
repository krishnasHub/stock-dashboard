#!/bin/bash
cleanup() {
  kill $SERVER_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

node server.js &
SERVER_PID=$!

# Open browser after a short delay to let Vite start
(sleep 3 && \
  if command -v xdg-open &>/dev/null; then xdg-open http://localhost:5173; \
  elif command -v open &>/dev/null; then open http://localhost:5173; \
  fi) &

cd client && npm run dev

cleanup
