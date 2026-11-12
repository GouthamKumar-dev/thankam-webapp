import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { loginThunk } from '@/store/slices/auth.slice';
import { loginSchema, LoginSchema } from '@/validations/auth';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (auth.isAuthenticated && auth.user) {
    const home = auth.user.role === 'ADMIN' ? '/admin/dashboard' : '/staff/dashboard';
    return <Navigate to={home} replace />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await dispatch(loginThunk(values)).unwrap();
      toast.success('Login successful');
    } catch {
      toast.error('Invalid credentials');
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6] px-4 py-8 sm:px-6 lg:px-8">
      {/* Luxury atmospheric ambient radial glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(212,175,55,0.12)_0%,transparent_40%),radial-gradient(circle_at_85%_80%,rgba(184,134,11,0.08)_0%,transparent_35%)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#080C14]/5 blur-3xl" />

      <div className="relative w-full max-w-5xl">
        {/* Navigation link back to public site */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/80 hover:text-[#080C14] hover:shadow-sm"
          >
            <ArrowLeft size={14} /> Return to Website
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8860B]">
            Thankam Events • Management Suite
          </span>
        </div>

        {/* Main Dual-Tone Card Container */}
        <div className="relative grid overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-white shadow-[0_20px_70px_rgba(8,12,20,0.12)] backdrop-blur lg:grid-cols-[1.1fr_1fr]">
          
          {/* Left Hero Panel (Obsidian Jet Black & Pure Gold) */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-[#080C14] p-10 text-white lg:flex xl:p-12">
            {/* Background event photography overlay with luxury gold tint */}
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity"
              style={{ backgroundImage: "url('/assets/img/event-marriage.jpg')" }}
            />
            {/* Subtle radial luxury glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(212,175,55,0.2)_0%,transparent_60%)]" />

            <div className="relative z-10">
              {/* Header: Logo & Badge */}
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-3">
                  <img
                    src="/assets/img/Thankam_Logo.png"
                    alt="Thankam Events"
                    className="h-11 w-auto object-contain drop-shadow"
                  />
                  <div>
                    <span className="block font-serif text-xl font-bold tracking-tight text-white leading-none">
                      Thankam Events
                    </span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mt-1">
                      Celebrations Crafted
                    </span>
                  </div>
                </Link>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F5D77F]">
                  <ShieldCheck size={12} className="text-[#F3CA52]" /> Operations
                </span>
              </div>

              {/* Main Headline */}
              <div className="mt-12">
                <h1 className="font-serif text-4xl font-bold leading-[1.15] tracking-tight text-white xl:text-5xl">
                  Centralized Event <br />
                  <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#AA7C11] bg-clip-text text-transparent">
                    Command &amp; Planning
                  </span>
                </h1>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300/90 font-light">
                  Manage menus, event bookings, customer requests, and quotes easily.
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="relative z-10 mt-10 space-y-3.5 border-t border-white/10 pt-8">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#F5D77F] border border-[#D4AF37]/30">
                  <ShieldCheck size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Role-Based Governance</h4>
                  <p className="text-[11px] text-slate-400">Strictly segregated Staff and Administrator permissions with encrypted session control.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#F5D77F] border border-[#D4AF37]/30">
                  <CheckCircle2 size={13} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Real-Time Quotation Engine</h4>
                  <p className="text-[11px] text-slate-400">Itemized pricing, automatic 5% GST calculations, and instant customer approvals.</p>
                </div>
              </div>
            </div>

            {/* Footer Tag */}
            <div className="relative z-10 mt-8 flex items-center justify-between text-[11px] text-slate-500 border-t border-white/5 pt-4">
              <span>© {new Date().getFullYear()} Thankam Events</span>
              <span className="text-[#D4AF37]/80">Est. 2006 • Kollam, Kerala</span>
            </div>
          </div>

          {/* Right Form Panel (Pristine White & Gold Focus) */}
          <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-12">
            <div>
              {/* Mobile-only logo display */}
              <div className="mb-6 flex items-center gap-3 lg:hidden">
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
                    Staff &amp; Admin Portal
                  </span>
                </div>
              </div>

              {/* Eyebrow & Titles */}
              <div className="mb-8">
                <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#B8860B]/25 bg-[#FDF8EB] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#B8860B]">
                  <ShieldCheck size={13} className="text-[#B8860B]" /> Secure Operations Access
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#080C14]">
                  Welcome back
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Sign in with your staff or administrator credentials
                </p>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors"
                    />
                    <Input
                      type="email"
                      placeholder="admin@thankamevents.in"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm transition-all focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/20"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email?.message && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {form.formState.errors.email?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors"
                    />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/60 pl-10 pr-11 text-sm transition-all focus:border-[#B8860B] focus:bg-white focus:ring-2 focus:ring-[#B8860B]/20"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.formState.errors.password?.message && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {form.formState.errors.password?.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-[#B8860B] transition-colors hover:text-[#996515] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={auth.loading}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#080C14] px-6 text-sm font-bold tracking-wide text-white shadow-md shadow-black/15 transition-all hover:-translate-y-0.5 hover:border-[#F3CA52] hover:bg-black hover:shadow-lg hover:shadow-[#B8860B]/20 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {auth.loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} className="text-[#F3CA52]" />
                      <span>Sign In to Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Security Note */}
            <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
              <p>
                Protected by 256-bit SSL Encryption • Thankam Events Platform
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
