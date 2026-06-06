-- Migration 010: Enable Realtime for Chat Tables
-- This ensures that Supabase broadcasts INSERT, UPDATE, and DELETE events to the clients.

-- The supabase_realtime publication is created by Supabase by default.
-- We add our tables to it to enable real-time subscriptions in the web app.

DO $$
BEGIN
  -- Try to add conversations to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;

  -- Try to add messages to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  -- Try to add team_members to realtime (optional, but good for live presence)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'team_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
  END IF;
END $$;
