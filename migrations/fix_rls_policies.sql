-- =========================================
-- Migration: Fix Row-Level Security (RLS) policies
-- Run this in Supabase SQL Editor
-- =========================================

-- Option A: Disable RLS on all tables (simplest for development)
ALTER TABLE rag_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE phone_document_mapping DISABLE ROW LEVEL SECURITY;

-- =========================================
-- OR Option B: Enable RLS but allow full access via anon key
-- (Comment out Option A above and uncomment below for production)
-- =========================================

-- -- rag_files
-- ALTER TABLE rag_files ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to rag_files" ON rag_files;
-- CREATE POLICY "Allow all access to rag_files"
--   ON rag_files FOR ALL
--   USING (true) WITH CHECK (true);

-- -- rag_chunks
-- ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to rag_chunks" ON rag_chunks;
-- CREATE POLICY "Allow all access to rag_chunks"
--   ON rag_chunks FOR ALL
--   USING (true) WITH CHECK (true);

-- -- messages
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to messages" ON messages;
-- CREATE POLICY "Allow all access to messages"
--   ON messages FOR ALL
--   USING (true) WITH CHECK (true);

-- -- whatsapp_messages
-- ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to whatsapp_messages" ON whatsapp_messages;
-- CREATE POLICY "Allow all access to whatsapp_messages"
--   ON whatsapp_messages FOR ALL
--   USING (true) WITH CHECK (true);

-- -- phone_document_mapping
-- ALTER TABLE phone_document_mapping ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow all access to phone_document_mapping" ON phone_document_mapping;
-- CREATE POLICY "Allow all access to phone_document_mapping"
--   ON phone_document_mapping FOR ALL
--   USING (true) WITH CHECK (true);

-- =========================================
-- Migration Complete
-- =========================================
