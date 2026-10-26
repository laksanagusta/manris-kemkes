DROP TABLE agent_runs;
DROP TABLE agent_conversations;
DELETE FROM system_settings WHERE key='ai.model.agent' AND value='';
