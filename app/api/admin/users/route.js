import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'editor', 'member'];
const fail = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Only an active admin may call these endpoints
async function requireAdmin(req, db) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: p } = await db.from('profiles').select('role, active').eq('id', data.user.id).single();
  return p && p.role === 'admin' && p.active ? data.user : null;
}

export async function POST(req) {
  const db = serviceClient();
  if (!db) return fail('Server is missing SUPABASE_SERVICE_ROLE_KEY.', 500);
  const me = await requireAdmin(req, db);
  if (!me) return fail('Admins only.', 403);

  const { email, password, full_name = '', role = 'member' } = await req.json();
  if (!email || !password) return fail('Email and password are required.');
  if (password.length < 8) return fail('Password must be at least 8 characters.');
  if (!ROLES.includes(role)) return fail('Invalid role.');

  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (error) return fail(error.message);

  const { error: pErr } = await db.from('profiles')
    .upsert({ id: data.user.id, email, full_name, role, active: true });
  if (pErr) return fail(pErr.message, 500);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const db = serviceClient();
  if (!db) return fail('Server is missing SUPABASE_SERVICE_ROLE_KEY.', 500);
  const me = await requireAdmin(req, db);
  if (!me) return fail('Admins only.', 403);

  const { id, role, active, full_name, password } = await req.json();
  if (!id) return fail('User id is required.');
  if (id === me.id && ((role && role !== 'admin') || active === false)) {
    return fail('You cannot remove your own admin access.');
  }

  const patch = {};
  if (role !== undefined) {
    if (!ROLES.includes(role)) return fail('Invalid role.');
    patch.role = role;
  }
  if (active !== undefined) patch.active = !!active;
  if (full_name !== undefined) patch.full_name = full_name;
  if (Object.keys(patch).length) {
    const { error } = await db.from('profiles').update(patch).eq('id', id);
    if (error) return fail(error.message, 500);
  }

  const authUpdate = {};
  if (password) {
    if (password.length < 8) return fail('Password must be at least 8 characters.');
    authUpdate.password = password;
  }
  if (active !== undefined) authUpdate.ban_duration = active ? 'none' : '876000h'; // blocks login when deactivated
  if (Object.keys(authUpdate).length) {
    const { error } = await db.auth.admin.updateUserById(id, authUpdate);
    if (error) return fail(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const db = serviceClient();
  if (!db) return fail('Server is missing SUPABASE_SERVICE_ROLE_KEY.', 500);
  const me = await requireAdmin(req, db);
  if (!me) return fail('Admins only.', 403);

  const { id } = await req.json();
  if (!id) return fail('User id is required.');
  if (id === me.id) return fail('You cannot delete your own account.');
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
