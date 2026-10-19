import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

const testInsert = {
  invoice_id: "00000000-0000-0000-0000-000000000000",
  pay_date: "2026-09-10",
  amount: 1,
  method: "Transfer",
  account_id: "A-002",
  ref: "TEST"
};

const { data, error } = await sb.from('payments').insert(testInsert).select();
if (error) {
  console.log('Insert error:', error.message);
} else {
  console.log('Insert OK, columns:', Object.keys(data[0]));
  await sb.from('payments').delete().eq('id', data[0].id);
}