-- =============================================================================
-- MIGRÁCIA: Aditívne pridanie stĺpca `password_version` do `public.booking_users`
-- Architektúra: Dual-format SHA-256 / scrypt-v1 + Compare-And-Set (CAS)
--
-- DÔLEŽITÉ PRAVIDLÁ:
-- - Táto migrácia je čisto aditívna (nemení `password_hash`, RLS, grants ani vlastníka).
-- - Všetky kontrolné a diagnostické dopyty vracajú výhradne agregované počty (COUNT),
--   nikdy nevracajú riadky s e-mailami, menami ani hodnotami `password_hash`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. READ-ONLY PRE-CHECK SQL (Spustiť samostatne pred migráciou)
-- -----------------------------------------------------------------------------
/*
-- 1A. Overenie existencie tabuľky, stĺpca, RLS stavu a aktívnych zámkov:
SELECT
    EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'booking_users'
    ) AS table_exists,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'booking_users' AND column_name = 'password_version'
    ) AS column_already_exists,
    (
        SELECT c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'booking_users'
    ) AS rls_enabled,
    (
        SELECT COUNT(*)
        FROM pg_locks l
        JOIN pg_class c ON c.oid = l.relation
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'booking_users'
    ) AS active_locks_count;

-- 1B. Read-only inventár formátov `password_hash` (výhradne agregované počty, bez citlivých dát):
SELECT
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE password_hash IS NULL OR password_hash = '') AS null_or_empty_count,
    COUNT(*) FILTER (WHERE password_hash ~ '^UNVERIFIED:') AS unverified_prefixed_count,
    COUNT(*) FILTER (WHERE password_hash ~ '^UNVERIFIED:UNVERIFIED:') AS double_unverified_count,
    COUNT(*) FILTER (
        WHERE regexp_replace(password_hash, '^UNVERIFIED:', '') ~ '^[0-9a-f]{64}$'
    ) AS legacy_sha256_lowercase_count,
    COUNT(*) FILTER (
        WHERE regexp_replace(password_hash, '^UNVERIFIED:', '') ~ '^[0-9A-F]{64}$'
          AND regexp_replace(password_hash, '^UNVERIFIED:', '') !~ '^[0-9a-f]{64}$'
    ) AS legacy_sha256_uppercase_or_mixed_count,
    COUNT(*) FILTER (
        WHERE regexp_replace(password_hash, '^UNVERIFIED:', '') ~ '^scrypt-v1\$ln=15\$r=8\$p=3\$salt=[0-9a-f]{32}\$dk=[0-9a-f]{64}$'
    ) AS scrypt_v1_valid_count,
    COUNT(*) FILTER (
        WHERE password_hash ~ '^deleted_'
    ) AS soft_deleted_sentinel_count,
    COUNT(*) FILTER (
        WHERE password_hash IS NOT NULL
          AND password_hash <> ''
          AND password_hash !~ '^deleted_'
          AND password_hash !~ '^UNVERIFIED:UNVERIFIED:'
          AND regexp_replace(password_hash, '^UNVERIFIED:', '') !~ '^[0-9a-fA-F]{64}$'
          AND regexp_replace(password_hash, '^UNVERIFIED:', '') !~ '^scrypt-v1\$ln=15\$r=8\$p=3\$salt=[0-9a-f]{32}\$dk=[0-9a-f]{64}$'
    ) AS unknown_or_malformed_count
FROM public.booking_users;
*/

-- -----------------------------------------------------------------------------
-- 2. TRANSAKČNÁ ADITÍVNA MIGRÁCIA
-- -----------------------------------------------------------------------------
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
DECLARE
    v_col_exists boolean;
    v_data_type text;
    v_is_nullable text;
    v_col_default text;
    v_identity_gen text;
    v_is_generated text;
    v_invalid_rows bigint;
    v_con_exists boolean;
    v_con_validated boolean;
    v_con_def text;
    v_norm_def text;
BEGIN
    -- 1. Overenie existencie tabuľky public.booking_users
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'booking_users'
    ) THEN
        RAISE EXCEPTION 'MIGRATION_PRECONDITION_FAILED: Tabuľka public.booking_users neexistuje.';
    END IF;

    -- 2. Kontrola stĺpca password_version
    SELECT
        TRUE,
        c.data_type,
        c.is_nullable,
        c.column_default,
        COALESCE(c.identity_generation, 'NEVER'),
        COALESCE(c.is_generated, 'NEVER')
    INTO
        v_col_exists,
        v_data_type,
        v_is_nullable,
        v_col_default,
        v_identity_gen,
        v_is_generated
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'booking_users'
      AND c.column_name = 'password_version';

    IF NOT COALESCE(v_col_exists, FALSE) THEN
        -- Fast metadata-only ADD COLUMN v PostgreSQL 11+ (žiadny table rewrite, žiadna zmena password_hash)
        ALTER TABLE public.booking_users
            ADD COLUMN password_version INTEGER NOT NULL DEFAULT 1;
    ELSE
        -- Ak stĺpec už existuje, musí spĺňať presnú definíciu (fail-closed)
        IF v_data_type <> 'integer' THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: password_version má neočakávaný data_type: % (očakávaný: integer)', v_data_type;
        END IF;

        IF v_is_nullable <> 'NO' THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: password_version musí byť NOT NULL (aktuálne is_nullable = %)', v_is_nullable;
        END IF;

        IF v_identity_gen <> 'NEVER' OR v_is_generated <> 'NEVER' THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: password_version nesmie byť identity ani generated column (identity=%, generated=%)', v_identity_gen, v_is_generated;
        END IF;

        IF v_col_default IS NULL OR regexp_replace(v_col_default, '\s+', '', 'g') NOT IN ('1', '1::integer', '(1)', '(1)::integer') THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: password_version má neočakávaný DEFAULT: % (očakávaný: 1)', COALESCE(v_col_default, 'NULL');
        END IF;
    END IF;

    -- 3. Overenie, že žiadny riadok nemá NULL alebo hodnotu mimo povoleného rozsahu 1..2147483640
    SELECT COUNT(*)
    INTO v_invalid_rows
    FROM public.booking_users
    WHERE password_version IS NULL
       OR password_version < 1
       OR password_version > 2147483640;

    IF v_invalid_rows > 0 THEN
        RAISE EXCEPTION 'MIGRATION_DATA_INVALID: Nájdených % riadkov s neplatnou hodnotou password_version mimo rozsahu 1..2147483640.', v_invalid_rows;
    END IF;

    -- 4. Kontrola / vytvorenie CHECK constraintu booking_users_password_version_check
    SELECT
        TRUE,
        con.convalidated,
        pg_get_constraintdef(con.oid, true)
    INTO
        v_con_exists,
        v_con_validated,
        v_con_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'booking_users'
      AND con.conname = 'booking_users_password_version_check'
      AND con.contype = 'c';

    IF NOT COALESCE(v_con_exists, FALSE) THEN
        ALTER TABLE public.booking_users
            ADD CONSTRAINT booking_users_password_version_check
            CHECK (password_version >= 1 AND password_version <= 2147483640);
    ELSE
        IF NOT COALESCE(v_con_validated, FALSE) THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: Constraint booking_users_password_version_check existuje, ale nie je validovaný (convalidated = false).';
        END IF;

        -- Normalizácia výrazu bez medzier pre spoľahlivú kontrolu dolnej a hornej hranice v PostgreSQL
        v_norm_def := lower(regexp_replace(COALESCE(v_con_def, ''), '\s+', '', 'g'));

        IF v_norm_def !~ 'password_version\)*>=\(*1($|[^0-9])'
           OR v_norm_def !~ 'password_version\)*<=\(*2147483640($|[^0-9])' THEN
            RAISE EXCEPTION 'MIGRATION_DRIFT_DETECTED: Constraint booking_users_password_version_check má neočakávanú definíciu: %', v_con_def;
        END IF;
    END IF;
END $$;

-- 5. Finálna in-transaction verifikácia výsledného stavu pred COMMITom
DO $$
DECLARE
    v_post_type text;
    v_post_nullable text;
    v_post_default text;
    v_post_con_valid boolean;
    v_post_con_def text;
    v_post_norm_def text;
BEGIN
    SELECT c.data_type, c.is_nullable, c.column_default
    INTO v_post_type, v_post_nullable, v_post_default
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'booking_users'
      AND c.column_name = 'password_version';

    IF v_post_type IS DISTINCT FROM 'integer'
       OR v_post_nullable IS DISTINCT FROM 'NO'
       OR v_post_default IS NULL
       OR regexp_replace(v_post_default, '\s+', '', 'g') NOT IN ('1', '1::integer', '(1)', '(1)::integer') THEN
        RAISE EXCEPTION 'MIGRATION_POSTCHECK_FAILED: Stĺpec password_version po migrácii nespĺňa požadovanú definíciu.';
    END IF;

    SELECT con.convalidated, pg_get_constraintdef(con.oid, true)
    INTO v_post_con_valid, v_post_con_def
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'booking_users'
      AND con.conname = 'booking_users_password_version_check'
      AND con.contype = 'c';

    v_post_norm_def := lower(regexp_replace(COALESCE(v_post_con_def, ''), '\s+', '', 'g'));

    IF NOT COALESCE(v_post_con_valid, FALSE)
       OR v_post_norm_def !~ 'password_version\)*>=\(*1($|[^0-9])'
       OR v_post_norm_def !~ 'password_version\)*<=\(*2147483640($|[^0-9])' THEN
        RAISE EXCEPTION 'MIGRATION_POSTCHECK_FAILED: Constraint booking_users_password_version_check po migrácii nespĺňa požadovanú definíciu: %', v_post_con_def;
    END IF;
END $$;

COMMIT;

-- -----------------------------------------------------------------------------
-- 3. READ-ONLY POST-CHECK SQL (Spustiť po COMMITe na potvrdenie stavu)
-- -----------------------------------------------------------------------------
/*
SELECT
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    (
        SELECT pg_get_constraintdef(con.oid, true)
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'booking_users'
          AND con.conname = 'booking_users_password_version_check'
    ) AS check_constraint_def,
    (
        SELECT COUNT(*) FROM public.booking_users WHERE password_version >= 1 AND password_version <= 2147483640
    ) AS valid_version_rows_count,
    (
        SELECT COUNT(*) FROM public.booking_users WHERE password_version IS NULL OR password_version < 1 OR password_version > 2147483640
    ) AS invalid_version_rows_count
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'booking_users'
  AND c.column_name = 'password_version';
*/

-- -----------------------------------------------------------------------------
-- 4. ROLLBACK / EMERGENCY RECOVERY POKYNY (Nevykonávať automaticky)
-- -----------------------------------------------------------------------------
/*
-- POZNÁMKA:
-- 1. Ak je potrebné vrátiť aplikačný deploy späť na staršiu verziu kódu, stĺpec
--    `password_version INTEGER NOT NULL DEFAULT 1` je plne spätne kompatibilný
--    so starým kódom (starý INSERT bez `password_version` automaticky použije DEFAULT 1).
--    Preto pri bežnom aplikačnom rollbacku NIE JE potrebné mazať stĺpec v DB.
-- 2. Existujúce hodnoty `password_hash` (legacy SHA-256 aj prípadné nové `scrypt-v1` účty)
--    sa pri migrácii nemenia. Ak však už niektorý používateľ zmenil heslo na `scrypt-v1`,
--    starý aplikačný kód pred týmto PR nevie overiť `scrypt-v1`.
-- 3. Iba v prípade, že ešte nebol nasadený nový kód a vyžaduje sa úplné odstránenie
--    stĺpca v testovacom prostredí:
--
-- BEGIN;
-- SET LOCAL lock_timeout = '5s';
-- ALTER TABLE public.booking_users DROP CONSTRAINT IF EXISTS booking_users_password_version_check;
-- ALTER TABLE public.booking_users DROP COLUMN IF EXISTS password_version;
-- COMMIT;
*/

