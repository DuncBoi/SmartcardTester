# SmartCard Tester

A repo for automating SmartCard stress-testing. It uses an Arduino connected to a servo motor for physical card insertion into a reader, and a Node.js/Express web server to service it. 
The web server communicates with the Arduino and coordinates swiping patterns along with automated password entry through a VNC conection to the device. There are a lot of moving parts here.

---

## Table of Contents
- [Requirements](#requirements)
- [Quickstart Guide](#quickstart-guide)
- [Hardware Overview](#hardware-overview)
- [Settings and Workflow](#settings-and-workflow)
- [Server Routes](#server-routes)

---

## Requirements

### Hardware
- Arduino Uno (or compatible)
- Servo motor (standard hobby servo)
- Host computer (Raspberry Pi recommended)
- Networked printer supporting VNC for remote UI

### Software
- **Arduino CLI**
- **Node.js** (v16+)
- **npm**
- **VNC printer access**

---

## Quickstart Guide

### 1. Hardware Assembly
- Connect the servo motor signal wire to pin 7 on the Arduino (or whatever pin you want as long as you change the parameter in the ino file, as detailed in the [Hardware Overview](#hardware-overview) section). 
- Provide 5V and GND to the servo from the Arduino (be mindful of current limits; use external power if needed).
- Ensure your Arduino is connected via USB (usually `/dev/ttyACM0`).
- Build the rest of your setup, such that ther servo motor can move a lever with a card into a card reader.

### 2. Software Setup

1. **Clone the repository**  
   ```sh
   git clone https://github.com/your-username/SmartcardTester.git
   cd SmartcardTester
   ```

   
2. **Run the setup script**  
   ```sh
   chmod +x setup.sh
   ./setup.sh
   ```
   
2. **Start the web server**  
   ```sh
   node server.js
   ```
---

## Hardware Overview
> **Image of the Physical Tester**  
> In this photo, the Arduino sits inside its enclosure with the blue LED screen on top. It drives a servo motor (the device with the red, star‑shaped hub on top) to which a wooden arm is attached. A nail at the end of that arm pushes against a larger wooden lever to which the actual Smartcard desired for testing is attached to the end of. As the servo rotates, the nail moves the lever, inserting and ejecting the card into the reader device taped and clamped in place at the bottom of the picture.

![Device Picture](/static/IMG_0430.jpeg)

This SmartCard Tester requires an Arduino Uno in order to load `SmartcardTester.ino`, that controls a servo motor to insert and eject cards at precise angles. Ideally, you would connect the Arduino to a Raspberry Pi which can also run the web-server in order for you to communicate swipe commands. On startup, the Arduino:
- Attaches the servo on **pin 7** and moves it to the configured `startDeg` that it is passed from the web server.
> **Note:**  
> By default, the servo is attached to pin **7**. To use a different pin, open `SmartcardTester.ino` and modify line 48:
>
> ```cpp
> myservo.attach(<your_pin>);
> ```
- Listens on the serial port for commands, also sent from the web server:
  - `SWEEP:start,end,step,delay` → begins a non‑blocking sweep from `start` to `end` at `step` increments with `delay` ms between steps.
  - `STOP` → halts any ongoing sweep immediately.
  - `RESET` → returns the servo to the `start` position.
- Emits status messages (`Ready`, `SweepStart`, `SweepDone`, `Stopped`) over serial in order for the web server to know when to move on to the next phase in the process.

---

## Settings and Workflow
> **Image of the Control Panel**  
> This is what you will see when connecting to the web_server. There is a complete panel of settings, letting you fine-tune anything you would ever need.
![Web Control Panel](/static/control_panel.png)

### Configurable Parameters

| Field                   | Description                                                              |
|-------------------------|--------------------------------------------------------------------------|
| **Printer IP**          | IP address of the device running the VNC server                         |
| **Display #**           | VNC display number (e.g. `8` → port `5908`)                             |
| **VNC Password**        | Password for the VNC session (optional)                                  |
| **Card PIN**            | PIN to type automatically after insertion                                |
| **Start Degree**        | Initial servo angle before each swipe                                     |
| **End Degree**          | Final servo angle for card insertion/ejection                             |
| **Step Size**           | Degrees per servo increment during sweep                                  |
| **Sweep Speed**         | Milliseconds per degree (controls sweep speed)                            |
| **Delay before PIN**    | Seconds to wait after insertion before typing the PIN                     |
| **Delay before eject**  | Seconds to wait after PIN inserted, and before ejecting the card                        |
| **Delay between swipes**| Seconds pause between consecutive swipes                                  |
| **Number of swipes**    | Count of fixed swipes in “Fixed” mode                                     |
| **Run Mode**            | `Fixed` (runs a set number of swipes) or `Infinite` (runs until stopped) |

### When you click start:
- Serves the control panel on port 3002. (Port number is configurable just by modifying the PORT constant in 'server.js')
- Auto‑connects to the target device via VNC using the configured **Printer IP**, **Display #**, and **VNC Password**.
> **Swipe Cycle**  
> Each iteration performs the following steps:
>
> 1. **Wait** for the **Delay between swipes** interval.  
> 2. **Insert card**  
>    - Send `GET /sweep?start=<start>&end=<end>&step=<step>&delay=<delay>`  
>    - Arduino moves the servo from **start degree** to **end degree**, inserting the card.  
> 3. **Wait** for the **Delay before PIN** interval.  
> 4. **Enter PIN**  
>    - Send `POST /keypress` requests for each digit of the PIN.  
>    - Server types each character (then `Enter`) over the VNC session.  
> 5. **Confirm completion** by waiting for the Arduino’s `SweepDone` status.  
> 6. **Wait** for the **Delay before eject** interval.  
> 7. **Eject card**  
>    - Send `GET /sweep?start=<end>&end=<start>&step=<step>&delay=<delay>`  
>    - Arduino reverses the servo sweep, pulling the card out.  
> 8. **Repeat** until you’ve completed the configured number of swipes (Fixed mode) or stop manually (Infinite mode).  

- Provides live status updates and countdown timers via WebSockets.
---

## Server Routes
`server.js` serves the following HTTP endpoints:

- **GET /**  
  - Serves `index.html` (the main control panel UI).

- **GET /sweep?start=<start>&end=<end>&step=<step>&delay=<delay>**  
  - Sends `SWEEP:<start>,<end>,<step>,<delay>\n` over serial to the Arduino to initiate a servo sweep. Returns `OK`.

- **GET /stop**  
  - Sends `STOP\n` over serial to halt any ongoing servo sweep immediately. Returns `OK`.

- **GET /run?vncHost=<host>&vncDisplay=<display>&vncPass=<password>**  
  - Connects (or reconnects) to the VNC server at `<host>:5900+<display>`, using the optional `password`. Returns `OK`.

- **POST /keypress**  
  - Expects JSON body: `{ "key": "<character or control>" }`  
  - Emits the corresponding key events via VNC (e.g., `enter`, `esc`, arrow keys, or literal characters). Returns `OK`.

- **GET /download-logs**  
  - Executes `run_and_fetch_remote_logs.sh` to fetch logs from the remote printer, then sends the latest ZIP archive of logs back to the client.

---
