// Pages Function: POST /api/upload
// 上传图片：FormData { subject, period, file, pass }
export async function onRequestPost({ request, env }) {
  const ADMIN_PASS = '123456';
  const form = await request.formData();
  const subject = (form.get('subject') || '').trim();
  const period = (form.get('period') || '').trim();
  const pass = (form.get('pass') || '').trim();
  const file = form.get('file');

  if (pass !== ADMIN_PASS) return Response.json({ error: '无权限' }, { status: 403 });
  if (!subject || !period || !file) return Response.json({ error: '参数缺失' }, { status: 400 });
  if (!/^[1-9]$|^1[0-7]$/.test(period)) return Response.json({ error: '期数不合法' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) return Response.json({ error: '图片超过 10MB 限制' }, { status: 413 });

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objKey = `${subject}/${period}/${id}`;

  // 1. 存图片到 R2
  await env.IMAGES.put(objKey, bytes, { httpMetadata: { contentType: file.type || 'image/jpeg' } });

  // 2. 更新 KV 索引
  const idxKey = `index:${subject}:${period}`;
  let list = [];
  const raw = await env.IMAGES_INDEX.get(idxKey);
  if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
  list.push(id);
  await env.IMAGES_INDEX.put(idxKey, JSON.stringify(list));

  return Response.json({ ok: true, id, url: `/api/file/${encodeURIComponent(subject)}/${period}/${id}` });
}
