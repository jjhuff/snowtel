#include "RFM69.h"

#define NODEID        1    //unique for each node on same network
#define NETWORKID     100  //the same on all nodes that talk to each other
//Match frequency to the hardware version of the radio on your Moteino (uncomment one):
#define FREQUENCY     RF69_433MHZ
//#define FREQUENCY     RF69_868MHZ
//#define FREQUENCY     RF69_915MHZ
#define ENCRYPTKEY    "sampleEncryptKey" //exactly the same 16 characters/bytes on all nodes!
//#define IS_RFM69HW    //uncomment only for RFM69HW! Leave out if you have RFM69W!
#define ACK_TIME      30 // max # of ms to wait for an ack

#define LED           D7  // Use Spark onboard LED on D7

RFM69 radio;

void setup() {
    Serial.begin(9600);
    radio.initialize(FREQUENCY,NODEID,NETWORKID);
}

void loop() {

    if(Serial.available()) {
        int input = Serial.read();
        if (input == 'h') {
            Serial.println("Hello Computer");
        } else if (input == 'd') { //d=dump all register values
            radio.readAllRegs();
        } else if (input == 't') {
            byte temperature =  radio.readTemperature(-1); // -1 = user cal factor, adjust for correct ambient
            Serial.print( "Radio Temp is ");
            Serial.print(temperature);
            Serial.println("C");
        } else if (input == 's') {
            byte rssi =  radio.readRSSI(true);
            Serial.print( "RSSI: ");
            Serial.println(rssi);
        }
    }
}
