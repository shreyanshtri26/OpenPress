import { useState, useEffect } from 'react';

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS devices
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // For iOS, show the install prompt if not in standalone mode
        if (isIOSDevice) {
            const isInStandaloneMode = window.navigator.standalone === true;
            if (!isInStandaloneMode) {
                setIsInstallable(true);
            }
            return;
        }

        // Listen for the beforeinstallprompt event (Android/Desktop)
        const handleBeforeInstallPrompt = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        // Listen for successful installation
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) {
            return false;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
            return true;
        } else {
            return false;
        }
    };

    const dismissPrompt = () => {
        setIsDismissed(true);
        setIsInstallable(false);
    };

    return {
        isInstallable: isInstallable && !isInstalled && !isDismissed,
        isInstalled,
        installApp,
        dismissPrompt,
        isIOS,
    };
}
