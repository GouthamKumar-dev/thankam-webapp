import { Camera, CheckCircle2, ChevronRight, Loader2, RefreshCw, Sparkles, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { eventPortalService } from '@/features/event-media/event-media.service';

type Step = 'contact' | 'otp' | 'upload' | 'done';

export function EventSelfiePage() {
  const [step, setStep]           = useState<Step>('contact');
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState('');
  const [token, setToken]         = useState('');
  const [preview, setPreview]     = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [busy, setBusy]           = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const handleRequestOtp = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    const p = phone.replace(/\D/g, '');
    if (p.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setBusy(true);
    try {
      await eventPortalService.requestOtp(p);
      toast.success('OTP sent to your phone');
      setPhone(p);
      setStep('otp');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) { toast.error('Enter the OTP'); return; }
    setBusy(true);
    try {
      const res = await eventPortalService.verifyOtp(phone, otp, name) as any;
      setToken(res.token ?? res.accessToken ?? '');
      setStep('upload');
    } catch (e: any) { toast.error(e?.message ?? 'Invalid OTP'); }
    finally { setBusy(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) { toast.error('Please select a photo'); return; }
    setBusy(true);
    try {
      await eventPortalService.submitSelfie(token, { customerName: name, imageFile: file });
      setStep('done');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to upload'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1B3C] via-[#1a2d5a] to-[#0F1B3C] flex flex-col items-center justify-center p-4">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 mb-3">
          <Camera size={28} className="text-[#0F1B3C]" />
        </div>
        <h1 className="text-2xl font-black text-white">Selfie Point</h1>
        <p className="mt-1 text-sm text-white/50">Capture your moment with us</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Step: Contact */}
        {step === 'contact' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Step 1 of 3 — Your Details</p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/70">Your Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-white/70">Mobile Number</label>
                  <input
                    value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    inputMode="numeric" maxLength={10}
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
            <button onClick={() => void handleRequestOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {busy ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">Step 2 of 3 — Verify OTP</p>
              <p className="text-xs text-white/50">OTP sent to +91 {phone}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Enter OTP</label>
              <input
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••" inputMode="numeric"
                className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-center text-2xl font-black tracking-widest text-white placeholder:text-white/20 outline-none focus:border-amber-400"
              />
            </div>
            <button onClick={() => void handleVerifyOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button onClick={() => { setStep('contact'); setOtp(''); }}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-white/40 hover:text-white/70">
              <RefreshCw size={12} /> Change number
            </button>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Step 3 of 3 — Upload Your Selfie</p>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="w-full aspect-square rounded-2xl object-cover" />
                <button onClick={() => { setPreview(null); setFile(null); }}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/20 py-10 hover:border-amber-400/50 transition-colors">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                  <Upload size={24} className="text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Tap to select photo</p>
                  <p className="mt-0.5 text-xs text-white/40">JPG, PNG up to 10 MB</p>
                </div>
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleFileChange} />

            <button onClick={() => void handleSubmit()} disabled={!file || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {busy ? 'Uploading…' : 'Submit Selfie'}
            </button>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-8 text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20 border border-emerald-400/30">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Thank You, {name}!</h2>
              <p className="mt-2 text-sm text-white/50">
                Your selfie has been submitted. Our team will review it shortly.
              </p>
            </div>
            <button onClick={() => { setStep('contact'); setName(''); setPhone(''); setOtp(''); setFile(null); setPreview(null); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:border-white/30">
              <RefreshCw size={14} /> Submit another
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-white/25">Powered by Thankam Events</p>
    </div>
  );
}
