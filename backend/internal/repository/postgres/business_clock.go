package postgres

// Only business queries use this connection setting. PostgreSQL's clock still
// supplies timestamps for audit entries and database defaults.
const simulatedInstantSQL = `NULLIF(current_setting('manris.simulated_now', true), '')::timestamptz`
const businessNowSQL = `COALESCE(` + simulatedInstantSQL + `, CURRENT_TIMESTAMP)`
const businessDateSQL = `COALESCE((` + simulatedInstantSQL + ` AT TIME ZONE 'Asia/Jakarta')::date, CURRENT_DATE)`
