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

  let body: { email?: unknown; role?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  if (typeof body.email !== 'string' || typeof body.role !== 'string') {
    return Response.json({ error: 'Email and role are required' }, { status: 400 })
  }

  const email = body.email.trim().toLowerCase()
  const role = body.role

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  if (role !== 'msp_admin' && role !== 'technician') {
    return Response.json({ error: 'Role must be msp_admin or technician' }, { status: 400 })
  }

  const callerId = ctx.userClaims?.id
  if (typeof callerId !== 'string') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await ctx.supabase
    .from('profiles')
    .select('id, msp_id, role, deactivated_at')
    .eq('id', callerId)
    .maybeSingle()

  if (profileError) {
    console.error('Could not load inviter profile')
    return Response.json({ error: 'Could not verify inviter permissions' }, { status: 500 })
  }

  if (!profile || profile.deactivated_at || (profile.role !== 'owner' && profile.role !== 'msp_admin')) {
    return Response.json({ error: 'You are not allowed to send invitations' }, { status: 403 })
  }

  if (profile.role === 'msp_admin' && role !== 'technician') {
    return Response.json({ error: 'Administrators can only invite technicians' }, { status: 403 })
  }

  const { data: existingProfile, error: existingProfileError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('id, deactivated_at')
    .eq('msp_id', profile.msp_id)
    .eq('email', email)
    .maybeSingle()

  if (existingProfileError) {
    console.error('Could not check existing profile email', existingProfileError)
    return Response.json({ error: 'Could not verify the email address' }, { status: 500 })
  }

  if (existingProfile?.deactivated_at) {
    return Response.json({
      code: 'USER_DEACTIVATED',
      profile_id: existingProfile.id,
      error: 'User exists but is deactivated. Would you like to proceed?',
    }, { status: 409 })
  }

  if (existingProfile) {
    return Response.json({ error: `A record already exists for ${email}. Please use another email address.` }, { status: 409 })
  }

  const { data: inviter, error: inviterError } = await ctx.supabaseAdmin.auth.admin.getUserById(callerId)
  if (inviterError || !inviter.user) {
    return Response.json({ error: 'Could not load inviter information' }, { status: 500 })
  }

  const { data: authUsers, error: existingAuthError } = await ctx.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (existingAuthError) {
    console.error('Could not check existing invited email', existingAuthError)
    return Response.json({ error: 'Could not verify the email address' }, { status: 500 })
  }
  if (authUsers.users.some((authUser) => authUser.email?.toLowerCase() === email)) {
    return Response.json({ error: `A record already exists for ${email}. Please use another email address.` }, { status: 409 })
  }

  const mspName = inviter.user.user_metadata?.msp_name ?? inviter.user.user_metadata?.display_name ?? 'Pathwise'
  const inviterName = inviter.user.user_metadata?.full_name
    ?? inviter.user.user_metadata?.name
    ?? inviter.user.email
    ?? 'A Pathwise user'

  const { data: invitation, error: insertError } = await ctx.supabaseAdmin
    .from('msp_invitations')
    .insert({
      msp_id: profile.msp_id,
      email,
      role,
      status: 'pending',
      invited_by: profile.id,
    })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return Response.json({ error: 'An invitation already exists for that email' }, { status: 409 })
    }
    console.error('Could not create invitation record')
    return Response.json({ error: 'Could not create invitation' }, { status: 500 })
  }

  const origin = req.headers.get('origin')?.replace(/\/$/, '') ?? ''
  const redirectTo = origin ? `${origin}/?auth=invitee` : undefined
  const { error: inviteError } = await ctx.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      invitation: true,
      msp_id: profile.msp_id,
      msp_name: mspName,
      inviter_name: inviterName,
      role,
    },
  })

  if (inviteError) {
    const { error: cleanupError } = await ctx.supabaseAdmin
      .from('msp_invitations')
      .delete()
      .eq('id', invitation.id)

    if (cleanupError) {
      console.error('Auth invitation failed and invitation reservation cleanup failed')
      return Response.json({ error: 'Invitation could not be sent; contact an administrator before retrying' }, { status: 500 })
    }

    console.error('Auth invitation could not be sent')
    return Response.json({ error: 'Supabase Auth could not send the invitation' }, { status: 502 })
  }

  return Response.json({ ok: true, invitationId: invitation.id })
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const response = await authenticatedHandler(req)
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value)
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch {
    console.error('Unexpected send-invitation function error')
    return Response.json(
      { error: 'Unexpected error while sending invitation' },
      { status: 500, headers: corsHeaders },
    )
  }
})