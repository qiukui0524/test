// Pages Function: GET /api/file/{subject}/{period}/{id}
// 从 R2 读取图片并返回（支持缓存）
export async function onRequestGet({ env, params, request }) {
  const subject = decodeURIComponent(params.subject || '');
  const period = params.period || '';
  const id = params.id || '';
  const objKey = `${subject}/${period}/${id}`;

  const obj = await env.IMAGES.get(objKey);
  if (!obj) return new Response('Not Found', { status: 404 });

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  // 支持 Range 请求（大图滚动加载）
  const range = request.headers.get('Range');
  if (range) {
    const [start, end] = range.replace('bytes=', '').split('-').map(n => parseInt(n));
    const total = obj.size;
    const s = start || 0;
    const e = end || total - 1;
    const chunk = await obj.arrayBuffer();
    headers.set('Content-Range', `bytes ${s}-${e}/${total}`);
    headers.set('Accept-Ranges', 'bytes');
    return new Response(chunk.slice(s, e + 1), { status: 206, headers });
  }
  return new Response(obj.body, { headers });
}
