import logoFavicon from '@/assets/logos/logo_main.png'
import './ui_styles/card-header.css'

export function CardHeader({ title = 'Sign up', description = 'Create a new account', titleId = 'signup-title' }) {
    return(
        <div className="card-header">
            <img className="card-header__logo" src={logoFavicon} alt="Pathwise Systems" />
            <h1 className="header-title" id={titleId}>{title}</h1>
            <p>{description}</p>
        </div>
    )
}