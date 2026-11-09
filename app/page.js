'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/PostCard';

const FILTERS = [
  ['all', 'All'],
  ['update', 'Updates'],
  ['photo', 'Photos'],
  ['video', 'Videos'],
  ['blog', 'Blogs'],
];

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [state, setState] = useState('loading');

  useEffect(() => {
    supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) return setState('error');
        setPosts(data);
        setState('ready');
      });
  }, []);

  const shown = filter === 'all' ? posts : posts.filter((p) => p.type === filter);

  return (
    <div className="wrap">
      <nav className="filters" aria-label="Filter posts">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            className={filter === key ? 'chip on' : 'chip'}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {state === 'loading' && <p className="note">Loading posts…</p>}
      {state === 'error' && <p className="note">Couldn’t load posts. Check your Supabase settings.</p>}
      {state === 'ready' && shown.length === 0 && (
        <p className="note">Nothing here yet. New posts will appear as soon as the admin publishes them.</p>
      )}
      {shown.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}
