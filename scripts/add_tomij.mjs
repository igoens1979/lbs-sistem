import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  "https://vqozqgjrqeukqtnlqbto.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb3pxZ2pycWV1a3F0bmxxYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTkzMDUsImV4cCI6MjEwNzY3NTMwNX0.rN-gab7oBrbJ29Lrzt8IG6sZlaemaJeCcML_KcWPUPA"
);

// Tambahkan BPK TOMIJ
const { data, error } = await sb.from('customers').insert({
  id: 'C-008',
  code: 'TOMIJ-001',
  name: 'BPK TOMIJ',
  city: '',
  contact: '',
  phone: '',
  term: 0,
  segment: 'UMKM',
  status: 'Aktif',
  since: '2026-10-19',
  created_at: new Date().toISOString()
}).select();

if (error) {
  console.log('Gagal tambah:', error.message);
} else {
  console.log('OK tambah BPK TOMIJ:', data[0]);
}