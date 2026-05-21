import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_86%_0%,rgba(14,116,144,0.13),transparent_26%)]" />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-white/85 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden bg-gradient-to-br from-slate-950 via-teal-950 to-cyan-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles size={13} /> Event Operations
            </p>
            <h1 className="text-5xl font-extrabold leading-tight">Thankam Events Management</h1>
            <p className="mt-5 max-w-md text-sm text-cyan-100/95">
              Centralize categories, menu planning, media workflows, and client-ready quotation generation in one modern workspace.
            </p>
          </div>

          <div className="space-y-3 text-sm text-cyan-100">
            <p className="inline-flex items-center gap-2"><ShieldCheck size={15} /> Role-based secure access</p>
            <p className="inline-flex items-center gap-2"><Lock size={15} /> JWT + refresh token auth</p>
          </div>
        </div>

        <div className="p-7 md:p-10">
          <Card className="border-none p-0 shadow-none">
            <div className="mb-8">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                <ShieldCheck size={13} /> Secure Login
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
              <p className="text-sm text-slate-500">Sign in with your staff or admin account</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Email</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type="email" className="pl-9" {...form.register('email')} />
                </div>
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.email?.message}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">Password</label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    className="pl-9 pr-10"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-red-600">{form.formState.errors.password?.message}</p>
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button className="h-11 w-full" disabled={auth.loading}>
                {auth.loading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
