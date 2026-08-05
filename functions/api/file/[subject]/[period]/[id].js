// Pages Function: GET /api/file/{subject}/{period}/{id}
// 从 KV 读取 Base64 图片并返回
export async function onRequestGet({ env, params, request }) {
  const subject = decodeURIComponent(params.subject || '');
  const period = params.period || '';
  const id = params.id || '';
  const key = `img:${subject}:${period}:${id}`;

  const dataUrl = await env.IMAGES_INDEX.get(key);
  if (!dataUrl) return new Response('Not Found', { status: 404 });

  // dataUrl 格式: data:image/jpeg;base64,xxxx
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return new Response('Bad Data', { status: 500 });
  const meta = dataUrl.slice(0, comma);
  const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
  const b64 = dataUrl.slice(comma + 1);

  // Base64 → Uint8Array（兼容 Cloudflare Workers 环境）
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const headers = new Headers();
  headers.set('Content-Type', mime);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(bytes, { headers });
}
