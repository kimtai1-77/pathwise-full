import logoMain from '@/assets/logos/logo_main.png'
import './TermsAndConditions.css'

export default function TermsAndConditions({ onClose }) {
  return (
    <main className="terms-page">
      <div className="terms-page__shell">
        <header className="terms-page__header">
          <img src={logoMain} alt="Pathwise" className="terms-page__logo" />
        </header>

        <article className="terms-page__content">
          <h1>Terms and Conditions</h1>
          <p className="terms-page__updated">Last updated: 30 October 2026</p>

          <section>
            <h2>1. Acceptance of terms</h2>
            <p>By accessing or using Pathwise, you agree to these Terms and Conditions and any applicable laws and regulations. If you do not agree, you must not use the service.</p>
          </section>

          <section>
            <h2>2. Account responsibility</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity performed through your account. You must provide accurate registration and workspace information.</p>
          </section>

          <section>
            <h2>3. Acceptable use</h2>
            <p>You may use the service only for lawful business purposes. You must not misuse the service, interfere with other users, attempt unauthorised access, or upload unlawful or harmful content.</p>
          </section>

          <section>
            <h2>4. Client and organisational data</h2>
            <p>You confirm that you have the authority to provide client, tenant, employee, and other organisational data to the service. You are responsible for ensuring that the collection and use of that data comply with applicable privacy and security requirements.</p>
          </section>

          <section>
            <h2>5. Service availability</h2>
            <p>We may update, suspend, or improve the service from time to time. The service is provided as available, and we do not guarantee that every feature will be uninterrupted or error-free.</p>
          </section>

          <section>
            <h2>6. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Pathwise is not liable for indirect or consequential loss arising from use of the service. Your use of compliance features and reports remains subject to your own professional and regulatory obligations.</p>
          </section>

          <section>
            <h2>7. Privacy</h2>
            <p>Use of the service is subject to our Privacy Policy. You must review the policy and applicable data-handling obligations before submitting personal or client information.</p>
          </section>

          <section>
            <h2>8. Changes to these terms</h2>
            <p>We may revise these terms as the service develops. The current version will be available within the application, and continued use after a revision constitutes acceptance of the updated terms.</p>
          </section>
        </article>

        <footer className="terms-page__footer">
          <button type="button" className="terms-page__close" onClick={onClose}>Close</button>
        </footer>
      </div>
    </main>
  )
}
