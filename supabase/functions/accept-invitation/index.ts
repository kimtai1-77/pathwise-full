import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const authenticatedHandler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body: { full_name?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  if (!fullName) {
    return Response.json({ error: 'Full name is required' }, { status: 400 })
  }

  const userId = ctx.userClaims?.id
  if (typeof userId !== 'string') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: authUser, error: authError } = await ctx.supabaseAdmin.auth.admin.getUserById(userId)
  if (authError || !authUser.user) {
    return Response.json({ error: 'Could not load invitation account' }, { status: 500 })
  }

  const metadata = authUser.user.user_metadata ?? {}
  if (metadata.invitation !== true) {
    return Response.json({ error: 'This account does not have a valid invitation' }, { status: 403 })
  }

  const mspId = typeof metadata.msp_id === 'string' ? metadata.msp_id : ''
  const role = typeof metadata.role === 'string' ? metadata.role : ''
  if (!mspId || !['msp_admin', 'technician'].includes(role)) {
    return Response.json({ error: 'Invitation is missing its organisation or role' }, { status: 400 })
  }

  const email = authUser.user.email?.toLowerCase()
  if (!email) {
    return Response.json({ error: 'Invitation email is missing' }, { status: 400 })
  }

  const { data: profile, error: profileLookupError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('msp_id', mspId)
    .eq('email', email)
    .maybeSingle()

  if (profileLookupError || !profile) {
    console.error('Could not find invited member profile', profileLookupError)
    return Response.json({ error: 'Member profile could not be found' }, { status: 403 })
  }

  if (profile.role !== role) {
    return Response.json({ error: 'Invitation role could not be verified' }, { status: 403 })
  }

  const { error: profileError } = await ctx.supabaseAdmin
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', profile.id)

  if (profileError) {
    console.error('Could not update invited member profile', profileError)
    return Response.json({ error: 'Could not update member profile' }, { status: 500 })
  }

  return Response.json({ ok: true })
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await authenticatedHandler(req)
    const headers = new Headers(response.headers)
    for (const [header, value] of Object.entries(corsHeaders)) {
      headers.set(header, value)
    }
    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    console.error('Unexpected accept-invitation error', error)
    return new Response(JSON.stringify({ error: 'Unexpected invitation error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
