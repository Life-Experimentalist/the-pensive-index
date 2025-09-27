/**
 * Cloudflare Worker - The Pensive Index
 *
 * Unified worker handling both Next.js app and documentation
 * Routes requests intelligently between static assets and dynamic content
 */

import { handleRequest } from './src/worker/handler';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};

export { handleRequest };
