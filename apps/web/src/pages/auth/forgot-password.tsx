import { Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg bg-white/90">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <ShieldCheck size={13} /> Account Recovery
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Forgot Password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email to generate reset instructions.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
            </div>
          </div>

          <Button className="h-11 w-full" onClick={() => void submit()} disabled={loading || !email}>
            {loading ? 'Generating...' : 'Send Reset Instructions'}
          </Button>

          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
