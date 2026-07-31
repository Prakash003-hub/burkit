import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('PWA ServiceWorker registered successfully:', reg.scope))
          .catch((err) => console.warn('PWA ServiceWorker registration failed:', err));
      });
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user dismissed banner previously in this session
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA installation');
      setInstalled(true);
    } else {
      console.log('User dismissed PWA installation');
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  }

  if (!showBanner || installed) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-50 max-w-lg mx-auto animate-bounce-short">
      <div className="card p-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-2xl rounded-2xl flex items-center justify-between border border-orange-400/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="Burkit Smartcity Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <Sparkles size={12} className="text-amber-200 animate-pulse" />
              <h3 className="font-display font-extrabold text-xs tracking-tight text-white">
                BurKIt Smartcity Mobile App
              </h3>
            </div>
            <p className="text-[11px] text-orange-100 font-medium">
              மொபைலில் நிறுவவும் (Install App)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-white text-[#ea580c] font-black text-xs rounded-xl shadow-md hover:bg-orange-50 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Download size={14} className="stroke-[3]" />
            நிறுவ (Install)
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
