/**
 * Cloudflare Worker - The Pensive Index
 *
 * Unified worker handling both Next.js app and documentation
 * Routes requests intelligently between static assets and dynamic content
 */

import { handleRequest } from './src/worker/handler.js';

const worker = {
  fetch(request: Request, env: any, ctx: any): Response {
    return handleRequest(request, env, ctx);
  },
};

export default worker;

export { handleRequest };
