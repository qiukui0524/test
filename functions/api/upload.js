// Pages Function: POST /api/upload
// 上传图片：FormData { subject, period, file, pass }
// 图片以 Base64 存入 KV（免费，无需 R2）
export async function onRequestPost({ request, env }) {
  const ADMIN_PASS = 'homeworkhelperbyqiukui172839@@';
  const form = await request.formData();
  const subject = (form.get('subject') || '').trim();
  const period = (form.get('period') || '').trim();
  const pass = (form.get('pass') || '').trim();
  const file = form.get('file');

  if (pass !== ADMIN_PASS) return Response.json({ error: '无权限' }, { status: 403 });
  if (!subject || !period || !file) return Response.json({ error: '参数缺失' }, { status: 400 });
  if (!/^[1-9]$|^1[0-7]$/.test(period)) return Response.json({ error: '期数不合法' }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) return Response.json({ error: '图片超过 8MB 限制（Base64 后需小于 KV 25MB 上限）' }, { status: 413 });

  // Uint8Array → Base64
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${b64}`;

  // 1. 存图片到 KV
  await env.IMAGES_INDEX.put(`img:${subject}:${period}:${id}`, dataUrl);

  // 2. 更新 KV 索引
  const idxKey = `index:${subject}:${period}`;
  let list = [];
  const raw = await env.IMAGES_INDEX.get(idxKey);
  if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
  list.push(id);
  await env.IMAGES_INDEX.put(idxKey, JSON.stringify(list));

  return Response.json({ ok: true, id, url: `/api/file/${encodeURIComponent(subject)}/${period}/${id}` });
}
