declare module '@astrojs/cloudflare/entrypoints/server.js' {
  export function createExports(manifest: unknown): {
    default: { fetch: (request: Request, env: unknown, context: unknown) => Promise<Response> };
  };
}