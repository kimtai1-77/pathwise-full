import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status })
}

const authenticatedHandler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  let body: { tenant_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Request body must be valid JSON', 400)
  }

  const tenantId = typeof body.tenant_id === 'string' ? body.tenant_id : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    return errorResponse('A valid tenant ID is required', 400)
  }

  const callerId = ctx.userClaims?.id
  if (typeof callerId !== 'string') return errorResponse('Unauthorized', 401)

  const { data: caller, error: callerError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('msp_id, role, deactivated_at')
    .eq('id', callerId)
    .maybeSingle()

  if (callerError || !caller) return errorResponse('Could not verify owner permissions', 500)
  if (caller.role !== 'owner' || caller.deactivated_at) return errorResponse('Only active MSP owners can remove tenants', 403)

  const { data: tenant, error: tenantError } = await ctx.supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('msp_id', caller.msp_id)
    .maybeSingle()

  if (tenantError) return errorResponse('Could not load tenant', 500)
  if (!tenant) return errorResponse('Tenant not found in this MSP', 404)

  const filePaths: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await ctx.supabaseAdmin
      .from('evidence')
      .select('file_path')
      .eq('tenant_id', tenantId)
      .eq('msp_id', caller.msp_id)
      .order('id')
      .range(offset, offset + 999)

    if (error) return errorResponse('Could not prepare tenant evidence cleanup', 500)

    const paths = (data || []).map((evidence) => evidence.file_path).filter(Boolean)
    if (paths.some((filePath) => !filePath.startsWith(`${caller.msp_id}/`))) {
      return errorResponse('Tenant evidence contains an invalid storage path', 500)
    }
    filePaths.push(...paths)
    if (!data || data.length < 1000) break
  }

  for (let offset = 0; offset < filePaths.length; offset += 100) {
    const { error } = await ctx.supabaseAdmin.storage
      .from('compliance_evidence')
      .remove(filePaths.slice(offset, offset + 100))

    if (error) {
      console.error('Tenant evidence storage cleanup failed', error)
      return errorResponse('Could not remove tenant evidence files. Tenant data was retained; try again.', 502)
    }
  }

  const { data: deletedTenant, error: deleteError } = await ctx.supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .eq('msp_id', caller.msp_id)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    console.error('Tenant row deletion failed', deleteError)
    return errorResponse('Evidence files were removed, but the tenant could not be deleted. Try again.', 500)
  }
  if (!deletedTenant) return errorResponse('Tenant not found or you do not have permission', 404)

  return Response.json({ ok: true })
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const response = await authenticatedHandler(req)
    const headers = new Headers(response.headers)
    for (const [header, value] of Object.entries(corsHeaders)) headers.set(header, value)
    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    console.error('Unexpected delete-tenant error', error)
    return new Response(JSON.stringify({ error: 'Unexpected tenant deletion error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})