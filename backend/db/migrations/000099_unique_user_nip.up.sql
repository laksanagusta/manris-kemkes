DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE btrim(nip, E' \t\n\r\f\013') <> ''
        GROUP BY btrim(nip, E' \t\n\r\f\013')
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Resolve duplicate non-empty user NIPs before applying this migration';
    END IF;
END $$;

CREATE UNIQUE INDEX users_nip_unique
    ON users (btrim(nip, E' \t\n\r\f\013'))
    WHERE btrim(nip, E' \t\n\r\f\013') <> '';
