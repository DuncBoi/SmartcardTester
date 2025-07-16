const express            = require('express');
const http               = require('http');
const { Server }         = require('socket.io');
const RFB                = require('rfb2');
const { SerialPort }     = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path               = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const PORT   = 3002;

// disable caching
app.use((req,res,next)=>{
  res.set('Cache-Control','no-store');
  res.set('Pragma','no-cache');
  next();
});
app.use(express.json());
app.get('/', (r,s) => s.sendFile(path.join(__dirname,'index.html')));
app.use(express.static(path.join(__dirname), { etag:false, maxAge:0 }));

// Arduino serial
const ar = new SerialPort({ path:'/dev/ttyACM0', baudRate:9600 });
const parser = ar.pipe(new ReadlineParser({ delimiter:'\n' }));
ar.on('open',  () => io.emit('status','Serial open'));
ar.on('error', e  => io.emit('status','Serial error'));
parser.on('data', line => {
  const msg = line.trim();
  if (msg.includes('CARD:INSERTED')) {
    io.emit('status', 'Card inserted');
    io.emit('card-inserted');
  }
  if (msg.includes('CARD:REMOVED')) {
    io.emit('status', 'Card removed');
    io.emit('card-removed');
  }
});

// VNC handling
let rfb = null;
function setupVnc(host, display, password){
  const port = 5900 + display;
  io.emit('status', `Connecting to VNC ${host}:${port}`);
  if (rfb) {
    rfb.end();
    io.emit('status','Closed previous VNC');
  }
  rfb = RFB.createConnection({ host, port, password });
  rfb.on('connect',()=> io.emit('status','VNC connected'));
  rfb.on('error',  ()=> io.emit('status','VNC error'));
}
function sendKeySym(k){
  if (!rfb) return;
  rfb.keyEvent(k,true);
  rfb.keyEvent(k,false);
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

// configure servo & VNC
app.get('/run', (req,res) => {
  const {
    stepDelay, pauseDelay,
    vncHost, vncDisplay, vncPass
  } = req.query;

  setupVnc(
    decodeURIComponent(vncHost),
    parseInt(vncDisplay)||0,
    decodeURIComponent(vncPass)||''
  );

  ar.write(`STEP:${stepDelay}\n`);
  ar.write(`PAUSE:${pauseDelay}\n`);
  io.emit('status','Configured servo');
  res.send('OK');
});

// trigger insert/eject
app.post('/insert', (req,res) => {
  ar.write('START\n');
  io.emit('status','Sent START');
  res.send('OK');
});

// stop
app.get('/stop', (req,res) => {
  ar.write('STOP\n');
  io.emit('status','Sent STOP');
  res.send('OK');
});

// VNC keystroke
app.post('/keypress', (req,res) => {
  const { key } = req.body;
  let action = keyMap[key];
  if (!action && key.length===1) action = key.charCodeAt(0);
  if (!action) return res.status(400).send('Unknown key');
  io.emit('status', `Typing '${key}'`);
  if (typeof action === 'function') action();
  else sendKeySym(action);
  res.send('OK');
});

// test route
app.get('/test-card', (r,s) => {
  io.emit('card-inserted');
  s.send('OK');
});

server.listen(PORT, '0.0.0.0', () => {
  io.emit('status', `Server up on port ${PORT}`);
});
