
#include <Servo.h>
Servo myservo;

int pos = 0;
bool running = false;
unsigned long stepDelay  = 15;   // default ms per degree
unsigned long pauseDelay = 1000; // default ms between sweeps

void setup() {
  myservo.attach(7);
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Ready");
}

void loop() {
  // process incoming
  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if      (cmd == "START")           { running = true;  Serial.println("Started"); }
    else if (cmd == "STOP")            { running = false; Serial.println("Stopped"); }
    else if (cmd.startsWith("STEP:"))  { stepDelay  = cmd.substring(5).toInt(); Serial.print("Step: "); Serial.println(stepDelay); }
    else if (cmd.startsWith("PAUSE:")) { pauseDelay = cmd.substring(6).toInt(); Serial.print("Pause: "); Serial.println(pauseDelay); }
  }

  // run sweep + pause
  if (running) {
    for (pos = 0; pos <= 90 && running; pos++) {
      myservo.write(pos);
      delay(stepDelay);
      checkStop();
    }
    for (pos = 90; pos >= 0 && running; pos--) {
      myservo.write(pos);
      delay(stepDelay);
      checkStop();
    }
    delay(pauseDelay);
  }
}

void checkStop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();                  // strip whitespace
    if (cmd == "STOP") {         // now this is valid
      running = false;
      Serial.println("Stopped");
    }
  }
}

