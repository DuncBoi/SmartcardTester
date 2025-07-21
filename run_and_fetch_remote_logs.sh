#!/bin/bash

USER="$1"
HOST="$2"
BASE_DIR="${3:-.}"  # Optional, defaults to current dir

REMOTE_ZIP_PATH="/var/spool/nc/image_store/remote/remote.zip"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOCAL_DIR="$BASE_DIR/retrieved_logs_$TIMESTAMP"

echo "🔐 Connecting to $USER@$HOST to run collectLogs.sh..."
ssh "${USER}@${HOST}" "source /etc/env.sh ; cd /opt/nc/bin ; ./collectLogs.sh"
if [[ $? -ne 0 ]]; then
    echo "❌ Failed to run collectLogs.sh on $HOST"
    exit 1
fi

echo "📦 Creating local directory: $LOCAL_DIR"
mkdir -p "$LOCAL_DIR"

echo "⬇️  Fetching log archive with ssh/cat (never scp)..."
ssh "${USER}@${HOST}" "cat ${REMOTE_ZIP_PATH}" > "${LOCAL_DIR}/remote.zip"

if [[ $? -eq 0 && -s "${LOCAL_DIR}/remote.zip" ]]; then
    echo "✅ Logs successfully retrieved to ${LOCAL_DIR}/remote.zip"
else
    echo "❌ Failed to retrieve ${REMOTE_ZIP_PATH} from ${HOST}"
    exit 1
fi

