# SmartCard Tester System

A repo for automating SmartCard stress-testing. It uses an Arduino connected to a servo moto for physical card insertion into a reader, and a Node.js/Express web server to service it. 
The web server communicates with the arduino and coordinates swiping patterns along with automated password entry through a VNC conection to the device.

---

## Table of Contents
- [Features](#features)
- [Hardware and Software Requirements](#hardware-and-software-requirements)
- [Setup Instructions](#setup-instructions)
- [System Overview](#system-overview)
  - [1. Arduino Firmware](#1-arduino-firmware-smartcardtesterino)
  - [2. Node.js Server (`server.js`)](#2-nodejs-server-serverjs)
  - [3. Web UI (`index.html`)](#3-web-ui-indexhtml)
- [How the System Works](#how-the-system-works)
- [Extending & Customizing](#extending--customizing)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)

---

## Features
- **Automated servo sweep:** Controls the physical movement of the smartcard using Arduino and a servo motor.
- **PIN entry automation:** Simulates PIN entry via VNC and keystrokes to the printer.
- **Flexible cycle configuration:** Set sweep angles, speed, pauses, PINs, and run count via web UI.
- **Live status updates:** See progress and printer logs in real time.
- **Printer log retrieval:** Fetch and download logs from the printer.

---

## Hardware and Software Requirements

### Hardware
- Arduino Uno (or compatible)
- Servo motor (standard hobby servo)
- Host computer (Linux recommended; tested on Ubuntu)
- Networked printer supporting VNC for remote UI

### Software
- **Arduino CLI**
- **Node.js** (v16+ recommended)
- **npm**
- **VNC printer access**

---

## Setup Instructions

### 1. Hardware Assembly
- Connect the servo motor signal wire to pin 7 on the Arduino.
- Provide 5V and GND to the servo from the Arduino (be mindful of current limits; use external power if needed).
- Ensure your Arduino is connected via USB (usually `/dev/ttyACM0`).

### 2. System Setup (One-Line Script)

Clone/download your project folder and place all provided files (`SmartcardTester.ino`, `index.html`, `server.js`, `setup.sh`) in the same directory.

```sh
chmod +x setup.sh
./setup.sh
