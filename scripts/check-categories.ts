import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCategories() {
  const { data, error } = await supabase.from('menu').select('category');
  if (error || !data) {
    console.error('Error fetching categories:', error);
    return;
  }
  const categoryCounts: Record<string, number> = {};
  data.forEach(item => {
    const cat = item.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  console.log('--- SUPABASE MENU CATEGORIES ---');
  console.log(JSON.stringify(categoryCounts, null, 2));
}

checkCategories();
