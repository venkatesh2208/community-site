'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/PostCard';

const ROLE_INFO = {
  admin: 'Admin – manages users and all posts',
  editor: 'Editor – can publish and manage own posts',
  member: 'Member – can sign in and read members-only posts',
};

async function callApi(method, body) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/admin/users', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  async function login(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }
  return (
    <div className="wrap narrow">
      <h1>Sign in</h1>
      <p className="note">Accounts are created by the site admin.</p>
      <form onSubmit={login} className="form">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn" type="submit">Sign in</button>
        {msg && <p className="note">{msg}</p>}
      </form>
    </div>
  );
}

function PostForm({ session, onDone }) {
  const [type, setType] = useState('update');
  const [visibility, setVisibility] = useState('public');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function publish(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      let media_url = null;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, file);
        if (upErr) throw upErr;
        media_url = supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
      } else if (type === 'video' && videoUrl.trim()) {
        media_url = videoUrl.trim();
      }
      if ((type === 'photo' || type === 'video') && !media_url) {
        throw new Error(type === 'photo' ? 'Choose a photo to upload.' : 'Upload a video or paste a YouTube link.');
      }
      const { error } = await supabase.from('posts')
        .insert({ type, title, body, media_url, visibility, author_id: session.user.id });
      if (error) throw error;
      setTitle(''); setBody(''); setFile(null); setVideoUrl('');
      e.target.reset();
      setMsg('Published.');
      onDone();
    } catch (err) {
      setMsg(err.message || 'Something went wrong.');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={publish} className="form">
      <div className="two">
        <label>Post type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="update">Update (short news)</option>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="blog">Blog (long article)</option>
          </select>
        </label>
        <label>Who can see it
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="public">Everyone (public)</option>
            <option value="members">Signed-in members only</option>
          </select>
        </label>
      </div>
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
      <label>{type === 'blog' ? 'Article' : 'Text (optional)'}
        <textarea rows={type === 'blog' ? 14 : 4} value={body} onChange={(e) => setBody(e.target.value)} required={type === 'blog'} />
      </label>
      {type === 'photo' && (
        <label>Photo<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} /></label>
      )}
      {type === 'video' && (
        <>
          <label>Upload a video (max 50 MB)
            <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <label>Or paste a YouTube link (best for long videos)
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." />
          </label>
        </>
      )}
      <button className="btn" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
      {msg && <p className="note">{msg}</p>}
    </form>
  );
}

function UsersPanel({ me }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'member' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);

  async function run(fn, okMsg) {
    setMsg('');
    try { await fn(); setMsg(okMsg); await load(); } catch (e) { setMsg(e.message); }
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    await run(async () => {
      await callApi('POST', form);
      setForm({ full_name: '', email: '', password: '', role: 'member' });
    }, 'User created. Share the email and password with them privately.');
    setBusy(false);
  }

  return (
    <section>
      <h2 className="section">Users and permissions</h2>
      <ul className="note roles">
        {Object.values(ROLE_INFO).map((t) => <li key={t}>{t}</li>)}
      </ul>

      <form onSubmit={create} className="form card">
        <h3>Create a user</h3>
        <div className="two">
          <label>Full name<input value={form.full_name} onChange={set('full_name')} /></label>
          <label>Role
            <select value={form.role} onChange={set('role')}>
              <option value="member">Member</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>
        <div className="two">
          <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>Temporary password (min 8)<input type="text" value={form.password} onChange={set('password')} minLength={8} required /></label>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
      </form>
      {msg && <p className="note">{msg}</p>}

      {users.map((u) => {
        const self = u.id === me.id;
        return (
          <div className="card user" key={u.id}>
            <div>
              <b>{u.full_name || u.email}</b>{self && ' (you)'}
              <div className="note">{u.email}{!u.active && ' · deactivated'}</div>
            </div>
            <div className="user-actions">
              <select
                aria-label={`Role for ${u.email}`}
                value={u.role}
                disabled={self}
                onChange={(e) => run(() => callApi('PATCH', { id: u.id, role: e.target.value }), 'Role updated.')}
              >
                <option value="member">Member</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn-ghost" disabled={self}
                onClick={() => run(() => callApi('PATCH', { id: u.id, active: !u.active }), u.active ? 'User deactivated.' : 'User reactivated.')}>
                {u.active ? 'Deactivate' : 'Reactivate'}
              </button>
              <button className="btn-ghost" onClick={() => {
                const pw = prompt(`New password for ${u.email} (min 8 characters):`);
                if (pw) run(() => callApi('PATCH', { id: u.id, password: pw }), 'Password changed.');
              }}>Reset password</button>
              <button className="btn-danger" disabled={self} onClick={() => {
                if (confirm(`Delete ${u.email} permanently?`)) run(() => callApi('DELETE', { id: u.id }), 'User deleted.');
              }}>Delete</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [posts, setPosts] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(undefined); return; }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data || null));
  }, [session]);

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
  }
  useEffect(() => { if (profile && profile.active && profile.role !== 'member') loadPosts(); }, [profile]);

  async function remove(post) {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const marker = '/media/';
    if (post.media_url?.includes(marker) && post.media_url.includes('supabase')) {
      await supabase.storage.from('media').remove([post.media_url.split(marker)[1]]);
    }
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) setMsg(error.message); else { setMsg('Deleted.'); loadPosts(); }
  }

  if (session === undefined || (session && profile === undefined)) {
    return <div className="wrap"><p className="note">Loading…</p></div>;
  }
  if (!session) return <Login />;

  const signOut = <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>;

  if (!profile || !profile.active) {
    return (
      <div className="wrap narrow">
        <h1>Account inactive</h1>
        <p className="note">Your account has been deactivated. Please contact the site admin.</p>
        {signOut}
      </div>
    );
  }

  if (profile.role === 'member') {
    return (
      <div className="wrap narrow">
        <h1>Welcome{profile.full_name ? `, ${profile.full_name}` : ''}</h1>
        <p className="note">You are signed in as a member. You can read members-only posts on the home page.</p>
        <p><a href="/">Go to the home page</a></p>
        {signOut}
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';
  return (
    <div className="wrap">
      <div className="admin-head">
        <h1>New post</h1>
        <div>
          <span className="note">{profile.full_name || profile.email} · {profile.role} </span>{signOut}
        </div>
      </div>

      <PostForm session={session} onDone={loadPosts} />

      <h2 className="section">Published posts</h2>
      {msg && <p className="note">{msg}</p>}
      {posts.length === 0 && <p className="note">No posts yet.</p>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onDelete={isAdmin || p.author_id === session.user.id ? remove : undefined} />
      ))}

      {isAdmin && <UsersPanel me={session.user} />}
    </div>
  );
}
