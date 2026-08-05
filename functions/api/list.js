// Pages Function: GET /api/list?subject=语文&period=1
// 返回某科目某期的图片列表
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const subject = url.searchParams.get('subject') || '';
  const period = url.searchParams.get('period') || '';
  const key = `index:${subject}:${period}`;
  let list = [];
  try {
    const raw = await env.IMAGES_INDEX.get(key);
    if (raw) list = JSON.parse(raw);
  } catch (e) { list = []; }
  // 生成可访问的 URL
  const images = list.map(id => ({
    id,
    url: `/api/file/${encodeURIComponent(subject)}/${period}/${id}`
  }));
  return Response.json({ images });
}
