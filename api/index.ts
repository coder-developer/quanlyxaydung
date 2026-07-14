import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../server/index.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const apiPath = url.searchParams.get('__path') || '';
  url.searchParams.delete('__path');
  const query = url.searchParams.toString();
  req.url = `/api/${apiPath}${query ? `?${query}` : ''}`;
  return app(req, res);
}
