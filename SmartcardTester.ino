#include <Servo.h>

Servo myservo;
bool sweeping = false;
int startPos = 20;
int endPos = 95;
int stepSize = 1;
unsigned long stepDelay = 15; // ms
unsigned long lastStep = 0;
int currentPos = 20;

void handleSerialCommands() {
  while (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd.startsWith("SWEEP:")) {
      // Format: SWEEP:START,END,STEP,DELAY
      int p1 = cmd.indexOf(':')+1;
      int p2 = cmd.indexOf(',',p1);
      int p3 = cmd.indexOf(',',p2+1);
      int p4 = cmd.indexOf(',',p3+1);

      startPos  = cmd.substring(p1, p2).toInt();
      endPos    = cmd.substring(p2+1, p3).toInt();
      stepSize  = cmd.substring(p3+1, p4).toInt();
      stepDelay = cmd.substring(p4+1).toInt();
      currentPos = startPos;
      sweeping = true;
      myservo.write(currentPos);
      lastStep = millis();
      Serial.println("SweepStart");
    }
    else if (cmd == "STOP") {
      sweeping = false;
      Serial.println("Stopped");
    }
    else if (cmd == "RESET") {
      sweeping = false;
      currentPos = startPos;
      myservo.write(currentPos);
      Serial.println("Reset");
    }
  }
}

void setup() {
  myservo.attach(7);
  Serial.begin(9600);
  while (!Serial);
  Serial.println("Ready");
  myservo.write(startPos);
}

void loop() {
  handleSerialCommands();

  if (sweeping) {
    // This is the "non-blocking" stepper
    if (millis() - lastStep >= stepDelay) {
      // --- Check for STOP right before step ---
      handleSerialCommands();
      if (!sweeping) return;

      // Now move the servo one step
      myservo.write(currentPos);

      // Update position for next step
      if (startPos < endPos) {
        currentPos += stepSize;
        if (currentPos > endPos) {
          sweeping = false;
          Serial.println("SweepDone");
        }
      } else {
        currentPos -= stepSize;
        if (currentPos < endPos) {
          sweeping = false;
          Serial.println("SweepDone");
        }
      }
      lastStep = millis();

      // --- Check for STOP right after step ---
      handleSerialCommands();
      if (!sweeping) return;
    }
  }
}

