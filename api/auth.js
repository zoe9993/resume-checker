export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const SITE_PASSWORD = process.env.SITE_PASSWORD;
  if (!SITE_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Password not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { password } = await req.json();
    if (password === SITE_PASSWORD) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
