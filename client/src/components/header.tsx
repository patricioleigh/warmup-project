type HeaderProps = {
    onLogout?: () => void;
    showLogout?: boolean;
};

export function Header({ onLogout, showLogout }: HeaderProps) {
    return (
        <header className="app-header">
            <div className="app-header__inner">
                <div>
                    <h1 className="app-header__title">HN Feed</h1>
                    <p className="app-header__subtitle">We &lt;3 hacker news!</p>
                </div>
                {showLogout && onLogout && (
                    <button type="button" className="logout-btn" onClick={onLogout}>
                        Log out
                    </button>
                )}
            </div>
        </header>
    );
}