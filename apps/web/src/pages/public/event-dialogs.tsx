import { Camera, CheckCircle2, ChevronRight, ImagePlus, Loader2, RefreshCw, Star, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { eventPortalService } from '@/features/event-media/event-media.service';

/* ── shared OTP step types ── */
type Step = 'contact' | 'otp' | 'upload' | 'done';

/* ── shared dialog shell ── */
function DialogShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,27,60,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#0F1B3C] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/60 hover:bg-white/20"
        >
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* shared step indicator */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i}
          className="h-1 flex-1 rounded-full transition-all"
          style={{ background: i < current ? '#F0C040' : i === current ? '#B8860B' : 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   SELFIE DIALOG
═══════════════════════════════════════ */
export function SelfieDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep]       = useState<Step>('contact');
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [token, setToken]     = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [busy, setBusy]       = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);

  const requestOtp = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    const p = phone.replace(/\D/g, '');
    if (p.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setBusy(true);
    try {
      await eventPortalService.requestOtp(p);
      toast.success('OTP sent');
      setPhone(p); setStep('otp');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { toast.error('Enter the OTP'); return; }
    setBusy(true);
    try {
      const res = await eventPortalService.verifyOtp(phone, otp, name) as any;
      setToken(res.token ?? res.accessToken ?? '');
      setStep('upload');
    } catch (e: any) { toast.error(e?.message ?? 'Invalid OTP'); }
    finally { setBusy(false); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) { toast.error('Please select a photo'); return; }
    setBusy(true);
    try {
      await eventPortalService.submitSelfie(token, { customerName: name, imageFile: file });
      setStep('done');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to upload'); }
    finally { setBusy(false); }
  };

  return (
    <DialogShell onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400">
            <Camera size={20} className="text-[#0F1B3C]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Community</p>
            <p className="text-base font-black text-white">Selfie Point</p>
          </div>
        </div>

        {step !== 'done' && <StepDots current={['contact','otp','upload'].indexOf(step)} total={3} />}

        {/* Step 1 */}
        {step === 'contact' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/50 mb-4">Enter your details to get started</p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Mobile Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number"
                inputMode="numeric" maxLength={10}
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
            </div>
            <button onClick={() => void requestOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60 mt-2">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-xs text-white/50">OTP sent to +91 {phone}</p>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •" inputMode="numeric"
              className="h-14 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-center text-3xl font-black tracking-[0.4em] text-white placeholder:text-white/20 outline-none focus:border-amber-400" />
            <button onClick={() => void verifyOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button onClick={() => { setStep('contact'); setOtp(''); }}
              className="flex w-full items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70">
              <RefreshCw size={11} /> Change number
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-white/50">Upload your selfie</p>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="w-full aspect-square rounded-2xl object-cover" />
                <button onClick={() => { setPreview(null); setFile(null); }}
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/20 py-8 hover:border-amber-400/50 transition-colors">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                  <Camera size={22} className="text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-white/70">Tap to take / choose photo</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <button onClick={() => void submit()} disabled={!file || busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
              {busy ? 'Uploading…' : 'Submit Selfie'}
            </button>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
            <div>
              <p className="text-lg font-black text-white">Thank You, {name}!</p>
              <p className="mt-1 text-sm text-white/50">Your selfie has been submitted for review.</p>
            </div>
            <button onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300">
              Done
            </button>
          </div>
        )}
      </div>
    </DialogShell>
  );
}

/* ═══════════════════════════════════════
   STAR RATING
═══════════════════════════════════════ */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)} className="transition-transform hover:scale-110">
          <Star size={26} className={(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-white/20 fill-white/10'} />
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   REVIEW DIALOG
═══════════════════════════════════════ */
export function ReviewDialog({ onClose }: { onClose: () => void }) {
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

  const requestOtp = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    const p = phone.replace(/\D/g, '');
    if (p.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setBusy(true);
    try {
      await eventPortalService.requestOtp(p);
      toast.success('OTP sent'); setPhone(p); setStep('otp');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to send OTP'); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) { toast.error('Enter the OTP'); return; }
    setBusy(true);
    try {
      const res = await eventPortalService.verifyOtp(phone, otp, name) as any;
      setToken(res.token ?? res.accessToken ?? '');
      setStep('upload');
    } catch (e: any) { toast.error(e?.message ?? 'Invalid OTP'); }
    finally { setBusy(false); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setFile(f); setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!reviewText.trim()) { toast.error('Please write your review'); return; }
    setBusy(true);
    try {
      await eventPortalService.submitReview(token, { customerName: name, reviewText: reviewText.trim(), rating, imageFile: file });
      setStep('done');
    } catch (e: any) { toast.error(e?.message ?? 'Failed to submit'); }
    finally { setBusy(false); }
  };

  return (
    <DialogShell onClose={onClose}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400">
            <Star size={20} className="fill-[#0F1B3C] text-[#0F1B3C]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Community</p>
            <p className="text-base font-black text-white">Share Your Review</p>
          </div>
        </div>

        {step !== 'done' && <StepDots current={['contact','otp','upload'].indexOf(step)} total={3} />}

        {/* Step 1 */}
        {step === 'contact' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/50 mb-4">Enter your details to continue</p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Mobile Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number"
                inputMode="numeric" maxLength={10}
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400" />
            </div>
            <button onClick={() => void requestOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60 mt-2">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-xs text-white/50">OTP sent to +91 {phone}</p>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="• • • • • •" inputMode="numeric"
              className="h-14 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-center text-3xl font-black tracking-[0.4em] text-white placeholder:text-white/20 outline-none focus:border-amber-400" />
            <button onClick={() => void verifyOtp()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button onClick={() => { setStep('contact'); setOtp(''); }}
              className="flex w-full items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70">
              <RefreshCw size={11} /> Change number
            </button>
          </div>
        )}

        {/* Step 3 — review form */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Rating */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">Your Rating</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>

            {/* Review text */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Your Experience *</label>
              <textarea value={reviewText} onChange={e => setReview(e.target.value)} rows={3}
                placeholder="Tell us about your experience…"
                className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-amber-400 resize-none" />
            </div>

            {/* Photo optional */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/60">Photo <span className="font-normal text-white/30">(optional)</span></label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="" className="w-full h-28 rounded-xl object-cover" />
                  <button onClick={() => { setPreview(null); setFile(null); }}
                    className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm text-white/40 hover:border-amber-400/40 hover:text-amber-400/70 transition-colors">
                  <ImagePlus size={15} /> Add event photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <button onClick={() => void submit()} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300 disabled:opacity-60">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} />}
              {busy ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
            <div>
              <p className="text-lg font-black text-white">Thank You, {name}!</p>
              <p className="mt-1 text-sm text-white/50">Your review will appear after approval.</p>
            </div>
            <button onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-bold text-[#0F1B3C] hover:bg-amber-300">
              Done
            </button>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
