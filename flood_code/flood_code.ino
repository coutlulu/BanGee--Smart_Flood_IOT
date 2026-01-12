#include <ESP32Servo.h>
#include <WiFi.h>
#include <PubSubClient.h>


// --- CONFIG ---
const char* ssid = "HakoWifi 2.4G";
const char* password = "hajiactive7114";
const char* mqtt_server = "35.224.186.13";
const int mqtt_port = 1883;


// --- PINS ---
#define PIN_RIVER  34
#define PIN_TANK1  36
#define PIN_TANK2  39
#define PIN_RAIN   35
#define PIN_FLOW1  27
#define PIN_FLOW2  14
#define PIN_SERVO1 18
#define PIN_SERVO2 19
#define PIN_RELAY  23
#define PIN_BUZZER 4
#define PIN_RGB_R  21
#define PIN_RGB_G  22
#define PIN_RGB_B  5


// --- VARIABLES ---
WiFiClient espClient;
PubSubClient client(espClient);
Servo valve1;
Servo valve2;
unsigned long lastReportTime = 0;
bool manualOverride = false;


// Connection Status Trackers
bool wifiConnected = false;
bool mqttConnected = false;


// Averaging & Flow
long sumRiver=0, sumTank1=0, sumTank2=0, sampleCount=0;
volatile int pulse1=0, pulse2=0;
void IRAM_ATTR isr1() { pulse1++; }
void IRAM_ATTR isr2() { pulse2++; }


// --- CALLBACK FOR MANUAL BUTTON ---
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for(int i=0; i<length; i++) msg += (char)payload[i];
 
  if (msg == "ON") {
    manualOverride = true;
    digitalWrite(PIN_RELAY, HIGH);
    Serial.println("COMMAND: PUMP FORCED ON");
  } else {
    manualOverride = false;
    digitalWrite(PIN_RELAY, LOW);
    Serial.println("COMMAND: PUMP AUTO/OFF");
  }
}


void setup() {
  Serial.begin(9600);
  pinMode(PIN_RIVER, INPUT);
  pinMode(PIN_TANK1, INPUT);
  pinMode(PIN_TANK2, INPUT);
  pinMode(PIN_RAIN, INPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RGB_R, OUTPUT);
  pinMode(PIN_RGB_G, OUTPUT);
  pinMode(PIN_RGB_B, OUTPUT);
  pinMode(PIN_FLOW1, INPUT_PULLUP);
  pinMode(PIN_FLOW2, INPUT_PULLUP);
 
  valve1.attach(PIN_SERVO1);
  valve2.attach(PIN_SERVO2);
  valve1.write(0);   // Valve1: 0 = CLOSED (normal)
  valve2.write(90);  // Valve2: 90 = CLOSED (inverted - physical at 90° is closed)
 
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW1), isr1, RISING);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW2), isr2, RISING);


  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
 
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
 
  wifiConnected = true;
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
 
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}


void loop() {
  // Check WiFi Status
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("WiFi disconnected");
      wifiConnected = false;
    }
  } else {
    if (!wifiConnected) {
      Serial.println("WiFi reconnected");
      wifiConnected = true;
    }
  }


  // Check MQTT Connection
  if (!client.connected()) {
    if (mqttConnected) {
      Serial.println("MQTT disconnected");
      mqttConnected = false;
    }
   
    Serial.println("Attempting MQTT connection...");
    if (client.connect("ESP32_BanGee")) {
      Serial.println("MQTT connected");
      client.subscribe("myproject/manual_pump");
      Serial.println("Subscribed to: myproject/manual_pump");
      mqttConnected = true;
    } else {
      Serial.print("MQTT connection failed, rc=");
      Serial.println(client.state());
      delay(1000);
    }
  }
 
  client.loop();


  // MANUAL OVERRIDE ENFORCEMENT
  if (manualOverride) {
    digitalWrite(PIN_RELAY, HIGH);
  }


  // Sampling (Every 100ms)
  static unsigned long lastSample = 0;
  if (millis() - lastSample > 100) {
    sumRiver += analogRead(PIN_RIVER);
    sumTank1 += analogRead(PIN_TANK1);
    sumTank2 += analogRead(PIN_TANK2);
    sampleCount++;
    lastSample = millis();
  }


  // Reporting (Every 2 Seconds)
  if (millis() - lastReportTime > 2000) {
    int avgRiver=0, avgTank1=0, avgTank2=0;
    if (sampleCount > 0) {
        avgRiver = sumRiver/sampleCount;
        avgTank1 = sumTank1/sampleCount;
        avgTank2 = sumTank2/sampleCount;
    }
   
    float f1 = (pulse1/2.0) * (60.0/7.5);
    float f2 = (pulse2/2.0) * (60.0/7.5);
   
    sumRiver=0; sumTank1=0; sumTank2=0; sampleCount=0; pulse1=0; pulse2=0;
    lastReportTime = millis();


    Serial.println("--- SENSOR READINGS ---");
    Serial.print("River Level: "); Serial.println(avgRiver);
    Serial.print("Tank 1 Level: "); Serial.println(avgTank1);
    Serial.print("Tank 2 Level: "); Serial.println(avgTank2);
    Serial.print("Flow Rate 1: "); Serial.println(f1);
    Serial.print("Flow Rate 2: "); Serial.println(f2);
    Serial.println("-----------------------");


    // SYSTEM LOGIC - INVERTED for Valve 2
    // For Valve 2: 0=OPEN (physical 0°), 90=CLOSED (physical 90°)
    String status="SAFE", led="GREEN", rain=(analogRead(PIN_RAIN)<1500)?"RAINING":"DRY";
    bool buzz=false;
    int v1_logical=0, v2_logical=90;  // Start with both closed


    // [PRIORITY 1] MANUAL OVERRIDE
    if (manualOverride) {
      status = "MANUAL PUMP ON";
      led = "BLUE";
      v1_logical=0;   // Valve1 closed
      v2_logical=0;   // Valve2 OPEN (inverted: 0 = open)
      buzz=false;
      digitalWrite(PIN_RELAY, HIGH);
    }
    // [PRIORITY 2] CRITICAL: TANKS FULL
    else if ((avgTank1 > 800 || avgTank2 > 800) && avgRiver > 700) {
      status = "CRITICAL: TANKS FULL";
      led = "RED";
      buzz = true;
      v1_logical=0; v2_logical=90;  // Both closed (v2=90 means closed in inverted logic)
      digitalWrite(PIN_RELAY, LOW);
    }
    // [PRIORITY 3] FLOOD: RIVER HIGH -> FILL BOTH TANKS
    else if (avgRiver > 700 && (avgTank1 < 800 || avgTank2 < 800)) {
      status = "FLOOD: FILLING TANKS";
      led = "BLUE";
      v1_logical=90; v2_logical=0;  // Both OPEN (v1=90 open normal, v2=0 open inverted)
      digitalWrite(PIN_RELAY, LOW);
      buzz = false;
     
      if (f1 < 1.0 && f2 < 1.0) {
         status = "ALERT: DRAINS CLOGGED";
         led = "RED";
      }
    }
    // [PRIORITY 4] RECOVERY: PUMP OUT
    else if (avgRiver <= 500 && (avgTank1 > 300 || avgTank2 > 300)) {
      status = "RECOVERY: PUMPING OUT";
      led = "BLUE";
      v1_logical=0; v2_logical=0;  // v1 closed, v2 OPEN (inverted)
      digitalWrite(PIN_RELAY, HIGH);
      buzz = false;
    }
    // [PRIORITY 5] SAFE IDLE
    else {
      status = "SAFE";
      led = "GREEN";
      v1_logical=0; v2_logical=90;  // Both closed
      digitalWrite(PIN_RELAY, LOW);
      buzz = false;
    }


    // ACTUATE HARDWARE - Direct write for Valve2 (inverted logic built into v2_logical values)
    valve1.write(v1_logical);  // Normal: 0=closed, 90=open
    valve2.write(v2_logical);  // Inverted: 90=closed, 0=open (handled in logic above)
    digitalWrite(PIN_BUZZER, buzz);
   
    // RGB Logic
    if(led=="RED") {
      digitalWrite(PIN_RGB_R,1); digitalWrite(PIN_RGB_G,0); digitalWrite(PIN_RGB_B,0);
    }
    else if(led=="GREEN") {
      digitalWrite(PIN_RGB_R,0); digitalWrite(PIN_RGB_G,1); digitalWrite(PIN_RGB_B,0);
    }
    else {
      digitalWrite(PIN_RGB_R,0); digitalWrite(PIN_RGB_G,0); digitalWrite(PIN_RGB_B,1);
    }


    // Convert Valve2 logical state to dashboard convention (0=closed, 90=open)
    int v2_dashboard = (v2_logical == 0) ? 90 : 0;  // Flip for dashboard display


    // Send Data
    String json = "{";
    json += "\"river_level\": " + String(avgRiver) + ",";
    json += "\"tank1_level\": " + String(avgTank1) + ",";
    json += "\"tank2_level\": " + String(avgTank2) + ",";
    json += "\"flow_rate1\": " + String(f1) + ",";
    json += "\"flow_rate2\": " + String(f2) + ",";
    json += "\"rain_status\": \"" + rain + "\",";
    json += "\"status\": \"" + status + "\",";
    json += "\"valve1_state\": " + String(v1_logical) + ",";
    json += "\"valve2_state\": " + String(v2_dashboard) + ",";  // Use converted value
    json += "\"buzzer_state\": " + String(buzz?"true":"false") + ",";
    json += "\"led_color\": \"" + led + "\"";
    json += "}";


    if (client.connected()) {
      client.publish("myproject/report", json.c_str());
      Serial.println("Data published");
      Serial.print("Valve1: "); Serial.print(v1_logical);
      Serial.println(v1_logical == 0 ? " (CLOSED)" : " (OPEN)");
      Serial.print("Valve2 Physical: "); Serial.print(v2_logical);
      Serial.println(v2_logical == 90 ? " (CLOSED)" : " (OPEN)");
      Serial.print("Valve2 Dashboard: "); Serial.println(v2_dashboard);
      Serial.print("System Status: "); Serial.println(status);
    } else {
      Serial.println("Cannot publish: MQTT not connected");
    }
  }
}





