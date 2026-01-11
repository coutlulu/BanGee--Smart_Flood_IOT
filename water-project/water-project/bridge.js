const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// SETUP
const supabase = createClient('https://rhpfrwglerhdkvuuflqm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocGZyd2dsZXJoZGt2dXVmbHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODY1OTMsImV4cCI6MjA4MzI2MjU5M30.2FdGAKDRa_i1jOBufQT43bNPCgUYW8QTGuogmJtUJhY');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('BRIDGE ACTIVE');
  client.subscribe('myproject/report'); // Listen to ESP32

  // LISTEN TO SUPABASE (For Admin Button)
  supabase
    .channel('admin-commands')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'command_queue' },
      (payload) => {
        console.log('Command Received:', payload.new.command_type);
        if(payload.new.command_type === "PUMP_ON") {
            client.publish('myproject/manual_pump', 'ON');
        } else {
            client.publish('myproject/manual_pump', 'OFF');
        }
      }
    )
    .subscribe();
});

// SAVE DATA TO DB
// ... (Keep existing setup lines) ...

client.on('message', async (topic, message) => {
  if(topic === 'myproject/report') {
    try {
        const data = JSON.parse(message.toString());

        // Insert with NEW fields
        await supabase.from('flood_logs').insert({
river_level: data.river_level,
    tank1_level: data.tank1_level,
    tank2_level: data.tank2_level,
    rain_status: data.rain_status,
    status:      data.status,
    buzzer_state: data.buzzer_state,
    led_color:   data.led_color,
    
    // SEPARATED DATA
    flow_rate1:  data.flow_rate1,
    flow_rate2:  data.flow_rate2,
    valve1_state: data.valve1_state,
    valve2_state: data.valve2_state
        });
        console.log("Log Saved. LED Color:", data.led_color);
    } catch(e) { console.log("JSON Error", e); }
  }
});
