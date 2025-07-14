
// server.js
const express = require('express');
const { SerialPort } = require('serialport');
const app = express();
const PORT = 3000;

const ar = new SerialPort({ path:'/dev/ttyACM0', baudRate:9600 });
let stopTimer = null;

ar.on('open', ()=>console.log('Serial open'));

app.use(express.static(__dirname));

app.get('/run', (req, res) => {
  const mode       = req.query.mode;               // fixed|infinite
  const duration   = parseInt(req.query.duration)||0;
  const stepDelay  = parseInt(req.query.stepDelay)||15;
  const pauseDelay = parseInt(req.query.pauseDelay)||0;

  if (stopTimer) clearTimeout(stopTimer);

  ar.write(`STEP:${stepDelay}\n`);
  ar.write(`PAUSE:${pauseDelay}\n`);
  ar.write(`START\n`);

  if (mode==='fixed') {
    stopTimer = setTimeout(()=>{
      ar.write('STOP\n');
      stopTimer = null;
    }, duration*1000);
  }

  res.send('OK');
});

app.get('/stop', (req, res) => {
  if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
  ar.write('STOP\n');
  res.send('OK');
});

app.listen(PORT, ()=>console.log(`HTTP on http://localhost:${PORT}`));
