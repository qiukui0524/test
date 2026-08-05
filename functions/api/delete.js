// Pages Function: DELETE /api/delete
// 删除图片：JSON { subject, period, id, pass }
export async function onRequestDelete({ request, env }) {
  const ADMIN_PASS = '123456';
  let body;
  try { body = await request.json(); } catch (e) { return Response.json({ error: '参数错误' }, { status: 400 }); }
  const { subject, period, id, pass } = body || {};
  if (pass !== ADMIN_PASS) return Response.json({ error: '无权限' }, { status: 403 });
  if (!subject || !period || !id) return Response.json({ error: '参数缺失' }, { status: 400 });

  // 1. 删除 R2 中的图片
  const objKey = `${subject}/${period}/${id}`;
  try { await env.IMAGES.delete(objKey); } catch (e) { /* ignore */ }

  // 2. 从 KV 索引中移除
  const idxKey = `index:${subject}:${period}`;
  let list = [];
  const raw = await env.IMAGES_INDEX.get(idxKey);
  if (raw) { try { list = JSON.parse(raw); } catch (e) { list = []; } }
  list = list.filter(x => x !== id);
  if (list.length === 0) await env.IMAGES_INDEX.delete(idxKey);
  else await env.IMAGES_INDEX.put(idxKey, JSON.stringify(list));

  return Response.json({ ok: true });
}
