const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://vqozqgjrqeukqtnlqbto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA'
);

sb.from('surat_jalan').select('*, customers(name)').limit(100).then(r => {
  console.log(JSON.stringify(r.data));
}).catch(e => console.error(e));