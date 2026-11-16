ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'msp_admin'::text, 'technician'::text, 'external_viewer'::text]));

CREATE TABLE public.external_viewer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  msp_id uuid NOT NULL REFERENCES public.msps(id) ON DELETE CASCADE,
  recipient_email text NOT NULL CHECK (recipient_email = lower(btrim(recipient_email))),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT external_viewer_links_expiry_range
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '31 days')
);

CREATE OR REPLACE FUNCTION public.can_manage_external_links(target_msp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.msp_id = target_msp_id
      AND profile.role IN ('owner', 'msp_admin', 'technician')
      AND profile.deactivated_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_external_links(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_external_links(uuid) TO authenticated;

CREATE INDEX external_viewer_links_tenant_created_idx
  ON public.external_viewer_links (tenant_id, created_at DESC);

CREATE INDEX external_viewer_links_email_tenant_idx
  ON public.external_viewer_links (lower(recipient_email), tenant_id, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.external_viewer_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.external_viewer_links FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.external_viewer_links TO authenticated;
GRANT UPDATE (revoked_at) ON public.external_viewer_links TO authenticated;

CREATE POLICY "MSP members can read external viewer links"
ON public.external_viewer_links
FOR SELECT TO authenticated
USING (public.can_manage_external_links(msp_id));

CREATE POLICY "MSP members can create external viewer links"
ON public.external_viewer_links
FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND public.can_manage_external_links(msp_id)
  AND EXISTS (
    SELECT 1
    FROM public.tenants tenant
    WHERE tenant.id = external_viewer_links.tenant_id
      AND tenant.msp_id = external_viewer_links.msp_id
  )
);

CREATE POLICY "MSP members can revoke external viewer links"
ON public.external_viewer_links
FOR UPDATE TO authenticated
USING (public.can_manage_external_links(msp_id) AND revoked_at IS NULL)
WITH CHECK (public.can_manage_external_links(msp_id) AND revoked_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public.can_view_external_tenant(target_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.external_viewer_links link
    WHERE link.tenant_id = target_tenant_id
      AND lower(link.recipient_email) = lower((SELECT auth.jwt() ->> 'email'))
      AND link.revoked_at IS NULL
      AND link.expires_at > statement_timestamp()
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_external_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_external_tenant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_msp_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT profile.msp_id
  FROM public.profiles AS profile
  WHERE profile.id = (SELECT auth.uid())
    AND profile.deactivated_at IS NULL
    AND profile.role <> 'external_viewer'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_msp_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_msp_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_msp_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  business_name text;
  abn_number text;
  new_msp_id uuid;
  matching_invitation_count integer;
  invitation_msp_id uuid;
  invitation_role text;
  external_viewer_msp_id uuid;
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

  SELECT link.msp_id
  INTO external_viewer_msp_id
  FROM public.external_viewer_links AS link
  WHERE lower(link.recipient_email) = lower(btrim(new.email))
    AND link.revoked_at IS NULL
    AND link.expires_at > now()
  ORDER BY link.created_at DESC
  LIMIT 1;

  IF external_viewer_msp_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      msp_id,
      full_name,
      email,
      role
    )
    VALUES (
      new.id,
      external_viewer_msp_id,
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      new.email,
      'external_viewer'
    );

    RETURN new;
  END IF;

  business_name := btrim(coalesce(new.raw_user_meta_data ->> 'msp_name', ''));

  abn_number := nullif(
    regexp_replace(coalesce(new.raw_user_meta_data ->> 'abn', ''), '[^0-9]', '', 'g'),
    ''
  );

  IF business_name = '' THEN
    RAISE EXCEPTION 'A business name is required.'
      USING errcode = '23514';
  END IF;

  INSERT INTO public.msps (msp_name, display_name, abn)
  VALUES (business_name, business_name, abn_number)
  RETURNING id INTO new_msp_id;

  INSERT INTO public.profiles (id, msp_id, full_name, email, role)
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

REVOKE ALL ON FUNCTION public.handle_new_msp_signup() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users of the same msp can view tenants" ON public.tenants;
CREATE POLICY "Users of the same msp can view tenants"
ON public.tenants
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.msp_id = tenants.msp_id
      AND (
        profile.role <> 'external_viewer'
        OR public.can_view_external_tenant(tenants.id)
      )
  )
);

CREATE POLICY "External viewers can read their shared tenant"
ON public.tenants
FOR SELECT TO authenticated
USING (public.can_view_external_tenant(id));

CREATE POLICY "External viewers can read shared tenant controls"
ON public.tenant_controls
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenants tenant
    WHERE tenant.id = tenant_controls.tenant_id
      AND public.can_view_external_tenant(tenant.id)
  )
);

CREATE POLICY "External viewers can read shared tenant evidence"
ON public.evidence
FOR SELECT TO authenticated
USING (public.can_view_external_tenant(tenant_id));

CREATE POLICY "External viewers can read shared evidence reviews"
ON public.evidence_reviews
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.evidence evidence
    WHERE evidence.id = evidence_reviews.evidence_id
      AND public.can_view_external_tenant(evidence.tenant_id)
  )
);

CREATE POLICY "External viewers can read shared evidence notes"
ON public.evidence_notes
FOR SELECT TO authenticated
USING (public.can_view_external_tenant(tenant_id));

CREATE POLICY "External viewers can read shared evidence expiration history"
ON public.evidence_expiration_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.evidence evidence
    WHERE evidence.id = evidence_expiration_events.evidence_id
      AND public.can_view_external_tenant(evidence.tenant_id)
  )
);

CREATE POLICY "External viewers can read shared evidence files"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance_evidence'
  AND EXISTS (
    SELECT 1
    FROM public.evidence evidence
    WHERE evidence.file_path = storage.objects.name
      AND public.can_view_external_tenant(evidence.tenant_id)
  )
);