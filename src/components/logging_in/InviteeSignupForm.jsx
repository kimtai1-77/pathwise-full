import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient.js'
import { CardContent } from '@/components/ui/card-content'
import { CardHeader } from '@/components/ui/card-header'
import { BtnMain } from '@/components/ui/buttons/btn-main'
import './styles/InviteeSignupForm.css'

const roleLabels = {
    msp_admin: 'MSP Administrator',
    technician: 'Technician',
}

export default function InviteeSignupForm({ user, invitation, onComplete, onSignInClick }) {
    const preview = !user
    const metadata = user?.user_metadata ?? {}
    const invitationMetadata = invitation ?? metadata
    const [nameState, setNameState] = useState(() => ({
        source: metadata.full_name,
        value: metadata.full_name || '',
    }))
    const fullName = nameState.source === metadata.full_name
        ? nameState.value
        : metadata.full_name || ''
    const invitedEmail = user?.email || metadata.email || (preview ? 'jane@example.com' : '')
    const [password, setPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleInviteeLogin(event) {
        event.preventDefault()
        setError(null)

        if (!fullName.trim()) {
            setError('Enter your full name.')
            return
        }

        if (!password || password !== repeatPassword) {
            setError(password ? 'Passwords do not match.' : 'Enter a password.')
            return
        }

        setIsLoading(true)

        if (preview) {
            if (onComplete) onComplete({ id: 'preview', email: invitedEmail, user_metadata: metadata })
            setIsLoading(false)
            return
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.updateUser({
                password,
                data: {
                    full_name: fullName.trim(),
                },
            })

            if (authError) throw authError

            const authUser = authData.user
            const mspId = invitationMetadata.msp_id
            const role = invitationMetadata.role

            const invitationMetadataWithoutPreview = invitationMetadata === metadata ? metadata : invitationMetadata
            if (invitationMetadataWithoutPreview.invitation !== true && !invitation) {
                throw new Error('This account does not have a valid invitation.')
            }

            if (!authUser?.id || !mspId || !role) {
                throw new Error('This invitation is missing its organisation or role information.')
            }

            const { error: acceptanceError } = await supabase.functions.invoke('accept-invitation', {
                body: { full_name: fullName.trim() },
            })

            if (acceptanceError) {
                let message = acceptanceError.message
                if ('context' in acceptanceError && acceptanceError.context?.json) {
                    const details = await acceptanceError.context.json().catch(() => null)
                    message = details?.error || message
                }
                throw new Error(message || 'Could not create member profile.')
            }
            if (onComplete) onComplete(authUser)
        } catch (submitError) {
            const message = submitError?.message
                || submitError?.error_description
                || submitError?.details
                || submitError?.hint
                || 'Could not complete the invitation.'
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="invitee-login-page">
            <section className="invitee-login-wrapper" aria-labelledby="invitee-login-title">
                <CardHeader
                    title="Complete your invitation"
                    description={`Set up your Pathwise account to join ${invitationMetadata.msp_name || 'your MSP'}.`}
                    titleId="invitee-login-title"
                />

                <form onSubmit={handleInviteeLogin}>
                    <div className="invitee-login-context" aria-label="Invitation details">
                        <div>
                            <span>Organisation</span>
                            <strong>{invitationMetadata.msp_name || 'Your MSP'}</strong>
                        </div>
                        <div>
                            <span>Role</span>
                            <strong>{roleLabels[invitationMetadata.role] || invitationMetadata.role || 'Team member'}</strong>
                        </div>
                    </div>

                    <div className="invitee-login-fields">
                        <CardContent
                            label="Full Name"
                            type="text"
                            placeholder="Jane Doe"
                            name="fullName"
                            value={fullName}
                            onChange={(event) => setNameState({
                                source: metadata.full_name,
                                value: event.target.value,
                            })}
                            required
                        />

                        <div className="invitee-login-email">
                            <span>Email</span>
                            <strong>{invitedEmail || 'Email address unavailable'}</strong>
                        </div>

                        <div className="invitee-login-password-grid">
                            <CardContent
                                label="Password"
                                type="password"
                                name="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="new-password"
                                required
                            />

                            <CardContent
                                label="Repeat Password"
                                type="password"
                                name="repeatPassword"
                                value={repeatPassword}
                                onChange={(event) => setRepeatPassword(event.target.value)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="invitee-login-error" role="alert">{error}</p>}

                    <BtnMain className="invitee-login-submit" type="submit" disabled={isLoading}>
                        {isLoading ? 'Joining workspace...' : 'Confirm Invitation'}
                    </BtnMain>

                    {onSignInClick && (
                        <p className="invitee-login-footer">
                            Already have an account?{' '}
                            <a href="/sign-in" onClick={onSignInClick}>Sign in</a>
                        </p>
                    )}
                </form>
            </section>
        </main>
    )
}
