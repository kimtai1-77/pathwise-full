import { withSupabase } from 'npm:@supabase/server@^1'

const authenticatedHandler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  let body: { profile_id?: unknown; invitation_id?: unknown; email?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const callerId = ctx.userClaims?.id
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const profileId = typeof body.profile_id === 'string' ? body.profile_id : undefined
  const invitationId = typeof body.invitation_id === 'string' ? body.invitation_id : undefined

  if (!callerId || (!profileId && !invitationId && !email)) {
    return Response.json({ error: 'A member identifier is required' }, { status: 400 })
  }

  const { data: callerProfile, error: callerError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('msp_id, role')
    .eq('id', callerId)
    .single()

  if (callerError || !callerProfile || callerProfile.role !== 'owner') {
    return Response.json({ error: 'Only MSP owners can remove team members' }, { status: 403 })
  }

  let targetProfileId = profileId
  let targetInvitationId = invitationId

  if (email) {
    const { data: profile } = await ctx.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('msp_id', callerProfile.msp_id)
      .eq('email', email)
      .maybeSingle()
    targetProfileId = targetProfileId ?? profile?.id

    const { data: invitation } = await ctx.supabaseAdmin
      .from('msp_invitations')
      .select('id')
      .eq('msp_id', callerProfile.msp_id)
      .eq('email', email)
      .maybeSingle()
    targetInvitationId = targetInvitationId ?? invitation?.id
  } else if (targetProfileId) {
    const { data: profile } = await ctx.supabaseAdmin
      .from('profiles')
      .select('msp_id')
      .eq('id', targetProfileId)
      .single()
    if (!profile || profile.msp_id !== callerProfile.msp_id) {
      return Response.json({ error: 'Member not found in this MSP' }, { status: 404 })
    }
  }

  if (targetInvitationId) {
    const { data: invitation } = await ctx.supabaseAdmin
      .from('msp_invitations')
      .select('msp_id')
      .eq('id', targetInvitationId)
      .single()
    if (!invitation || invitation.msp_id !== callerProfile.msp_id) {
      return Response.json({ error: 'Invitation not found in this MSP' }, { status: 404 })
    }
    await ctx.supabaseAdmin.from('msp_invitations').delete().eq('id', targetInvitationId)
  }

  if (targetProfileId) {
    const { error: profileDeleteError } = await ctx.supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetProfileId)
      .eq('msp_id', callerProfile.msp_id)
    if (profileDeleteError) {
      return Response.json({ error: 'Could not remove the member profile' }, { status: 500 })
    }

    const { error: authDeleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(targetProfileId)
    if (authDeleteError) {
      return Response.json({ error: 'Profile removed, but the Auth user could not be removed' }, { status: 500 })
    }
  } else if (email) {
    const { data: userPage, error: listError } = await ctx.supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (!listError) {
      const invitedUser = userPage.users.find((authUser) => authUser.email?.toLowerCase() === email)
      if (invitedUser) {
        await ctx.supabaseAdmin.auth.admin.deleteUser(invitedUser.id)
      }
    }
  }

  return Response.json({ ok: true })
})

Deno.serve(async (req) => authenticatedHandler(req))
