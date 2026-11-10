ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

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
	LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_msp_member(target_msp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.profiles AS profile
		WHERE profile.id = (SELECT auth.uid())
			AND profile.role IN ('owner', 'msp_admin')
			AND profile.msp_id = target_msp_id
			AND profile.deactivated_at IS NULL
	);
$$;

CREATE OR REPLACE FUNCTION public.is_msp_owner(target_msp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.profiles AS profile
		WHERE profile.id = (SELECT auth.uid())
			AND profile.role = 'owner'
			AND profile.msp_id = target_msp_id
			AND profile.deactivated_at IS NULL
	);
$$;

CREATE OR REPLACE FUNCTION public.change_msp_member_role(target_profile_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	actor_msp_id uuid;
BEGIN
	IF (SELECT auth.uid()) IS NULL THEN
		RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
	END IF;

	IF new_role IS NULL OR new_role NOT IN ('msp_admin', 'technician') THEN
		RAISE EXCEPTION 'Role must be msp_admin or technician' USING errcode = '22023';
	END IF;

	SELECT profile.msp_id
		INTO actor_msp_id
	FROM public.profiles AS profile
	WHERE profile.id = (SELECT auth.uid())
		AND profile.role = 'owner'
		AND profile.deactivated_at IS NULL;

	IF actor_msp_id IS NULL THEN
		RAISE EXCEPTION 'Only an active MSP owner can change member roles' USING errcode = '42501';
	END IF;

	IF target_profile_id = (SELECT auth.uid()) THEN
		RAISE EXCEPTION 'Owners cannot change their own role' USING errcode = '42501';
	END IF;

	UPDATE public.profiles AS profile
	SET role = new_role,
			updated_at = now()
	WHERE profile.id = target_profile_id
		AND profile.msp_id = actor_msp_id
		AND profile.deactivated_at IS NULL;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Active target profile is not a member of your MSP' USING errcode = '42501';
	END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_msp_member(target_profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	actor_msp_id uuid;
	target_msp_id uuid;
	target_role text;
	target_deactivated_at timestamptz;
BEGIN
	IF (SELECT auth.uid()) IS NULL THEN
		RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
	END IF;

	SELECT profile.msp_id
		INTO actor_msp_id
	FROM public.profiles AS profile
	WHERE profile.id = (SELECT auth.uid())
		AND profile.role = 'owner'
		AND profile.deactivated_at IS NULL;

	IF actor_msp_id IS NULL THEN
		RAISE EXCEPTION 'Only active MSP owners can deactivate team members' USING errcode = '42501';
	END IF;

	IF target_profile_id = (SELECT auth.uid()) THEN
		RAISE EXCEPTION 'Owners cannot deactivate themselves' USING errcode = '42501';
	END IF;

	SELECT profile.msp_id, profile.role, profile.deactivated_at
		INTO target_msp_id, target_role, target_deactivated_at
	FROM public.profiles AS profile
	WHERE profile.id = target_profile_id
	FOR UPDATE;

	IF NOT FOUND OR target_msp_id <> actor_msp_id OR target_role = 'owner' THEN
		RAISE EXCEPTION 'Member not found in this MSP' USING errcode = '42501';
	END IF;

	IF target_deactivated_at IS NOT NULL THEN
		RETURN 'already_deactivated';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM public.evidence AS evidence
		LEFT JOIN LATERAL (
			SELECT review.decision
			FROM public.evidence_reviews AS review
			WHERE review.evidence_id = evidence.id
			ORDER BY review.reviewed_at DESC, review.id DESC
			LIMIT 1
		) AS latest_review ON true
		WHERE evidence.uploaded_by = target_profile_id
			AND evidence.msp_id = actor_msp_id
			AND COALESCE(latest_review.decision, 'pending_approval') = 'pending_approval'
	) THEN
		RETURN 'pending_evidence';
	END IF;

	UPDATE public.profiles
	SET deactivated_at = now(),
			updated_at = now()
	WHERE id = target_profile_id;

	RETURN 'deactivated';
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	IF NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at
		AND current_user NOT IN ('postgres', 'service_role') THEN
		RAISE EXCEPTION 'Use the member lifecycle functions to change deactivation status'
			USING errcode = '42501';
	END IF;

	RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_guard_deactivation
BEFORE UPDATE OF deactivated_at ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_deactivation();

REVOKE ALL ON FUNCTION public.deactivate_msp_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deactivate_msp_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "MSP owners can delete other profiles" ON public.profiles;
