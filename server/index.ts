import 'dotenv/config';
import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
createApp().listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`Common Ground server listening on port ${port}`));
