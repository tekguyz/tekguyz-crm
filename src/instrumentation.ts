// Next.js instrumentation hook (stable since Next 14, no config flag needed
// on this project's 15.5.20) — register() runs once per server instance
// boot, before any request is handled. Guarded to the nodejs runtime only:
// register() also fires for the edge runtime (middleware), which doesn't
// carry these server secrets and shouldn't bundle code that expects them.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env/validate-env");
    validateEnv();
  }
}
