-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON system_settings;

-- Drop function
DROP FUNCTION IF EXISTS update_system_settings_updated_at();

-- Drop index
DROP INDEX IF EXISTS idx_system_settings_category;

-- Drop table
DROP TABLE IF EXISTS system_settings;