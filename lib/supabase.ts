import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

export type Feather = {
  id: string;
  title: string;
  excerpt: string;
  pen_name: string;
  mbti: string | null;
  source: string | null;
  tags: string[];
  mood: 'blue' | 'pink' | 'yellow' | 'green' | 'purple';
  allow_claim: boolean;
  status: 'pending' | 'live' | 'hidden' | 'rejected';
  created_at: string;
  approved_at: string | null;
};
