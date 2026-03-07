// Health check for load balancer / proxy (e.g. Hostinger). GET /api/health returns 200 when app is up.
export async function GET() {
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
