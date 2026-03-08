const fs = require('fs');
const b64 = "UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTlvT18AZABlAGYAYQB1AGwAdABfAGIAZQBlAHAAXwBzAG8AdQBuAGQAXwBkAGEAdABhAF8AbgBvAHQAXwBhAGMAdAB1AGEAbABfAGIAZQBlAHAAXwBqAHUAcwB0AF8AYQBfAHAAAGwAYQBjAGUAAGgAbwBsAGQAZQByAF8A";
// This is a dummy wav header + some text, won't really play as a ding. 
// I will instead use a browser-generated synth sound for reliability.
fs.writeFileSync('public/audio/notification.wav', Buffer.from(b64, 'base64'));
