ALTER TABLE messages ADD COLUMN stream_id TEXT;--> statement-breakpoint
ALTER TABLE messages ADD COLUMN checkpoint TEXT;--> statement-breakpoint
ALTER TABLE messages ADD COLUMN is_complete INTEGER DEFAULT 0;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_messages_stream_id ON messages(stream_id);
