


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."assign_existing_controls_to_new_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  perform pg_catalog.pg_advisory_xact_lock(918273645001::bigint);

  insert into public.tenant_controls (tenant_id, control_id, status)
  select new.id, c.id, 'unsatisfied'
  from public.controls c
  on conflict (tenant_id, control_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_existing_controls_to_new_tenant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_new_control_to_all_tenants"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  perform pg_catalog.pg_advisory_xact_lock(918273645001::bigint);

  insert into public.tenant_controls (tenant_id, control_id, status)
  select t.id, new.id, 'unsatisfied'
  from public.tenants t
  on conflict (tenant_id, control_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."assign_new_control_to_all_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_msp_member_role"("target_profile_id" "uuid", "new_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor_msp_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new_role not in ('msp_admin', 'technician') then
    raise exception 'Role must be msp_admin or technician' using errcode = '22023';
  end if;

  select p.msp_id
    into actor_msp_id
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.role = 'owner';

  if actor_msp_id is null then
    raise exception 'Only an MSP owner can change member roles' using errcode = '42501';
  end if;

  if target_profile_id = (select auth.uid()) then
    raise exception 'Owners cannot change their own role' using errcode = '42501';
  end if;

  update public.profiles as p
  set role = new_role,
      updated_at = now()
  where p.id = target_profile_id
    and p.msp_id = actor_msp_id;

  if not found then
    raise exception 'Target profile is not a member of your MSP' using errcode = '42501';
  end if;
end;
$$;


ALTER FUNCTION "public"."change_msp_member_role"("target_profile_id" "uuid", "new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_profile_inviter_references_before_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.msp_invitations
  SET invited_by = NULL
  WHERE invited_by = OLD.id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."clear_profile_inviter_references_before_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_user_after_profile_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  DELETE FROM auth.users
  WHERE id = OLD.id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user_after_profile_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  DELETE FROM public.msp_invitations AS invitation
  WHERE lower(btrim(invitation.email)) = lower(btrim(NEW.email));

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_evidence_pending_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.approval_status := 'pending_approval';
  NEW.approved_by := NULL;
  NEW.approved_at := NULL;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."force_evidence_pending_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_tenant_name_and_display_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.display_name IS NULL THEN
      NEW.display_name := NEW.name;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'tenants.name is immutable after creation'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.role
    INTO v_role
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
    AND p.msp_id = OLD.msp_id;

  IF v_role = 'msp_admin'
     AND (to_jsonb(NEW) - 'display_name') IS DISTINCT FROM (to_jsonb(OLD) - 'display_name') THEN
    RAISE EXCEPTION 'MSP admins may only update tenants.display_name'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     AND (v_role IS NULL OR v_role NOT IN ('owner', 'msp_admin')) THEN
    RAISE EXCEPTION 'Only owners and MSP admins may update tenants.display_name'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_tenant_name_and_display_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_msp_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  business_name text;
  abn_number text;
  new_msp_id uuid;
  matching_invitation_count integer;
  invitation_msp_id uuid;
  invitation_role text;
BEGIN
  IF new.email IS NULL OR btrim(new.email) = '' THEN
    RAISE EXCEPTION 'An email address is required.'
      USING errcode = '23514';
  END IF;

  SELECT
    count(*),
    (array_agg(i.msp_id))[1],
    (array_agg(i.role))[1]
  INTO
    matching_invitation_count,
    invitation_msp_id,
    invitation_role
  FROM public.msp_invitations AS i
  WHERE i.status = 'pending'
    AND lower(btrim(i.email)) = lower(btrim(new.email));

  IF matching_invitation_count > 1 THEN
    RAISE EXCEPTION 'Multiple pending invitations exist for this email. Resolve the duplicates before creating the account.'
      USING errcode = '23514';
  ELSIF matching_invitation_count = 1 THEN
    INSERT INTO public.profiles (
      id,
      msp_id,
      full_name,
      email,
      role
    )
    VALUES (
      new.id,
      invitation_msp_id,
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      new.email,
      invitation_role
    );

    RETURN new;
  END IF;

  business_name := btrim(
    coalesce(new.raw_user_meta_data ->> 'msp_name', '')
  );

  abn_number := nullif(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'abn', ''),
      '[^0-9]',
      '',
      'g'
    ),
    ''
  );

  IF business_name = '' THEN
    RAISE EXCEPTION 'A business name is required.'
      USING errcode = '23514';
  END IF;

  INSERT INTO public.msps (
    msp_name,
    display_name,
    abn
  )
  VALUES (
    business_name,
    business_name,
    abn_number
  )
  RETURNING id INTO new_msp_id;

  INSERT INTO public.profiles (
    id,
    msp_id,
    full_name,
    email,
    role
  )
  VALUES (
    new.id,
    new_msp_id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email,
    'owner'
  );

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_msp_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role in ('owner', 'msp_admin')
      and profile.msp_id = target_msp_id
  );
$$;


ALTER FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'owner'
      and profile.msp_id = target_msp_id
  );
$$;


ALTER FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.msps
    where abn = regexp_replace(p_abn, '[^0-9]', '', 'g')
  );
$$;


ALTER FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_msp_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.msp_id
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1;
$$;


ALTER FUNCTION "public"."my_msp_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_tenant_control_names"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  select t.name into new.tenant_name
  from public.tenants t
  where t.id = new.tenant_id;

  select c.name into new.control_name
  from public.controls c
  where c.id = new.control_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."populate_tenant_control_names"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_evidence_history_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'Evidence and review history is append-only; create a new record instead.'
    USING ERRCODE = '55000';
END;
$$;


ALTER FUNCTION "public"."prevent_evidence_history_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_control_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'satisfied' then
      new.satisfied_by := auth.uid();
      new.satisfied_on := now();
    else
      new.satisfied_by := null;
      new.satisfied_on := null;
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_tenant_control_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_msp_name_to_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.profiles as p
  set msp_name = new.msp_name
  where p.msp_id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_msp_name_to_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_full_name_from_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.profiles as p
  set full_name = new.raw_user_meta_data ->> 'full_name'
  where p.id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_full_name_from_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_msp_name_from_msp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  select m.msp_name
    into new.msp_name
  from public.msps as m
  where m.id = new.msp_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_profile_msp_name_from_msp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenant_control_control_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  update public.tenant_controls
  set control_name = new.name
  where control_id = new.id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_tenant_control_control_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenant_control_tenant_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  update public.tenant_controls
  set tenant_name = new.name
  where tenant_id = new.id;
  return new;
end;
$$;


ALTER FUNCTION "public"."sync_tenant_control_tenant_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenant_msp_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
BEGIN
  SELECT m.msp_name
    INTO NEW.msp_name
  FROM public.msps AS m
  WHERE m.id = NEW.msp_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_tenant_msp_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_tenants_msp_name_from_msp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
BEGIN
  UPDATE public.tenants
  SET msp_name = NEW.msp_name
  WHERE msp_id = NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_tenants_msp_name_from_msp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."controls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "strategy" "text" NOT NULL,
    "name" "text" NOT NULL,
    "maturity_level" integer NOT NULL,
    "control_code" "text" NOT NULL,
    "ism_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "controls_maturity_level_check" CHECK ((("maturity_level" >= 1) AND ("maturity_level" <= 3)))
);


ALTER TABLE "public"."controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "control_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "msp_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text",
    "file_size_bytes" bigint,
    "description" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_hash" "text" NOT NULL,
    "supersedes_evidence_id" "uuid"
);


ALTER TABLE "public"."evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence_note_reads" (
    "note_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evidence_note_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evidence_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "control_id" "uuid" NOT NULL,
    "msp_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subject" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "evidence_notes_note_check" CHECK (("length"("btrim"("note")) > 0)),
    CONSTRAINT "evidence_notes_subject_check" CHECK (("char_length"("subject") <= 120))
);


ALTER TABLE "public"."evidence_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence_reads" (
    "evidence_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evidence_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evidence_id" "uuid" NOT NULL,
    "decision" "text" NOT NULL,
    "reason" "text",
    "reviewed_by" "uuid" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "evidence_reviews_decision_check" CHECK (("decision" = ANY (ARRAY['approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "evidence_reviews_rejection_reason_required" CHECK ((("decision" <> 'rejected'::"text") OR (("reason" IS NOT NULL) AND ("btrim"("reason") <> ''::"text"))))
);


ALTER TABLE "public"."evidence_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "msp_id" "uuid" NOT NULL,
    "msp_name" "text",
    "full_name" "text",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'technician'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'msp_admin'::"text", 'technician'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."evidence_with_approver" WITH ("security_invoker"='true') AS
 SELECT "e"."id",
    "e"."control_id",
    "e"."tenant_id",
    "e"."msp_id",
    "e"."file_name",
    "e"."file_path",
    "e"."file_type",
    "e"."file_size_bytes",
    "e"."description",
    "e"."uploaded_by",
    "e"."created_at",
    "e"."file_hash",
    COALESCE("latest_review"."decision", 'pending_approval'::"text") AS "approval_status",
        CASE
            WHEN ("latest_review"."decision" = 'approved'::"text") THEN "reviewer"."full_name"
            ELSE NULL::"text"
        END AS "approved_by",
        CASE
            WHEN ("latest_review"."decision" = 'approved'::"text") THEN "latest_review"."reviewed_at"
            ELSE NULL::timestamp with time zone
        END AS "approved_at"
   FROM (("public"."evidence" "e"
     LEFT JOIN LATERAL ( SELECT "r"."decision",
            "r"."reviewed_by",
            "r"."reviewed_at"
           FROM "public"."evidence_reviews" "r"
          WHERE ("r"."evidence_id" = "e"."id")
          ORDER BY "r"."reviewed_at" DESC, "r"."id" DESC
         LIMIT 1) "latest_review" ON (true))
     LEFT JOIN "public"."profiles" "reviewer" ON (("reviewer"."id" = "latest_review"."reviewed_by")));


ALTER VIEW "public"."evidence_with_approver" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."logos" (
    "msp_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "logos_file_path_check" CHECK (("length"("btrim"("file_path")) > 0))
);


ALTER TABLE "public"."logos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."msp_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "msp_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "msp_invitations_role_check" CHECK (("role" = ANY (ARRAY['msp_admin'::"text", 'technician'::"text"]))),
    CONSTRAINT "msp_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"])))
);


ALTER TABLE "public"."msp_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."msps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "msp_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "abn" "text"
);


ALTER TABLE "public"."msps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."strategies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."strategies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_controls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "tenant_name" "text" NOT NULL,
    "control_id" "uuid" NOT NULL,
    "control_name" "text" NOT NULL,
    "status" "text" DEFAULT 'unsatisfied'::"text" NOT NULL,
    "satisfied_by" "uuid",
    "satisfied_on" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_controls_rebuild_satisfaction_metadata_check" CHECK (((("status" = 'satisfied'::"text") AND ("satisfied_by" IS NOT NULL) AND ("satisfied_on" IS NOT NULL)) OR (("status" = 'unsatisfied'::"text") AND ("satisfied_by" IS NULL) AND ("satisfied_on" IS NULL)))),
    CONSTRAINT "tenant_controls_rebuild_status_check" CHECK (("status" = ANY (ARRAY['unsatisfied'::"text", 'satisfied'::"text"])))
);


ALTER TABLE "public"."tenant_controls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "msp_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "msp_name" "text",
    "abn" "text",
    "display_name" "text" NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_control_code_key" UNIQUE ("control_code");



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "controls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_id_scope_unique" UNIQUE ("id", "tenant_id", "control_id", "msp_id");



ALTER TABLE ONLY "public"."evidence_note_reads"
    ADD CONSTRAINT "evidence_note_reads_pkey" PRIMARY KEY ("note_id", "user_id");



ALTER TABLE ONLY "public"."evidence_notes"
    ADD CONSTRAINT "evidence_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence_reads"
    ADD CONSTRAINT "evidence_reads_pkey" PRIMARY KEY ("evidence_id", "user_id");



ALTER TABLE ONLY "public"."evidence_reviews"
    ADD CONSTRAINT "evidence_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."logos"
    ADD CONSTRAINT "logos_file_path_key" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."logos"
    ADD CONSTRAINT "logos_pkey" PRIMARY KEY ("msp_id");



ALTER TABLE ONLY "public"."msp_invitations"
    ADD CONSTRAINT "msp_invitations_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."msp_invitations"
    ADD CONSTRAINT "msp_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."msps"
    ADD CONSTRAINT "msps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."strategies"
    ADD CONSTRAINT "strategies_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."strategies"
    ADD CONSTRAINT "strategies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_controls"
    ADD CONSTRAINT "tenant_controls_rebuild_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_controls"
    ADD CONSTRAINT "tenant_controls_tenant_control_key" UNIQUE ("tenant_id", "control_id");



CREATE INDEX "evidence_note_reads_user_note_idx" ON "public"."evidence_note_reads" USING "btree" ("user_id", "note_id");



CREATE INDEX "evidence_notes_evidence_created_at_idx" ON "public"."evidence_notes" USING "btree" ("evidence_id", "created_at" DESC);



CREATE UNIQUE INDEX "evidence_one_successor_per_version" ON "public"."evidence" USING "btree" ("supersedes_evidence_id") WHERE ("supersedes_evidence_id" IS NOT NULL);



CREATE INDEX "evidence_reads_user_evidence_idx" ON "public"."evidence_reads" USING "btree" ("user_id", "evidence_id");



CREATE INDEX "evidence_reviews_evidence_latest_idx" ON "public"."evidence_reviews" USING "btree" ("evidence_id", "reviewed_at" DESC, "id" DESC);



CREATE INDEX "evidence_uploaded_by_idx" ON "public"."evidence" USING "btree" ("uploaded_by");



CREATE INDEX "idx_controls_strategy" ON "public"."controls" USING "btree" ("strategy");



CREATE INDEX "idx_evidence_control_id" ON "public"."evidence" USING "btree" ("control_id");



CREATE INDEX "idx_evidence_org_id" ON "public"."evidence" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "msp_invitations_email_normalized_uidx" ON "public"."msp_invitations" USING "btree" ("lower"("btrim"("email")));



CREATE UNIQUE INDEX "msps_abn_unique" ON "public"."msps" USING "btree" ("abn") WHERE ("abn" IS NOT NULL);



CREATE INDEX "tenant_controls_control_id_idx" ON "public"."tenant_controls" USING "btree" ("control_id");



CREATE UNIQUE INDEX "tenants_msp_id_name_key" ON "public"."tenants" USING "btree" ("msp_id", "name");



CREATE OR REPLACE TRIGGER "clear_profile_inviter_references_before_delete" BEFORE DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."clear_profile_inviter_references_before_delete"();



CREATE OR REPLACE TRIGGER "controls_assign_to_all_tenants" AFTER INSERT ON "public"."controls" FOR EACH ROW EXECUTE FUNCTION "public"."assign_new_control_to_all_tenants"();



CREATE OR REPLACE TRIGGER "controls_sync_tenant_control_names" AFTER UPDATE OF "name" ON "public"."controls" FOR EACH ROW WHEN (("old"."name" IS DISTINCT FROM "new"."name")) EXECUTE FUNCTION "public"."sync_tenant_control_control_name"();



CREATE OR REPLACE TRIGGER "delete_auth_user_after_profile_delete" AFTER DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."delete_auth_user_after_profile_delete"();



CREATE OR REPLACE TRIGGER "evidence_append_only" BEFORE DELETE OR UPDATE ON "public"."evidence" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_evidence_history_mutation"();



CREATE OR REPLACE TRIGGER "evidence_reviews_append_only" BEFORE DELETE OR UPDATE ON "public"."evidence_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_evidence_history_mutation"();



CREATE OR REPLACE TRIGGER "guard_tenant_name_and_display_name" BEFORE INSERT OR UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."guard_tenant_name_and_display_name"();



CREATE OR REPLACE TRIGGER "msps_sync_tenant_names" AFTER UPDATE OF "msp_name" ON "public"."msps" FOR EACH ROW WHEN (("old"."msp_name" IS DISTINCT FROM "new"."msp_name")) EXECUTE FUNCTION "public"."sync_tenants_msp_name_from_msp"();



CREATE OR REPLACE TRIGGER "tenant_controls_populate_names" BEFORE INSERT OR UPDATE ON "public"."tenant_controls" FOR EACH ROW EXECUTE FUNCTION "public"."populate_tenant_control_names"();



CREATE OR REPLACE TRIGGER "tenant_controls_set_metadata" BEFORE UPDATE ON "public"."tenant_controls" FOR EACH ROW EXECUTE FUNCTION "public"."set_tenant_control_metadata"();



CREATE OR REPLACE TRIGGER "tenants_assign_existing_controls" AFTER INSERT ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."assign_existing_controls_to_new_tenant"();



CREATE OR REPLACE TRIGGER "tenants_sync_msp_name" BEFORE INSERT OR UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."sync_tenant_msp_name"();



CREATE OR REPLACE TRIGGER "tenants_sync_tenant_control_names" AFTER UPDATE OF "name" ON "public"."tenants" FOR EACH ROW WHEN (("old"."name" IS DISTINCT FROM "new"."name")) EXECUTE FUNCTION "public"."sync_tenant_control_tenant_name"();



CREATE OR REPLACE TRIGGER "trg_msps_sync_msp_name_to_profiles" AFTER UPDATE OF "msp_name" ON "public"."msps" FOR EACH ROW WHEN (("old"."msp_name" IS DISTINCT FROM "new"."msp_name")) EXECUTE FUNCTION "public"."sync_msp_name_to_profiles"();



CREATE OR REPLACE TRIGGER "trg_profiles_delete_matching_msp_invitation_after_insert" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"();



CREATE OR REPLACE TRIGGER "trg_profiles_sync_msp_name" BEFORE INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_profile_msp_name_from_msp"();



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_msp_id_fkey" FOREIGN KEY ("msp_id") REFERENCES "public"."msps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_note_reads"
    ADD CONSTRAINT "evidence_note_reads_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "public"."evidence_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_note_reads"
    ADD CONSTRAINT "evidence_note_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_notes"
    ADD CONSTRAINT "evidence_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence_notes"
    ADD CONSTRAINT "evidence_notes_evidence_scope_fkey" FOREIGN KEY ("evidence_id", "tenant_id", "control_id", "msp_id") REFERENCES "public"."evidence"("id", "tenant_id", "control_id", "msp_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_reads"
    ADD CONSTRAINT "evidence_reads_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_reads"
    ADD CONSTRAINT "evidence_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence_reviews"
    ADD CONSTRAINT "evidence_reviews_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence_reviews"
    ADD CONSTRAINT "evidence_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_supersedes_scope_fkey" FOREIGN KEY ("supersedes_evidence_id", "tenant_id", "control_id", "msp_id") REFERENCES "public"."evidence"("id", "tenant_id", "control_id", "msp_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."controls"
    ADD CONSTRAINT "fk_controls_strategy" FOREIGN KEY ("strategy") REFERENCES "public"."strategies"("name") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "fk_evidence_control" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."logos"
    ADD CONSTRAINT "logos_msp_id_fkey" FOREIGN KEY ("msp_id") REFERENCES "public"."msps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."msp_invitations"
    ADD CONSTRAINT "msp_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."msp_invitations"
    ADD CONSTRAINT "msp_invitations_msp_id_fkey" FOREIGN KEY ("msp_id") REFERENCES "public"."msps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "organizations_msp_id_fkey" FOREIGN KEY ("msp_id") REFERENCES "public"."msps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_msp_id_fkey" FOREIGN KEY ("msp_id") REFERENCES "public"."msps"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_controls"
    ADD CONSTRAINT "tenant_controls_rebuild_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id");



ALTER TABLE ONLY "public"."tenant_controls"
    ADD CONSTRAINT "tenant_controls_rebuild_satisfied_by_fkey" FOREIGN KEY ("satisfied_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tenant_controls"
    ADD CONSTRAINT "tenant_controls_rebuild_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can read controls" ON "public"."controls" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "MSP admins and owners can update tenant control statuses" ON "public"."tenant_controls" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."tenants" "t"
     JOIN "public"."profiles" "p" ON (("p"."msp_id" = "t"."msp_id")))
  WHERE (("t"."id" = "tenant_controls"."tenant_id") AND ("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['owner'::"text", 'msp_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."tenants" "t"
     JOIN "public"."profiles" "p" ON (("p"."msp_id" = "t"."msp_id")))
  WHERE (("t"."id" = "tenant_controls"."tenant_id") AND ("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = ANY (ARRAY['owner'::"text", 'msp_admin'::"text"]))))));



CREATE POLICY "MSP admins can add their tenants" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'msp_admin'::"text") AND ("p"."msp_id" = "tenants"."msp_id")))));



CREATE POLICY "MSP admins can update their tenant display names" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id") AND ("p"."role" = 'msp_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id") AND ("p"."role" = 'msp_admin'::"text")))));



CREATE POLICY "MSP members can insert their evidence" ON "public"."evidence" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")) AND (EXISTS ( SELECT 1
   FROM "public"."tenants" "tenant"
  WHERE (("tenant"."id" = "evidence"."tenant_id") AND ("tenant"."msp_id" = "evidence"."msp_id"))))));



CREATE POLICY "MSP members can mark their evidence as read" ON "public"."evidence_reads" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence" "evidence"
  WHERE (("evidence"."id" = "evidence_reads"."evidence_id") AND ("evidence"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))))));



CREATE POLICY "MSP members can mark their evidence notes as read" ON "public"."evidence_note_reads" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence_notes" "note"
  WHERE (("note"."id" = "evidence_note_reads"."note_id") AND ("note"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))))));



CREATE POLICY "MSP members can read MSP logos" ON "public"."logos" FOR SELECT TO "authenticated" USING (("msp_id" = "public"."my_msp_id"()));



CREATE POLICY "MSP members can read evidence notes" ON "public"."evidence_notes" FOR SELECT TO "authenticated" USING (("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")));



CREATE POLICY "MSP members can read their own evidence note reads" ON "public"."evidence_note_reads" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence_notes" "note"
  WHERE (("note"."id" = "evidence_note_reads"."note_id") AND ("note"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))))));



CREATE POLICY "MSP members can read their own evidence reads" ON "public"."evidence_reads" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence" "evidence"
  WHERE (("evidence"."id" = "evidence_reads"."evidence_id") AND ("evidence"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))))));



CREATE POLICY "MSP members can update their own evidence reads" ON "public"."evidence_reads" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence" "evidence"
  WHERE (("evidence"."id" = "evidence_reads"."evidence_id") AND ("evidence"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id"))))))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."evidence" "evidence"
  WHERE (("evidence"."id" = "evidence_reads"."evidence_id") AND ("evidence"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))))));



CREATE POLICY "MSP members can view evidence reviews" ON "public"."evidence_reviews" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."evidence" "e"
  WHERE (("e"."id" = "evidence_reviews"."evidence_id") AND ("e"."msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id"))))));



CREATE POLICY "MSP members can view tenant control statuses" ON "public"."tenant_controls" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."tenants" "t"
  WHERE (("t"."id" = "tenant_controls"."tenant_id") AND ("t"."msp_id" = "public"."my_msp_id"())))));



CREATE POLICY "MSP members can view their evidence" ON "public"."evidence" FOR SELECT TO "authenticated" USING ((("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")) AND (EXISTS ( SELECT 1
   FROM "public"."tenants" "t"
  WHERE (("t"."id" = "evidence"."tenant_id") AND ("t"."msp_id" = "evidence"."msp_id"))))));



CREATE POLICY "MSP owners and admins can add evidence notes" ON "public"."evidence_notes" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "profile"
  WHERE (("profile"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profile"."msp_id" = "evidence_notes"."msp_id") AND ("profile"."role" = ANY (ARRAY['owner'::"text", 'msp_admin'::"text"])))))));



CREATE POLICY "MSP owners and admins can read profiles in their MSP" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_msp_member"("msp_id"));



CREATE POLICY "MSP owners and admins can record evidence reviews" ON "public"."evidence_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("reviewed_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."evidence" "e"
     JOIN "public"."profiles" "p" ON (("p"."id" = ( SELECT "auth"."uid"() AS "uid"))))
  WHERE (("e"."id" = "evidence_reviews"."evidence_id") AND ("e"."msp_id" = "p"."msp_id") AND ("p"."role" = ANY (ARRAY['owner'::"text", 'msp_admin'::"text"])))))));



CREATE POLICY "MSP owners can add MSP logos" ON "public"."logos" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_msp_owner"("msp_id"));



CREATE POLICY "MSP owners can add their tenants" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'owner'::"text") AND ("p"."msp_id" = "tenants"."msp_id")))));



CREATE POLICY "MSP owners can create invitations" ON "public"."msp_invitations" FOR INSERT TO "authenticated" WITH CHECK ((("invited_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."role" = 'owner'::"text") AND ("p"."msp_id" = "msp_invitations"."msp_id"))))));



CREATE POLICY "MSP owners can delete MSP logos" ON "public"."logos" FOR DELETE TO "authenticated" USING ("public"."is_msp_owner"("msp_id"));



CREATE POLICY "MSP owners can delete other profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((("id" <> ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_msp_owner"("msp_id")));



CREATE POLICY "MSP owners can delete their tenants" ON "public"."tenants" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id") AND ("p"."role" = 'owner'::"text")))));



CREATE POLICY "MSP owners can update MSP logos" ON "public"."logos" FOR UPDATE TO "authenticated" USING ("public"."is_msp_owner"("msp_id")) WITH CHECK ("public"."is_msp_owner"("msp_id"));



CREATE POLICY "MSP owners can update profiles in their MSP" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_msp_owner"("msp_id")) WITH CHECK ("public"."is_msp_owner"("msp_id"));



CREATE POLICY "MSP owners can update their tenants" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id") AND ("p"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id") AND ("p"."role" = 'owner'::"text")))));



CREATE POLICY "Users can edit their profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id")))) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("msp_id" = ( SELECT "public"."my_msp_id"() AS "my_msp_id"))));



CREATE POLICY "Users can read profiles in their MSP" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("msp_id" = "public"."my_msp_id"()));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users of the same msp can view tenants" ON "public"."tenants" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."msp_id" = "tenants"."msp_id"))))));



CREATE POLICY "authenticated can view strategies" ON "public"."strategies" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence_note_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evidence_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."logos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members can view their MSP" ON "public"."msps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."msp_id" = "msps"."id")))));



ALTER TABLE "public"."msp_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."msps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners can update their MSP display name" ON "public"."msps" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."msp_id" = "msps"."id") AND ("profiles"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("profiles"."msp_id" = "msps"."id") AND ("profiles"."role" = 'owner'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."strategies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_controls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_existing_controls_to_new_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_existing_controls_to_new_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_new_control_to_all_tenants"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_new_control_to_all_tenants"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."change_msp_member_role"("target_profile_id" "uuid", "new_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_msp_member_role"("target_profile_id" "uuid", "new_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."change_msp_member_role"("target_profile_id" "uuid", "new_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."clear_profile_inviter_references_before_delete"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."delete_auth_user_after_profile_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user_after_profile_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user_after_profile_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_matching_msp_invitation_after_profile_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_evidence_pending_on_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."force_evidence_pending_on_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_evidence_pending_on_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_tenant_name_and_display_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_tenant_name_and_display_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_tenant_name_and_display_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_msp_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_msp_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_msp_signup"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_msp_member"("target_msp_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_msp_owner"("target_msp_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."msp_exists_for_abn"("p_abn" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_msp_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_msp_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_msp_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_msp_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_tenant_control_names"() TO "anon";
GRANT ALL ON FUNCTION "public"."populate_tenant_control_names"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_tenant_control_names"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_evidence_history_mutation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_evidence_history_mutation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_control_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_control_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_control_metadata"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_msp_name_to_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_msp_name_to_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_profile_full_name_from_auth_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_profile_full_name_from_auth_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_profile_msp_name_from_msp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_profile_msp_name_from_msp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_tenant_control_control_name"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_tenant_control_control_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenant_control_control_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenant_control_control_name"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_tenant_control_tenant_name"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_tenant_control_tenant_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenant_control_tenant_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenant_control_tenant_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_tenant_msp_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenant_msp_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenant_msp_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_tenants_msp_name_from_msp"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_tenants_msp_name_from_msp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_tenants_msp_name_from_msp"() TO "service_role";



GRANT ALL ON TABLE "public"."controls" TO "anon";
GRANT ALL ON TABLE "public"."controls" TO "authenticated";
GRANT ALL ON TABLE "public"."controls" TO "service_role";



GRANT ALL ON TABLE "public"."evidence" TO "anon";
GRANT ALL ON TABLE "public"."evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence" TO "service_role";



GRANT ALL ON TABLE "public"."evidence_note_reads" TO "anon";
GRANT ALL ON TABLE "public"."evidence_note_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_note_reads" TO "service_role";



GRANT ALL ON TABLE "public"."evidence_notes" TO "anon";
GRANT ALL ON TABLE "public"."evidence_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_notes" TO "service_role";



GRANT ALL ON TABLE "public"."evidence_reads" TO "anon";
GRANT ALL ON TABLE "public"."evidence_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_reads" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evidence_reviews" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."evidence_reviews" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT UPDATE("full_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."evidence_with_approver" TO "anon";
GRANT ALL ON TABLE "public"."evidence_with_approver" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_with_approver" TO "service_role";



GRANT ALL ON TABLE "public"."logos" TO "anon";
GRANT ALL ON TABLE "public"."logos" TO "authenticated";
GRANT ALL ON TABLE "public"."logos" TO "service_role";



GRANT ALL ON TABLE "public"."msp_invitations" TO "anon";
GRANT ALL ON TABLE "public"."msp_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."msp_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."msps" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."msps" TO "authenticated";
GRANT ALL ON TABLE "public"."msps" TO "service_role";



GRANT UPDATE("display_name") ON TABLE "public"."msps" TO "authenticated";



GRANT ALL ON TABLE "public"."strategies" TO "anon";
GRANT ALL ON TABLE "public"."strategies" TO "authenticated";
GRANT ALL ON TABLE "public"."strategies" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_controls" TO "anon";
GRANT ALL ON TABLE "public"."tenant_controls" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_controls" TO "service_role";



GRANT UPDATE("status") ON TABLE "public"."tenant_controls" TO "authenticated";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";





CREATE TRIGGER "on_auth_user_created_msp_owner"
AFTER INSERT ON "auth"."users"
FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_msp_signup"();

CREATE TRIGGER "on_auth_user_full_name_updated"
AFTER UPDATE OF "raw_user_meta_data" ON "auth"."users"
FOR EACH ROW
WHEN ((new.raw_user_meta_data ->> 'full_name'::text) IS DISTINCT FROM (old.raw_user_meta_data ->> 'full_name'::text))
EXECUTE FUNCTION "public"."sync_profile_full_name_from_auth_user"();







