import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/auth.service';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const result = await authService.forgotPassword(email);
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6] px-4 py-8 sm:px-6">
      {/* Luxury atmospheric ambient radial glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.12)_0%,transparent_45%),radial-gradient(circle_at_80%_80%,rgba(184,134,11,0.08)_0%,transparent_40%)]" />

      <div className="relative w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/80 hover:text-[#080C14] hover:shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-white p-8 sm:p-10 shadow-[0_20px_70px_rgba(8,12,20,0.12)]">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/assets/img/Thankam_Logo.png"
              alt="Thankam Events"
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="block font-serif text-lg font-bold text-[#080C14] leading-none">
                Thankam Events
              </span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.16em] text-[#B8860B] mt-1">
                Account Recovery
              </span>
            </div>
          </div>

          <div className="mb-6">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#B8860B]/25 bg-[#FDF8EB] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#B8860B]">
              <ShieldCheck size={13} className="text-[#B8860B]" /> Staff Recovery
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#080C14]">
              Forgot Password
            </h1>
            <p className="mt-1.5 text-xs text-slate-500">
              Enter your registered staff email address to receive password reset instructions.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm transition-all focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/20"
                  placeholder="admin@thankamevents.in"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading || !email}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#080C14] px-6 text-sm font-bold tracking-wide text-white shadow-md shadow-black/15 transition-all hover:-translate-y-0.5 hover:border-[#F3CA52] hover:bg-black hover:shadow-lg hover:shadow-[#B8860B]/20 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Send Reset Instructions</span>
              )}
            </button>

            <div className="pt-2 text-center text-xs">
              <Link to="/login" className="font-bold text-[#B8860B] hover:text-[#996515] hover:underline">
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
