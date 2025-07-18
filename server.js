
const express           = require('express');
const http              = require('http');
const { Server }        = require('socket.io');
const { SerialPort }    = require('serialport');
const { ReadlineParser }= require('@serialport/parser-readline');
const path              = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server up on port ${PORT}`);
  io.emit('status', `Server up on port ${PORT}`);
});

