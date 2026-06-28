import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kncivfijkpxzbtlwnydb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuY2l2Zmlqa3B4emJ0bHdueWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjkwOTQsImV4cCI6MjA5NjE0NTA5NH0.5KV7pKvVakxCSedRtx0nM3P9iTpKQfomEUrAUl3KjZw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Querying profiles...');
  const { data: profiles, error: errProf } = await supabase.from('profiles').select('*');
  if (errProf) console.error('Profiles error:', errProf);
  else console.log('Profiles:', profiles);

  console.log('Querying projects...');
  const { data: projects, error: errProj } = await supabase.from('projects').select('*');
  if (errProj) console.error('Projects error:', errProj);
  else console.log('Projects count:', projects?.length);

  console.log('Querying orders...');
  const { data: orders, error: errOrders } = await supabase.from('orders').select('*');
  if (errOrders) console.error('Orders error:', errOrders);
  else console.log('Orders count:', orders?.length);
}

check();
