import { CheckCircle2, ChevronRight, ImagePlus, Loader2, RefreshCw, Star, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { eventPortalService } from '@/features/event-media/event-media.service';

type Step = 'contact' | 'otp' | 'review' | 'done';

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star size={28}
            className={`transition-colors ${(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

export function EventReviewPage() {
  const [step, setStep]         = useState<Step>('contact');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [token, setToken]       = useState('');
  const [reviewText, setReview] = useState('');
  const [rating, setRating]     = useState(5);
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [busy, setBusy]         = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

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
      setStep('review');
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
    if (!reviewText.trim()) { toast.error('Please write your review'); return; }
    setBusy(true);
    try {
      await eventPortalService.submitReview(token, {
        customerName: name, reviewText: reviewText.trim(), rating, imageFile: file,
      });
      setStep('done');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to submit review'); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setStep('contact'); setName(''); setPhone(''); setOtp('');
    setReview(''); setRating(5); setFile(null); setPreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1B3C] via-[#1a2d5a] to-[#0F1B3C] flex flex-col items-center justify-center p-4">
      {/* Brand header */}
      <div className="mb-8 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 mb-3">
          <Star size={28} className="fill-[#0F1B3C] text-[#0F1B3C]" />
        </div>
        <h1 className="text-2xl font-black text-white">Share Your Experience</h1>
        <p className="mt-1 text-sm text-white/50">Your review means the world to us</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Step: Contact */}
        {step === 'contact' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Step 1 of 3 — Your Details</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">Your Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/70">Mobile Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number"
                  inputMode="numeric" maxLength={10}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
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
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••" inputMode="numeric"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-center text-2xl font-black tracking-widest text-white placeholder:text-white/20 outline-none focus:border-amber-400" />
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

        {/* Step: Review */}
        {step === 'review' && (
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 p-6 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Step 3 of 3 — Your Review</p>

            {/* Rating */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/70">Your Rating</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {/* Review text */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Your Experience</label>
              <textarea value={reviewText} onChange={e => setReview(e.target.value)} rows={4}
                placeholder="Tell us about your experience with Thankam Events…"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400 resize-none" />
            </div>

            {/* Photo (optional) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/70">Add a Photo <span className="font-normal text-white/30">(optional)</span></label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="preview" className="w-full h-36 rounded-xl object-cover" />
                  <button onClick={() => { setPreview(null); setFile(null); }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm text-white/40 hover:border-amber-400/40 hover:text-amber-400/70 transition-colors">
                  <ImagePlus size={16} /> Add event photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <button onClick={() => void handleSubmit()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
              {busy ? 'Submitting…' : 'Submit Review'}
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
                Your review has been submitted and will be published after review.
              </p>
            </div>
            <button onClick={reset}
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
