import { youtubeId } from '../lib/supabase';

const LABELS = { update: 'Update', photo: 'Photo', video: 'Video', blog: 'Blog' };

export default function PostCard({ post, onDelete }) {
  const yt = post.type === 'video' ? youtubeId(post.media_url || '') : null;
  const date = new Date(post.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <article className="post">
      <div className="post-meta">
        <span className={`tag tag-${post.type}`}>{LABELS[post.type]}</span>
        <time>{date}</time>
        {post.visibility === 'members' && <span className="tag tag-members">Members only</span>}
      </div>
      <h2>{post.title}</h2>

      {post.type === 'photo' && post.media_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.media_url} alt={post.title} loading="lazy" />
      )}
      {post.type === 'video' && post.media_url && (
        yt ? (
          <div className="video-wrap">
            <iframe
              src={`https://www.youtube.com/embed/${yt}`}
              title={post.title}
              allowFullScreen
            />
          </div>
        ) : (
          <video src={post.media_url} controls preload="metadata" />
        )
      )}
      {post.body && <p className={post.type === 'blog' ? 'body blog' : 'body'}>{post.body}</p>}

      {onDelete && (
        <button className="btn-danger" onClick={() => onDelete(post)}>Delete</button>
      )}
    </article>
  );
}
