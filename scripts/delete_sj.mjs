import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://vqozqgjrqeukqtnlqbto.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA');
await sb.from('invoice_sj').delete().neq('sj_id', '');
const { error, count } = await sb.from('surat_jalan').delete().neq('id', '');
console.log('deleted', count, error?.message);
