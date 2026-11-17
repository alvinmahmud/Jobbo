import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createJobsHandler } from './jobs.mjs';

export function createJobsServer(config = {}) {
  return createServer(createJobsHandler(config));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError('PORT must be between 1 and 65535');
  const server = createJobsServer();
  server.on('error', () => {
    console.error('Jobs proxy could not listen. Check HOST, PORT, and whether the port is already in use.');
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`Jobs proxy listening on ${host}:${port}`));
}
