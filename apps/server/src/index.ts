import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, config.host, () => {
  console.log(`Tulu's Theater API on http://${config.host}:${config.port}`);
});
