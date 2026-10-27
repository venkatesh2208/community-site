'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/PostCard';

export default function Admin() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const [type, setType] = useState('update');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    setPosts(data || []);
  }
  useEffect(() => { if (session) loadPosts(); }, [session]);

  async function login(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function publish(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
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

      const { error } = await supabase.from('posts').insert({ type, title, body, media_url });
      if (error) throw error;

      setTitle(''); setBody(''); setFile(null); setVideoUrl('');
      e.target.reset();
      setMsg('Published.');
      loadPosts();
    } catch (err) {
      setMsg(err.message || 'Something went wrong.');
    }
    setBusy(false);
  }

  async function remove(post) {
    if (!confirm(`Delete “${post.title}”?`)) return;
    const marker = '/media/';
    if (post.media_url?.includes(marker) && post.media_url.includes('supabase')) {
      await supabase.storage.from('media').remove([post.media_url.split(marker)[1]]);
    }
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) setMsg(error.message); else { setMsg('Deleted.'); loadPosts(); }
  }

  if (session === undefined) return <div className="wrap"><p className="note">Loading…</p></div>;

  if (!session) {
    return (
      <div className="wrap narrow">
        <h1>Admin sign in</h1>
        <form onSubmit={login} className="form">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="btn" type="submit">Sign in</button>
          {msg && <p className="note">{msg}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="admin-head">
        <h1>New post</h1>
        <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <form onSubmit={publish} className="form">
        <label>Post type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="update">Update (short news)</option>
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="blog">Blog (long article)</option>
          </select>
        </label>
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

      <h2 className="section">Published posts</h2>
      {posts.length === 0 && <p className="note">No posts yet.</p>}
      {posts.map((p) => <PostCard key={p.id} post={p} onDelete={remove} />)}
    </div>
  );
}
