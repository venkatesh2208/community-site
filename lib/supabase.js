import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yxmaczupshkefhermqzt.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0WIyI8IinxDH-E-vvon92g_9PX49ezH'
);

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Brundavanam Totalu';

export function youtubeId(url = '') {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}
