import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck, ArrowLeft, Smartphone } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [step, setStep] = useState(1); // 1: Identifier input, 2: OTP verification
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    const value = identifier.trim();
    if (!value) {
      setError('Enter a valid mobile number or email address');
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp({
        identifier: value,
        mobile: value,
        email: value,
        type: 'login',
      });
      setMaskedEmail(res.email || 'your registered email');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP to email');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(otpCode.trim())) {
      return setError('Enter the 6-digit OTP code sent to your email');
    }

    setLoading(true);
    try {
      const user = await api.verifyOtpLogin({
        identifier: identifier.trim(),
        mobile: identifier.trim(),
        otpCode: otpCode.trim(),
      });
      login(user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-8 px-5 flex flex-col justify-center max-w-lg mx-auto space-y-6">
      {/* Logo & Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="w-24 h-24 rounded-3xl bg-white p-2 shadow-lg border border-slate-200 flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Burkit SmartCity Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="font-display font-black text-2xl text-ink-900 dark:text-cloud-100 tracking-tight mt-1">
          BurKIt Smartcity
        </h1>
        <p className="text-xs font-semibold text-[#ea580c]">
          Burkitmanagaram Nearby Areas service
        </p>
      </div>

      {/* Login Form Card */}
      <div className="card p-5 space-y-4 shadow-lg rounded-3xl">
        <h2 className="font-display font-bold text-base text-ink-900 dark:text-cloud-100 text-center">
          {step === 1 ? 'உள்நுழைய (Login)' : 'மின்னஞ்சல் OTP சரிபார்ப்பு (Email OTP Verification)'}
        </h2>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">
                மொபைல் எண் அல்லது மின்னஞ்சல் (Mobile Number or Email) *
              </label>
              <div className="mt-1.5 relative">
                <input
                  className="input font-medium text-sm pl-3 pr-4 py-3"
                  type="text"
                  placeholder="98765 43210 or name@gmail.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <p className="text-[11px] text-ink-700/50 dark:text-cloud-100/50 mt-1">
                Enter your 10-digit mobile number or registered email address.
              </p>
            </div>

            {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 p-3 rounded-xl">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 font-bold text-sm shadow-md">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              மின்னஞ்சலுக்கு OTP அனுப்புக (Send Email OTP)
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
            <div className="bg-orange-50 dark:bg-ink-800/80 p-3.5 rounded-2xl text-center space-y-1">
              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 font-medium">
                OTP code sent to registered Email:
              </p>
              <p className="font-extrabold text-sm text-[#ea580c] font-mono">
                {maskedEmail}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">
                6-இலக்க OTP குறியீடு (6-Digit OTP Code) *
              </label>
              <input
                type="text"
                maxLength={6}
                className="input mt-2 text-center text-2xl font-mono tracking-widest font-black text-[#ea580c] !py-3"
                placeholder="• • • • • •"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                required
              />
            </div>

            {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl text-center">{error}</p>}

            <div className="space-y-2">
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-md">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                சரிபார்த்து உள்நுழைக (Verify & Login)
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} /> Back / Change Login Info
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-ink-700/60 dark:text-cloud-100/60 pt-1 font-medium">
          புதிய பயனரா?{' '}
          <Link to="/register" className="text-[#ea580c] font-extrabold underline">
            கணக்கு உருவாக்க (Register)
          </Link>
        </p>
      </div>

      {/* Announcement Card (Tamil) */}
      <div className="card p-5 rounded-3xl bg-gradient-to-br from-[#ea580c]/10 via-[#f97316]/10 to-amber-500/10 border border-[#f97316]/30 dark:border-[#f97316]/40 space-y-3.5 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="text-xl">📢</span>
          <p className="text-xs font-bold text-orange-950 dark:text-orange-200 leading-relaxed">
            பர்கித்மாநகரத்தைச் சுற்றியுள்ள அனைத்து பகுதிகளிலும் உள்ள பொதுமக்கள் Burkit SmartCity App-ஐ பயன்படுத்திக் கொள்ளலாம்.
          </p>
        </div>

        <div className="pt-1 border-t border-[#f97316]/20 space-y-2 text-xs">
          <p className="font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1.5 text-xs">
            <span>📱</span> இந்த App மூலம்:
          </p>

          <ul className="space-y-2 text-[12px] text-ink-800 dark:text-cloud-100/90 font-medium">
            <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
              <span className="shrink-0 text-base">🛒</span>
              <span>உங்கள் பகுதியில் பொருட்களை வாங்கவும், விற்கவும் முடியும்.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
              <span className="shrink-0 text-base">🏪</span>
              <span>உங்கள் பகுதியில் உள்ள அனைத்து சேவைகளையும் தெரிந்துகொள்ளலாம்.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
              <span className="shrink-0 text-base">💼</span>
              <span>புதிய வேலைவாய்ப்பு தகவல்களை உடனுக்குடன் பெறலாம்.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
              <span className="shrink-0 text-base">📢</span>
              <span>உங்கள் பகுதியில் நடைபெறும் நிகழ்வுகள் மற்றும் முக்கிய அறிவிப்புகளை அறிந்துகொள்ளலாம்.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
              <span className="shrink-0 text-base">📍</span>
              <span>அருகிலுள்ள கடைகள், சேவைகள் மற்றும் பயனுள்ள தகவல்களை ஒரே இடத்தில் பெறலாம்.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
