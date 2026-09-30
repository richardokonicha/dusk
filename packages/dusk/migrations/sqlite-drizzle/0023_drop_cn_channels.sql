-- Drop the China-market channel integrations (Feishu, QQ, WeChat) and their
-- dependents. `agent_channel.type` is TEXT with no CHECK constraint (see
-- schemas/agentChannel.ts), so rows configured for these adapters survive a type
-- removal and would fail the ChannelConfig discriminated union at the DataApi
-- boundary, taking the whole channel list read with them. Delete them here
-- instead. Related rows go with them via ON DELETE CASCADE.
DELETE FROM `agent_channel` WHERE `type` IN ('feishu', 'qq', 'wechat');
