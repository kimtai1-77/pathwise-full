import { useState } from "react"
import { supabase } from "@/lib/supabaseClient.js"
import { abnFiller } from "@/utils/abnFiller.js"
import { CardContent } from "@/components/ui/card-content"
import { CardHeader } from "@/components/ui/card-header"
import { BtnMain } from "@/components/ui/buttons/btn-main"
import "./styles/sign-up-form.css"

export default function SignUpForm({ onSignInClick }) {
    const [fullName, setFullName] = useState('')
    const [abn, setAbn] = useState('')
    const [mspName, setMspName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [repeatPassword, setRepeatPassword] = useState('')
    const [lookupSucceeded, setLookupSucceeded] = useState(false)
    const [abnAvailable, setAbnAvailable] = useState(true)
    const [lookupError, setLookupError] = useState(null)
    const [isLookupLoading, setIsLookupLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleAbnLookup = async () => {
        setLookupError(null)
        setIsLookupLoading(true)

        try {
            const result = await abnFiller(abn)

            if (result.error) {
                setLookupSucceeded(false)
                setAbnAvailable(true)
                setLookupError(result.error)
                return
            }

            const cleanAbn = abn.replace(/[\s-]/g, '')
            const { data: abnExists, error: duplicateCheckError } = await supabase
                .rpc('msp_exists_for_abn', { p_abn: cleanAbn })

            if (duplicateCheckError) {
                setLookupSucceeded(false)
                setAbnAvailable(false)
                setLookupError('Could not check whether this ABN is already registered. Please try again.')
                return
            }

            if (abnExists) {
                setMspName('')
                setLookupSucceeded(false)
                setAbnAvailable(false)
                setLookupError('An MSP account already exists for this ABN. Ask the owner to send you an invitation.')
                return
            }

            setAbnAvailable(true)
            setMspName(result.data.name)
            setLookupSucceeded(true)
        } catch {
            setLookupSucceeded(false)
            setLookupError('An unexpected error occurred.')
        } finally {
            setIsLookupLoading(false)
        }
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setError(null)

        if (password !== repeatPassword) {
            setError('Passwords do not match')
            return
        }

        if (!mspName.trim()) {
            setError('Enter an MSP name or look up an ABN first.')
            return
        }

        if (abn.trim() && !abnAvailable) {
            setLookupError('An MSP account already exists for this ABN. Ask the owner to send you an invitation.')
            return
        }

        setIsLoading(true)

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/?auth=confirmed`,
                    data: {
                        full_name: fullName,
                        abn: abn.replace(/[\s-]/g, '') || null,
                        msp_name: mspName.trim()
                    }
                },
            })
            if (error) {
                const duplicateAbn = /duplicate|already exists|unique/i.test(`${error.message} ${error.code}`)
                if (duplicateAbn && abn.trim()) {
                    setAbnAvailable(false)
                    setLookupError('An MSP account already exists for this ABN. Ask the owner to send you an invitation.')
                    return
                }
                throw error
            }
            setSuccess(true)
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="signup-page">
            <section className="main-wrapper" aria-labelledby="signup-title">
                {success ? (
                    <div className="success-state">
                        <CardHeader />
                        <p className="success-text">
                            You've successfully signed up! Please check your email to confirm your account before signing in.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSignUp}>
                        <CardHeader />

                        <div className="form-fields">
                            <CardContent
                                label="Full Name"
                                type="text"
                                placeholder="Jane Doe"
                                name="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />

                            <div className="abn-field-row">
                                <CardContent
                                    label="ABN"
                                    type="text"
                                    placeholder="11-digit ABN"
                                    name="abn"
                                    value={abn}
                                    onChange={(e) => {
                                        if (lookupSucceeded) setMspName('')
                                        setAbn(e.target.value)
                                        setLookupSucceeded(false)
                                        setAbnAvailable(true)
                                        setLookupError(null)
                                    }}
                                />
                                <button
                                    className="abn-lookup-button"
                                    type="button"
                                    onClick={handleAbnLookup}
                                    disabled={isLookupLoading || !abn.trim() || !abnAvailable}
                                >
                                    {isLookupLoading ? 'Searching...' : 'Lookup ABN'}
                                </button>
                            </div>
                            <p className="abn-field-tip">If you have an ABN, enter it and press Lookup ABN to populate your business name. If you don't have one, enter your business name directly.</p>
                            {lookupError && <p className="lookup-error" role="alert">{lookupError}</p>}

                            <CardContent
                                label="MSP / Business Name"
                                type="text"
                                placeholder="Acme Managed Services"
                                name="mspName"
                                value={mspName}
                                onChange={(e) => setMspName(e.target.value)}
                                disabled={lookupSucceeded}
                                required
                            />

                            <CardContent
                                label="Email"
                                type="email"
                                placeholder="m@example.com"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <CardContent
                                label="Password"
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <CardContent
                                label="Repeat Password"
                                type="password"
                                name="repeatPassword"
                                value={repeatPassword}
                                onChange={(e) => setRepeatPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <p className="form-error">{error}</p>}

                        <BtnMain className="signup-submit" type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating account...' : 'Create MSP Account'}
                        </BtnMain>

                        <p className="signup-footer">
                            Already have an account? <a href="/sign-in" onClick={onSignInClick}>Sign in</a>
                        </p>
                    </form>
                )}
            </section>
        </main>
    )
}