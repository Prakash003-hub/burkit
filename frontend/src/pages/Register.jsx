import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

import { BURKIT_AREAS } from '../data/areaDefaults.js';

export default function Register() {
  const [step, setStep] = useState(1); // 1: Fill details & send OTP, 2: Verify OTP
  const [form, setForm] = useState({ name: '', mobile: '', email: '', district: 'Tirunelveli', area: 'பர்கிட் மாநகரம் (Burkitmanagaram)', streetName: '' });
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Full name is required');
    if (!/^\d{10}$/.test(form.mobile)) return setError('Enter a valid 10-digit mobile number');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('Enter a valid email address');
    if (!form.district.trim()) return setError('District is required');

    setLoading(true);
    try {
      const res = await api.sendOtp({
        mobile: form.mobile,
        email: form.email.trim(),
        name: form.name.trim(),
        type: 'register',
      });
      setMaskedEmail(res.email || form.email);
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
      const user = await api.verifyOtpRegister({
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email.trim(),
        district: form.district.trim(),
        area: form.area.trim(),
        streetName: form.streetName.trim(),
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
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6 space-y-1">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-[#ea580c] mx-auto flex items-center justify-center shadow-md mb-2">
          <Mail size={32} />
        </div>
        <h1 className="font-display font-black text-2xl text-ink-900 dark:text-cloud-100 tracking-tight">
          {step === 1 ? 'புதிய கணக்கு உருவாக்க (Register)' : 'மின்னஞ்சல் OTP சரிபார்ப்பு (Email OTP)'}
        </h1>
        <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">
          {step === 1 ? 'Enter your registration details' : `Enter the 6-digit OTP code sent to ${maskedEmail}`}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={handleSendOtp} className="card p-5 space-y-4 shadow-lg rounded-3xl">
          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">முழு பெயர் (Full Name) *</label>
            <input
              className="input mt-1 text-sm font-semibold"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">வாட்ஸ்அப் / மொபைல் எண் (Mobile Number) *</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="input w-16 text-center !px-0 font-bold">+91</span>
              <input
                className="input flex-1 font-mono font-bold text-sm"
                inputMode="numeric"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">மின்னஞ்சல் முகவரி (Email Address for OTP) *</label>
            <input
              type="email"
              className="input mt-1 text-sm font-medium"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="yourname@gmail.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">மாவட்டம் (District)</label>
              <input
                className="input mt-1 text-xs font-semibold"
                value={form.district}
                onChange={(e) => update('district', e.target.value)}
                placeholder="Tirunelveli"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">ஊர் / பகுதி (Area) *</label>
              <select
                className="input mt-1 text-xs font-semibold"
                value={form.area}
                onChange={(e) => update('area', e.target.value)}
              >
                {BURKIT_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">தெரு பெயர் (Street Name)</label>
            <input
              className="input mt-1 text-xs font-semibold"
              value={form.streetName}
              onChange={(e) => update('streetName', e.target.value)}
              placeholder="e.g. 1st Street, Main Road"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-md">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
            மின்னஞ்சலுக்கு OTP அனுப்புக (Send Email OTP)
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="card p-5 space-y-5 shadow-lg rounded-3xl animate-fadeIn">
          <div className="bg-orange-50 dark:bg-ink-800/80 p-3.5 rounded-2xl text-center space-y-1">
            <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 font-medium">
              We sent a 6-digit verification code to:
            </p>
            <p className="font-extrabold text-sm text-[#ea580c] font-mono">
              {maskedEmail}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">
              6-இலக்க OTP குறியீடு (6-Digit Email OTP Code) *
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
              சரிபார்த்து கணக்கு தொடங்க (Verify & Register)
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back / Edit Registration Info
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-ink-700/60 dark:text-cloud-100/60 mt-6 font-medium">
        ஏற்கனவே கணக்கு உள்ளதா?{' '}
        <Link to="/login" className="text-[#ea580c] font-extrabold underline">
          உள்நுழைய (Login)
        </Link>
      </p>
    </div>
  );
}
