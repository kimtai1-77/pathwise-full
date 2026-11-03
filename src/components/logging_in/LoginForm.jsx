
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient.js'
import { safeNextPath } from '@/lib/safe-next-path.js'
import { CardContent } from '@/components/ui/card-content'
import { CardHeader } from '@/components/ui/card-header'
import { BtnMain } from '@/components/ui/buttons/btn-main'
import './styles/LoginForm.css'

export default function LoginForm({ onLoginSuccess, onSignUpClick, onForgotPasswordClick }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error

            if (onLoginSuccess) {
                onLoginSuccess(data.user)
            } else {
                const next = new URLSearchParams(window.location.search).get('next')
                window.location.href = safeNextPath(next, '/')
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="login-page">
            <section className="login-wrapper" aria-labelledby="login-title">
                <form onSubmit={handleLogin}>
                    <CardHeader
                        title="Sign in"
                        description="Enter your email and password to sign in"
                        titleId="login-title"
                    />

                    <div className="login-fields">
                        <CardContent
                            label="Email"
                            type="email"
                            placeholder="m@example.com"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />

                        <CardContent
                            label="Password"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <p className="login-forgot">
                        <a href="/forgot-password" onClick={onForgotPasswordClick}>Forgot password?</a>
                    </p>

                    {error && <p className="login-error" role="alert">{error}</p>}

                    <BtnMain className="login-submit" type="submit" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign in'}
                    </BtnMain>

                    <p className="login-footer">
                        Don&apos;t have an account?{' '}
                        <a href="/sign-up" onClick={onSignUpClick}>Sign up</a>
                    </p>
                </form>
            </section>
        </main>
    )
}