-- Manris. Jalankan seluruh file dalam satu koneksi sebagai pemilik tabel.
-- Jeda aktivitas tulis aplikasi. Skrip mengambil lock pada tabel terkait.
-- Tinjau hasil dry run. Ganti ROLLBACK terakhir menjadi COMMIT untuk menyimpan.
-- Master organisasi tujuan dan isi snapshot historis dipertahankan.
-- API key sumber ikut berpindah dan akan berlaku untuk organisasi tujuan.
-- Jika kedua organisasi punya API key, transaksi batal karena benturan PK.

BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path = public, pg_temp;
SET LOCAL row_security = off;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';
SET CONSTRAINTS ALL IMMEDIATE;

LOCK TABLE public.organizations IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE _org_merge_refs (
    relation regclass NOT NULL,
    column_name name NOT NULL,
    PRIMARY KEY (relation, column_name)
) ON COMMIT DROP;

DO $$
DECLARE
    org_id_column smallint;
BEGIN
    SELECT attnum INTO STRICT org_id_column FROM pg_attribute
    WHERE attrelid = 'public.organizations'::regclass AND attname = 'id';

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE contype = 'f' AND confrelid = 'public.organizations'::regclass
          AND (confkey <> ARRAY[org_id_column] OR cardinality(conkey) <> 1)
    ) THEN
        RAISE EXCEPTION 'Ada FK ke organizations selain FK satu kolom ke id. Tinjau skema.';
    END IF;
END $$;

INSERT INTO pg_temp._org_merge_refs (relation, column_name)
SELECT k.conrelid, a.attname
FROM pg_constraint k
JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
WHERE k.contype = 'f' AND k.confrelid = 'public.organizations'::regclass
  AND k.conparentid = 0
ON CONFLICT DO NOTHING;

-- Migrasi 000066 dapat memakai tabel insiden lama yang sudah ada.
INSERT INTO pg_temp._org_merge_refs (relation, column_name)
SELECT attrelid, attname
FROM pg_attribute
WHERE attrelid = 'public.incidents'::regclass AND attname = 'organization_id'
  AND NOT attisdropped AND atttypid = 'uuid'::regtype
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE _org_merge_result (
    relation text NOT NULL,
    rows_moved bigint NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
    source_id constant uuid := 'f2d69edf-708c-41dd-bb3b-138c59c48862';
    target_id constant uuid := '38b8cf16-ca3c-49cc-80cd-8866b3ab8b01';
    item record;
    guard record;
    restore_guards text[];
    restore_sql text;
    has_source boolean;
    moved bigint;
    conflicting_years text;
BEGIN
    IF source_id = target_id OR (
        SELECT count(*) FROM public.organizations WHERE id IN (source_id, target_id)
    ) <> 2 THEN
        RAISE EXCEPTION 'Sumber dan tujuan harus berbeda dan keduanya harus ada.';
    END IF;

    FOR item IN SELECT DISTINCT relation FROM pg_temp._org_merge_refs ORDER BY relation LOOP
        IF item.relation <> 'public.organizations'::regclass THEN
            EXECUTE format('LOCK TABLE %s IN SHARE ROW EXCLUSIVE MODE', item.relation);
        END IF;
    END LOOP;

    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id FROM public.organizations WHERE id = target_id
            UNION
            SELECT o.id, o.parent_id FROM public.organizations o
            JOIN ancestors a ON o.id = a.parent_id
        )
        SELECT 1 FROM ancestors WHERE id = source_id
    ) THEN
        RAISE EXCEPTION 'Organisasi tujuan berada di bawah sumber. Tentukan parent tujuan terlebih dahulu.';
    END IF;

    -- Satu rantai profil per organisasi dan tahun, termasuk profil final.
    SELECT string_agg(DISTINCT src.year::text, ', ' ORDER BY src.year::text)
    INTO conflicting_years
    FROM public.annual_risk_profile_versions src
    JOIN public.annual_risk_profile_versions dst ON dst.year = src.year
    WHERE src.organization_id = source_id AND dst.organization_id = target_id;
    IF conflicting_years IS NOT NULL THEN
        RAISE EXCEPTION 'Kedua organisasi memiliki profil tahunan untuk tahun %. Tinjau rantai versinya.', conflicting_years;
    END IF;

    -- Keanggotaan identik dalam grup yang sama cukup disimpan satu kali.
    DELETE FROM public.organization_group_members src
    USING public.organization_group_members dst
    WHERE src.organization_id = source_id AND dst.organization_id = target_id
      AND src.group_id = dst.group_id;
    GET DIAGNOSTICS moved = ROW_COUNT;
    INSERT INTO pg_temp._org_merge_result VALUES ('organization_group_members (keanggotaan duplikat dihapus)', moved);

    FOR item IN
        SELECT relation,
               string_agg(format('%1$I = CASE WHEN %1$I = $1 THEN $2 ELSE %1$I END', column_name),
                          ', ' ORDER BY column_name) AS assignments,
               string_agg(format('%I = $1', column_name), ' OR ' ORDER BY column_name) AS predicate
        FROM pg_temp._org_merge_refs
        GROUP BY relation
        ORDER BY CASE relation WHEN 'public.annual_risk_profile_versions'::regclass THEN 0 ELSE 1 END,
                 relation
    LOOP
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %s)', item.relation, item.predicate)
        INTO has_source USING source_id;
        CONTINUE WHEN NOT has_source;

        -- Pindahkan kepemilikan profil dan dokumen final. FK dan indeks unik tetap aktif.
        restore_guards := ARRAY[]::text[];
        FOR guard IN
            SELECT tgname, tgenabled FROM pg_trigger
            WHERE tgrelid = item.relation AND NOT tgisinternal AND tgenabled IN ('O', 'A')
              AND (tgrelid, tgname::text) IN (
                  ('public.annual_risk_profile_versions'::regclass, 'profile_monitoring_rule_guard'),
                  ('public.working_papers'::regclass, 'working_paper_period_guard'),
                  ('public.working_papers'::regclass, 'wp_observation_guard'),
                  ('public.evaluations'::regclass, 'evaluation_period_guard'),
                  ('public.evaluations'::regclass, 'evaluation_completion_guard')
              )
            ORDER BY tgname
        LOOP
            restore_guards := array_append(restore_guards, format(
                'ALTER TABLE %s ENABLE %sTRIGGER %I', item.relation,
                CASE guard.tgenabled WHEN 'A' THEN 'ALWAYS ' ELSE '' END, guard.tgname
            ));
            EXECUTE format('ALTER TABLE %s DISABLE TRIGGER %I', item.relation, guard.tgname);
        END LOOP;

        BEGIN
            EXECUTE format('UPDATE %s SET %s WHERE %s', item.relation, item.assignments, item.predicate)
            USING source_id, target_id;
            GET DIAGNOSTICS moved = ROW_COUNT;
        EXCEPTION WHEN unique_violation OR exclusion_violation THEN
            RAISE NOTICE 'Benturan saat memindahkan tabel %. Tinjau kunci yang dilaporkan PostgreSQL.', item.relation;
            RAISE;
        END;

        FOREACH restore_sql IN ARRAY restore_guards LOOP
            EXECUTE restore_sql;
        END LOOP;
        INSERT INTO pg_temp._org_merge_result VALUES (item.relation::text, moved);
    END LOOP;

    -- Pastikan DELETE master tidak memicu CASCADE atau SET NULL pada data yang tertinggal.
    FOR item IN SELECT relation, column_name FROM pg_temp._org_merge_refs LOOP
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)', item.relation, item.column_name)
        INTO has_source USING source_id;
        IF has_source THEN
            RAISE EXCEPTION 'Referensi sumber masih ditemukan di %.%.', item.relation, item.column_name;
        END IF;
    END LOOP;

    DELETE FROM public.organizations WHERE id = source_id;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = target_id) THEN
        RAISE EXCEPTION 'Verifikasi master organisasi gagal.';
    END IF;
END $$;

SELECT relation AS tabel, rows_moved AS jumlah_baris
FROM pg_temp._org_merge_result
WHERE rows_moved > 0
ORDER BY relation;

ROLLBACK;
