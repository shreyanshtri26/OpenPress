import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useState } from 'react';

const PWAInstall = () => {
    const { isInstallable, installApp, dismissPrompt, isIOS } = usePWAInstall();
    const [isInstalling, setIsInstalling] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);

    if (!isInstallable) {
        return null;
    }

    const handleInstall = async () => {
        if (isIOS) {
            // For iOS, show instructions modal
            setShowIOSInstructions(true);
        } else {
            // For Android/Desktop, use the standard install prompt
            setIsInstalling(true);
            try {
                await installApp();
            } catch (error) {
                console.error('Error installing app:', error);
            } finally {
                setIsInstalling(false);
            }
        }
    };

    const closeIOSInstructions = () => {
        setShowIOSInstructions(false);
    };

    return (
        <>
            <div className="pwa-install-banner">
                <div className="pwa-install-content">
                    <div className="pwa-install-info">
                        <div className="pwa-install-icon">
                            <img src="/pwa-192x192.png" alt="OpenPress" />
                        </div>
                        <div className="pwa-install-text">
                            <h3>Install OpenPress</h3>
                            <p>Install our app for a better experience and push notifications to your device.</p>
                        </div>
                    </div>
                    <div className="pwa-install-actions">
                        <button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            className="pwa-install-btn"
                        >
                            {isInstalling ? 'Installing...' : 'Install'}
                        </button>
                        <button
                            onClick={dismissPrompt}
                            className="pwa-dismiss-btn"
                            aria-label="Dismiss install prompt"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M15 5L5 15M5 5L15 15"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Installation Instructions Modal */}
            {showIOSInstructions && (
                <div className="ios-install-modal-overlay" onClick={closeIOSInstructions}>
                    <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ios-install-modal-header">
                            <h3>Add to Home Screen</h3>
                            <button
                                onClick={closeIOSInstructions}
                                className="ios-modal-close-btn"
                                aria-label="Close"
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M18 6L6 18M6 6L18 18"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="ios-install-modal-body">
                            <p className="ios-install-intro">
                                To install OpenPress on your iPhone, follow these steps:
                            </p>
                            <ol className="ios-install-steps">
                                <li>
                                    <span className="step-number">1</span>
                                    <div className="step-content">
                                        <p>Tap the <strong>Share</strong> button</p>
                                        <div className="step-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 5V19M12 5L7 10M12 5L17 10" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M5 14V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V14" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <span className="step-number">2</span>
                                    <div className="step-content">
                                        <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                                        <div className="step-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#007AFF" strokeWidth="2" />
                                                <path d="M12 8V16M8 12H16" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <span className="step-number">3</span>
                                    <div className="step-content">
                                        <p>Tap <strong>"Add"</strong> to confirm</p>
                                    </div>
                                </li>
                            </ol>
                            <div className="ios-install-footer">
                                <p>The app will appear on your home screen!</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstall;
