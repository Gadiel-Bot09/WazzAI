-- ============================================================
-- WazzAI — Storage Buckets Migration
-- Migration: 002_storage_buckets.sql
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Profile avatars (public)
  (
    'avatars',
    'avatars',
    TRUE,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  -- Organization logos (public)
  (
    'org-logos',
    'org-logos',
    TRUE,
    5242880,  -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  ),
  -- WhatsApp media (private, accessed via signed URLs)
  (
    'whatsapp-media',
    'whatsapp-media',
    FALSE,
    52428800,  -- 50 MB
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
      'video/mp4', 'video/ogg', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  ),
  -- Knowledge base documents (private)
  (
    'knowledge-docs',
    'knowledge-docs',
    FALSE,
    20971520,  -- 20 MB
    ARRAY[
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/webp'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- Avatars: anyone can view, authenticated users can upload their own
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Org logos: public read, org owner/admin can upload
CREATE POLICY "org_logos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "org_logos_org_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'org-logos'
    AND get_current_user_role() IN ('owner', 'admin')
  );

-- WhatsApp media: org members only
CREATE POLICY "whatsapp_media_org_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'whatsapp-media'
    AND auth.uid() IN (
      SELECT id FROM users
      WHERE org_id::TEXT = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "whatsapp_media_org_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND auth.uid() IN (
      SELECT id FROM users
      WHERE org_id::TEXT = (storage.foldername(name))[1]
    )
  );

-- Service role can manage all media
CREATE POLICY "whatsapp_media_service_role" ON storage.objects
  FOR ALL USING (
    bucket_id = 'whatsapp-media'
    AND auth.role() = 'service_role'
  );

-- Knowledge docs: org members read, owner/admin write
CREATE POLICY "knowledge_docs_org_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'knowledge-docs'
    AND auth.uid() IN (
      SELECT id FROM users
      WHERE org_id::TEXT = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "knowledge_docs_org_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'knowledge-docs'
    AND get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "knowledge_docs_service_role" ON storage.objects
  FOR ALL USING (
    bucket_id = 'knowledge-docs'
    AND auth.role() = 'service_role'
  );
