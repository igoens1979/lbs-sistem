import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Coba insert dengan customer_id NULL untuk test constraint
const testId = 'test-constraint-' + Date.now();
const { data, error } = await sb.from('invoices').insert({
  id: testId,
  no: 'TEST/NULL/CUSTOMER',
  customer_id: null,
  inv_date: '2026-10-19',
  due_date: '2026-11-19',
  dpp: 0,
  ppn: 0,
  total: 0,
  status: 'Draft'
}).select();

if (error) {
  console.log('Constraint customer_id NOT NULL: YA');
  console.log('Error:', error.message);
} else {
  console.log('Constraint customer_id nullable: TIDAK (boleh NULL)');
  // Hapus data test
  await sb.from('invoices').delete().eq('id', testId);
}