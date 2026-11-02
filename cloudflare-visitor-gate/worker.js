export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin) || /^http:\/\/localhost(?::\d+)?$/i.test(origin) || /^http:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': allowed ? origin : 'null', 'Vary': 'Origin' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    if (request.method !== 'POST' || !allowed || !env.DB) return new Response(JSON.stringify({ok:false}), {status:403,headers});
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ok:false}), {status:400,headers}); }
    const key = String(body.key || '');
    const page = String(body.page || '').slice(0, 300);
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(key) || !page.startsWith('/')) return new Response(JSON.stringify({ok:false}), {status:400,headers});
    const visitor = await env.DB.prepare('SELECT name FROM visitors WHERE key=? AND active=1').bind(key).first();
    if (!visitor) return new Response(JSON.stringify({ok:false}), {status:403,headers});
    await env.DB.prepare('INSERT INTO visits (key,page) VALUES (?,?)').bind(key,page).run();
    return new Response(JSON.stringify({ok:true}), {status:200,headers});
  }
};
