#include <Servo.h>
Servo myservo;
int pos = 20;
bool running = false;
unsigned long stepDelay  = 15;
unsigned long pauseDelay = 1000;

void handleSerialCommands() {
  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "START") {
      running = true;
      Serial.println("Started");
    }
    else if (cmd == "STOP") {
      running = false;
      Serial.println("Stopped");
    }
    else if (cmd.startsWith("STEP:")) {
      stepDelay = cmd.substring(5).toInt();
      Serial.print("Step:"); Serial.println(stepDelay);
    }
    else if (cmd.startsWith("PAUSE:")) {
      pauseDelay = cmd.substring(6).toInt();
      Serial.print("Pause:"); Serial.println(pauseDelay);
    }
  }
}

void setup() {
  myservo.attach(7);
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Ready");
  myservo.write(pos);
}

void loop() {
  handleSerialCommands();
  if (!running) return;

  // sweep up 0→90
  for (pos = 20; pos <= 95; pos++) {
    myservo.write(pos);
    delay(stepDelay);
    handleSerialCommands();
    if (!running) return;
  }

  // pause at 90
  running = false;
  Serial.println("CARD:INSERTED");

  // wait for resume ("START")
  String resp;
  do {
    handleSerialCommands();
    while (!Serial.available());
    resp = Serial.readStringUntil('\n');
    resp.trim();
  } while (resp != "START");

  Serial.println("Resumed");
  running = true;

  // sweep down 90→0
  for (pos = 95; pos >= 20; pos--) {
    myservo.write(pos);
    delay(stepDelay);
    handleSerialCommands();
    if (!running) return;
  }

  Serial.println("CARD:REMOVED");

  // pause before next cycle
  delay(pauseDelay);
}
