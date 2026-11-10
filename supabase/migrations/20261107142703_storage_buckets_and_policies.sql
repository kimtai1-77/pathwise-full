INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
	('brand-assets', 'brand-assets', true, null, null),
	(
		'compliance_evidence',
		'compliance_evidence',
		false,
		52428800,
		ARRAY[
			'application/pdf',
			'text/csv',
			'application/csv',
			'text/plain',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'image/png',
			'image/jpeg'
		]::text[]
	),
	('logos', 'logos', false, null, null)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
		public = EXCLUDED.public,
		file_size_limit = EXCLUDED.file_size_limit,
		allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "MSP members can upload compliance evidence" ON storage.objects;
CREATE POLICY "MSP members can upload compliance evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
	bucket_id = 'compliance_evidence'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
);

DROP POLICY IF EXISTS "MSP members can view compliance evidence files" ON storage.objects;
CREATE POLICY "MSP members can view compliance evidence files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
	bucket_id = 'compliance_evidence'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
);

DROP POLICY IF EXISTS "MSP members can view their logos" ON storage.objects;
CREATE POLICY "MSP members can view their logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
	bucket_id = 'logos'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
);

DROP POLICY IF EXISTS "MSP owners can delete their logos" ON storage.objects;
CREATE POLICY "MSP owners can delete their logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
	bucket_id = 'logos'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
	AND public.is_msp_owner((SELECT public.my_msp_id()))
);

DROP POLICY IF EXISTS "MSP owners can update their logos" ON storage.objects;
CREATE POLICY "MSP owners can update their logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
	bucket_id = 'logos'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
	AND public.is_msp_owner((SELECT public.my_msp_id()))
)
WITH CHECK (
	bucket_id = 'logos'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
	AND public.is_msp_owner((SELECT public.my_msp_id()))
);

DROP POLICY IF EXISTS "MSP owners can upload their logos" ON storage.objects;
CREATE POLICY "MSP owners can upload their logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
	bucket_id = 'logos'
	AND (storage.foldername(name))[1] = (SELECT public.my_msp_id())::text
	AND public.is_msp_owner((SELECT public.my_msp_id()))
);
