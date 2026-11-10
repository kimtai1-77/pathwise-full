import { withSupabase } from 'npm:@supabase/server@^1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function reactivationEmailHtml(mspName: string, ownerName: string, signInUrl: string) {
  const safeMspName = escapeHtml(mspName)
  const safeOwnerName = escapeHtml(ownerName)
  const safeSignInUrl = escapeHtml(signInUrl)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #ffffff; font-family: Arial, sans-serif;">
  <div style="max-width: 100%; margin: 0 44px;">
    <img src="https://tpcsmbgwzeqvwaxizsia.supabase.co/storage/v1/object/public/brand-assets/logo_main.png"
         alt="Pathwise Systems"
         width="90"
         style="display: block; margin: 0 auto 44px; border: 0;">

    <div style="text-align: left;">
      <h2 style="margin: 0 0 16px; color: #3d3632; font-size: 22px; font-weight: 700;">
        Your access to ${safeMspName} on the Pathwise Systems Platform has been restored
      </h2>

      <p style="margin: 0 0 28px; color: #191614; font-size: 16px; line-height: 1.5;">
        ${safeOwnerName} has restored access to your existing account. You can now sign in to ${safeMspName} on Pathwise Systems.
      </p>
      <p style="margin: 0 0 12px; color: #191614; font-size: 16px; line-height: 1.5;">
        Use your existing email address and password. If you have forgotten your password, choose “Forgot password” on the sign-in page.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${safeSignInUrl}"
         target="_blank"
         style="display: inline-block; padding: 14px 28px; background-color: #543e1e; border-radius: 8px; color: #f5f0e6; font-size: 16px; font-weight: bold; margin: 24px 0; text-decoration: none;">
        Sign in to Pathwise
      </a>
    </div>

    <p style="margin: 12px 0 0; color: #191614; font-size: 14px; line-height: 1.5;">
      If you were not expecting this change, contact your MSP owner.
    </p>
  </div>
</body>
</html>`
}

const authenticatedHandler = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  let body: { profile_id?: unknown; role?: unknown }
  try {
    body = await req.json()
  } catch {
    return errorResponse('Request body must be valid JSON', 400)
  }

  const profileId = typeof body.profile_id === 'string' ? body.profile_id : ''
  const role = body.role
  if (!profileId) return errorResponse('A profile ID is required', 400)
  if (role !== 'msp_admin' && role !== 'technician') {
    return errorResponse('Role must be msp_admin or technician', 400)
  }

  const callerId = ctx.userClaims?.id
  if (typeof callerId !== 'string') return errorResponse('Unauthorized', 401)

  const { data: caller, error: callerError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('msp_id, role, deactivated_at, full_name')
    .eq('id', callerId)
    .maybeSingle()

  if (callerError || !caller) return errorResponse('Could not verify owner permissions', 500)
  if (caller.role !== 'owner' || caller.deactivated_at) {
    return errorResponse('Only active MSP owners can reactivate team members', 403)
  }

  const { data: member, error: memberError } = await ctx.supabaseAdmin
    .from('profiles')
    .select('id, msp_id, email, full_name, role, deactivated_at')
    .eq('id', profileId)
    .eq('msp_id', caller.msp_id)
    .maybeSingle()

  if (memberError) return errorResponse('Could not load the team member', 500)
  if (!member || member.role === 'owner') return errorResponse('Member not found in this MSP', 404)
  if (!member.deactivated_at) return errorResponse('This user is already active', 409)

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('REACTIVATION_FROM_EMAIL')
  if (!apiKey || !fromEmail) {
    return errorResponse('Reactivation email is not configured. No changes were made.', 503)
  }

  const origin = req.headers.get('origin')
  let signInUrl: string
  try {
    if (!origin) throw new Error('Missing origin')
    const appUrl = new URL(origin)
    signInUrl = new URL('/?auth=sign-in', appUrl).toString()
  } catch {
    return errorResponse('Could not determine the Pathwise sign-in URL', 400)
  }

  const { data: msp, error: mspError } = await ctx.supabaseAdmin
    .from('msps')
    .select('msp_name')
    .eq('id', caller.msp_id)
    .maybeSingle()

  if (mspError || !msp) return errorResponse('Could not load MSP details', 500)

  const mspName = msp.msp_name?.trim() || 'your MSP'
  const ownerName = caller.full_name?.trim() || 'Your MSP owner'
  const emailHtml = reactivationEmailHtml(mspName, ownerName, signInUrl)
  const emailText = `${ownerName} restored your access to ${mspName} on the Pathwise Systems Platform.\n\nSign in with your existing email and password: ${signInUrl}\n\nIf you were not expecting this change, contact your MSP owner.`

  const { error: unbanError } = await ctx.supabaseAdmin.auth.admin.updateUserById(member.id, {
    ban_duration: 'none',
  })
  if (unbanError) {
    console.error('Could not restore Auth sign-in for member', unbanError)
    return errorResponse('Could not restore this user’s sign-in', 502)
  }

  const { data: updatedMember, error: updateError } = await ctx.supabaseAdmin
    .from('profiles')
    .update({ deactivated_at: null, role, updated_at: new Date().toISOString() })
    .eq('id', member.id)
    .eq('msp_id', caller.msp_id)
    .not('deactivated_at', 'is', null)
    .select('id')
    .maybeSingle()

  if (updateError || !updatedMember) {
    await ctx.supabaseAdmin.auth.admin.updateUserById(member.id, { ban_duration: '876000h' })
    console.error('Could not restore member profile', updateError)
    return errorResponse('Could not restore this user’s profile', 500)
  }

  let emailSent = false
  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [member.email],
        subject: 'Your Pathwise access has been restored',
        html: emailHtml,
        text: emailText,
      }),
    })
    emailSent = emailResponse.ok
  } catch (error) {
    console.error('Reactivation email request failed', error)
  }

  if (!emailSent) {
    const deactivatedAt = new Date().toISOString()
    const { error: rollbackError } = await ctx.supabaseAdmin
      .from('profiles')
      .update({ deactivated_at: deactivatedAt, role: member.role, updated_at: deactivatedAt })
      .eq('id', member.id)
      .eq('msp_id', caller.msp_id)

    const { error: rebanError } = await ctx.supabaseAdmin.auth.admin.updateUserById(member.id, {
      ban_duration: '876000h',
    })

    if (rollbackError || rebanError) {
      console.error('Reactivation email failed and rollback was incomplete', { rollbackError, rebanError })
      return errorResponse('Email could not be sent and access rollback was incomplete. Contact support.', 502)
    }

    return errorResponse('Could not send the reactivation email. The user remains deactivated.', 502)
  }

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
    console.error('Unexpected reactivate-member error', error)
    return new Response(JSON.stringify({ error: 'Unexpected reactivation error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})