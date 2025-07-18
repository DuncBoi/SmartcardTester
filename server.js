
const express           = require('express');
const http              = require('http');
const { Server }        = require('socket.io');
const { SerialPort }    = require('serialport');
const { ReadlineParser }= require('@serialport/parser-readline');
const path              = require('path');
const RFB               = require('rfb2');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
let rfb = null;
const PORT   = 3002;

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  next();
});
app.use(express.json());
app.get('/', (r, s) => s.sendFile(path.join(__dirname, 'index.html')));
app.use(express.static(path.join(__dirname), { etag: false, maxAge: 0 }));

// Arduino serial
const ar = new SerialPort({ path: '/dev/ttyACM0', baudRate: 9600 });
const parser = ar.pipe(new ReadlineParser({ delimiter: '\n' }));

ar.on('open',  () => io.emit('status', 'Serial open'));
ar.on('error', e  => io.emit('status', 'Serial error'));
parser.on('data', line => {
  const msg = line.trim();
  if (msg === 'SweepStart') io.emit('status', 'Servo sweep started');
  if (msg === 'SweepDone')  io.emit('status', 'Servo sweep complete');
  if (msg === 'Stopped')    io.emit('status', 'Servo stopped');
});

// NEW: /sweep endpoint
app.get('/sweep', (req, res) => {
  // Expects: start, end, step, delay (ms)
  const {
    start,
    end,
    step,
    delay
  } = req.query;

  if (
    start === undefined ||
    end === undefined ||
    step === undefined ||
    delay === undefined
  ) {
    return res.status(400).send('Missing parameters');
  }

  const sweepCmd = `SWEEP:${start},${end},${step},${delay}\n`;
  console.log('[SWEEP CMD]', sweepCmd.trim());
  ar.write(sweepCmd);
  io.emit('status', 'Sent sweep command: ' + sweepCmd.trim());
  res.send('OK');
});

// STOP endpoint
app.get('/stop', (req, res) => {
  ar.write('STOP\n');
  io.emit('status', 'Sent STOP');
  res.send('OK');
});

function setupVnc(host, display, password) {
  const port = 5900 + (parseInt(display) || 0);
  console.log(`Trying to connect to VNC at ${host}:${port}`);
  io.emit('status', `Connecting to VNC ${host}:${port}`);
  if (rfb) {
    console.log("Closing previous VNC...");
    rfb.end();
    io.emit('status', 'Closed previous VNC');
  }
  let opts = { host, port };
  if (password && password.trim() !== "") {
    opts.password = password;
    console.log("Using VNC password.");
  } else {
    console.log("Connecting with NO VNC password.");
  }
  rfb = RFB.createConnection(opts);
  rfb.on('connect', () => {
    console.log("VNC CONNECTED!");
    io.emit('status', 'VNC connected');
  });
  rfb.on('error', (err) => {
    console.log("VNC ERROR:", err);
    io.emit('status', 'VNC error: ' + (err?.message || err));
  });
}

function sendKeySym(k) {
  if (!rfb) return;
  rfb.keyEvent(k, true);
  rfb.keyEvent(k, false);
}

const keyMap = {
  enter: 0xff0d,
  esc:   0xff1b,
  up:    0xff52,
  down:  0xff54,
  left:  0xff51,
  right: 0xff53,
  'ctrl-alt-del': () => rfb && rfb.sendCtrlAltDel()
};

app.get('/run', (req, res) => {
  // VNC config
  const { vncHost, vncDisplay, vncPass } = req.query;
    setupVnc(
      decodeURIComponent(vncHost),
      parseInt(vncDisplay) || 0,
      decodeURIComponent(vncPass)
    );
  res.send('OK');
});

app.post('/keypress', (req, res) => {
  const { key } = req.body;
  let action = keyMap[key];
  if (!action && key.length === 1) action = key.charCodeAt(0);
  if (!action) return res.status(400).send('Unknown key');
  io.emit('status', `Typing '${key}'`);
  if (typeof action === 'function') action();
  else sendKeySym(action);
  res.send('OK');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server up on port ${PORT}`);
  io.emit('status', `Server up on port ${PORT}`);
});

