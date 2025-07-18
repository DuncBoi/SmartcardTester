#!/bin/bash

USER="$1"
HOST="$2"
REMOTE_SCRIPT_PATH="${3:-~/}"  # Path where collectLogs.sh resides

REMOTE_ZIP_PATH="/var/spool/nc/image_store/remote/remote.zip"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOCAL_DIR="retrieved_logs_$TIMESTAMP"

echo "🔐 Connecting to $USER@$HOST to run collectLogs.sh..."
ssh "${USER}@${HOST}" "cd ${REMOTE_SCRIPT_PATH} && chmod +x collectLogs.sh && ./collectLogs.sh"

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to run collectLogs.sh on $HOST"
    exit 1
fi

echo "📦 Creating local directory: $LOCAL_DIR"
mkdir -p "$LOCAL_DIR"

echo "⬇️  Fetching log archive from $REMOTE_ZIP_PATH..."
scp "${USER}@${HOST}:${REMOTE_ZIP_PATH}" "${LOCAL_DIR}/"

if [[ $? -eq 0 ]]; then
    echo "✅ Logs successfully retrieved to ${LOCAL_DIR}/remote.zip"
else
    echo "❌ Failed to retrieve ${REMOTE_ZIP_PATH} from ${HOST}"
    exit 1
fi
