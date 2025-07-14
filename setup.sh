#!/usr/bin/env bash
set -e

### ——— CONFIG ——— ###
BOARD_FQBN="arduino:avr:uno"
SERIAL_PORT="/dev/ttyACM0"
SKETCH_DIR="$PWD"            # must contain your .ino sketch file
WEB_DIR="$PWD"               # must contain server.js (or will be initialized)
### ————————————————— ###

log() { echo "[setup] $*"; }

# Determine real user when run with sudo
if [ "$(id -u)" -eq 0 ] && [ -n "$SUDO_USER" ]; then
  REAL_USER="$SUDO_USER"
else
  REAL_USER="$(id -un)"
fi

# 1) Ensure dialout group membership
if id -nG "$REAL_USER" | grep -qw dialout; then
  log "User '$REAL_USER' already in dialout."
else
  log "Adding '$REAL_USER' to dialout—you’ll need to log out/in then re-run."
  sudo usermod -aG dialout "$REAL_USER"
  exit 0
fi

# 2) Install arduino-cli if missing
if ! command -v arduino-cli &>/dev/null; then
  log "Installing arduino-cli..."
  TMP=$(mktemp -d)
  pushd "$TMP"
    curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
    sudo mv bin/arduino-cli /usr/local/bin/
  popd
  rm -rf "$TMP"
  log "arduino-cli ready."
else
  log "arduino-cli already installed."
fi

# 3) Update core index & ensure AVR core
log "Updating core index..."
arduino-cli core update-index
if ! arduino-cli core list | grep -q "^arduino:avr "; then
  log "Installing arduino:avr core..."
  arduino-cli core install arduino:avr
else
  log "arduino:avr core is present."
fi

# 4) Install Servo library if missing
if ! arduino-cli lib list | grep -q "^Servo "; then
  log "Installing Servo library..."
  arduino-cli lib update-index
  arduino-cli lib install "Servo"
else
  log "Servo library already installed."
fi

# 5) Compile & upload Arduino sketch
if ! ls "$SKETCH_DIR"/*.ino &>/dev/null; then
  echo "[setup] ERROR: No .ino file found in $SKETCH_DIR" >&2
  exit 1
fi
log "Compiling sketch in $SKETCH_DIR..."
arduino-cli compile --fqbn "$BOARD_FQBN" "$SKETCH_DIR"
log "Uploading to $SERIAL_PORT..."
arduino-cli upload -p "$SERIAL_PORT" --fqbn "$BOARD_FQBN" "$SKETCH_DIR"
log "Arduino upload complete."

# 6) Node.js setup
cd "$WEB_DIR"
if [ ! -f package.json ]; then
  log "No package.json found—initializing npm project..."
  npm init -y
  log "Installing express & serialport..."
  npm install express serialport
  log "Node.js project initialized."
else
  log "package.json found—installing dependencies..."
  npm install
fi

log "Upload Complete. To start web UI: node server.js"
