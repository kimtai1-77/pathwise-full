import logoMain from '@/assets/logos/logo_main.png';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import './styles/OnboardingLightbox.css';

export function OnboardingLightbox({ onAddTenant }) {
  useBodyScrollLock(true);

  return (
    <div className="onboarding-lightbox" role="dialog" aria-modal="true" aria-labelledby="onboarding-lightbox-title">
      <section className="onboarding-lightbox__panel">
        <img className="onboarding-lightbox__logo" src={logoMain} alt="Pathwise Systems" />
        <span className="onboarding-lightbox__eyebrow">WORKSPACE SETUP</span>
        <h2 id="onboarding-lightbox-title">Add your first tenant</h2>
        <p>You need at least one tenant before you can use the compliance platform. Add a business name now; an ABN is optional.</p>
        <p className="onboarding-lightbox__guide">Organization settings are always available from your company name at the top left.</p>
        <button className="onboarding-lightbox__action" type="button" onClick={onAddTenant}>
          Add tenant
        </button>
      </section>
    </div>
  );
}