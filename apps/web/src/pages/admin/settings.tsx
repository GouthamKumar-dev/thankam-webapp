import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  ImageIcon,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Percent,
  Phone,
  PhoneCall,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setUser } from '@/store/slices/auth.slice';
import { authService } from '@/features/auth/auth.service';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { settingsService, SettingRow } from '@/features/settings/settings.service';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormSkeleton } from '@/components/common/skeleton';
import { uploadService } from '@/features/upload/upload.service';
import { cn } from '@/utils/cn';
import { toMediaUrl } from '@/utils/media-url';

type CompanySetting = {
  app: string;
  name: string;
  legalName: string;
  logoName: string;
  logoUrl: string;
  faviconUrl: string;
  tagline: string;
  contact: string;
  altContact: string;
  email: string;
  website: string;
  gstNumber: string;
  address: string;
  defaultGstPercent?: string;
  defaultTerms?: string;
  authorizedSignatory?: string;
};

const COMPANY_ASSET_MAX_BYTES = 900 * 1024;
const COMPANY_ASSET_TARGET_BYTES = 720 * 1024;

function initialCompanySetting(): CompanySetting {
  return {
    app: 'https://thankamevents.in/admin',
    name: 'THANKAM catering&event\'s',
    legalName: 'Thankam Events & Catering Management',
    logoName: 'Thankam',
    logoUrl: '',
    faviconUrl: '',
    tagline: 'Celebrations Crafted · Premier Catering & Event Management · Kollam',
    contact: '9745684766',
    altContact: '9207606150',
    email: 'info@thankamevents.in',
    website: 'https://thankamevents.in',
    gstNumber: '',
    address: 'Central Kitchen: Chinnakkada, Kollam, Kerala – 691001',
    defaultGstPercent: '18',
    defaultTerms:
      '1. Advance Deposit (50%): Required to confirm date & reserve kitchen slot.\n2. Balance Settlement (50%): Due on event date upon banquet delivery.\n3. Guest Count Policy: Final head count must be locked 72 hours prior.',
    authorizedSignatory: 'For THANKAM catering&event\'s',
  };
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  // Active category tab
  const [activeTab, setActiveTab] = useState<
    'branding' | 'contact' | 'invoicing' | 'profile' | 'advanced'
  >('branding');

  const [rows, setRows] = useState<SettingRow[]>([]);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);
  const [advancedDialogMode, setAdvancedDialogMode] = useState<'create' | 'edit'>('create');
  const [advancedForm, setAdvancedForm] = useState({
    key: '',
    valueText: '{}',
  });
  const [advancedSaving, setAdvancedSaving] = useState(false);

  // Profile & Password states
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Company settings form state
  const [companyForm, setCompanyForm] = useState<CompanySetting>(initialCompanySetting());
  const [loading, setLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState<'logo' | 'favicon' | null>(null);

  // Email delivery test state
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  const refresh = async () => {
    try {
      const settings = await settingsService.list();
      setRows(settings);

      const company = settings.find((row) => row.key === 'company');
      setCompanyForm(normalizeCompanySetting(company?.value));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh().catch(() => toast.error('Failed to load settings'));
    void authService
      .me()
      .then((me) => dispatch(setUser(me)))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name ?? '', phone: user.phone ?? '' });
    }
  }, [user]);

  // Email test action
  const onSendTestEmail = async () => {
    const target = testEmailTarget.trim() || companyForm.email.trim();
    if (!target || !target.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await settingsService.testEmail(target);
      if (res.success) {
        toast.success(`Test email delivered successfully via ${res.method}! Check inbox/spam for ${target}`);
      } else {
        toast.error(`Email delivery failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  // Company settings save action
  const onCompanySave = async () => {
    try {
      setCompanySaving(true);
      await settingsService.upsert('company', buildCompanyPayload(companyForm));
      toast.success('Company settings saved successfully');
      // Notify other components (DashboardLayout, Quotations, Customer Requests)
      window.dispatchEvent(new CustomEvent('thankam:settings-updated'));
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setCompanySaving(false);
    }
  };

  // File upload for Logo or Favicon
  const onCompanyAssetUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'faviconUrl',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setAssetUploading(field === 'logoUrl' ? 'logo' : 'favicon');
      const prevAsset = companyForm[field];
      const uploadFile = await prepareCompanyAssetUpload(file, field);
      const uploaded = await uploadService.uploadOne(uploadFile);
      const absoluteUrl = toMediaUrl(uploaded.url);
      setCompanyForm((prev) => ({ ...prev, [field]: absoluteUrl }));
      if (prevAsset && prevAsset.includes('/uploads/')) {
        void uploadService.deleteFile(prevAsset);
      }
      toast.success(`${field === 'logoUrl' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Failed to upload asset');
    } finally {
      setAssetUploading(null);
    }
  };

  // Profile save action
  const onProfileSave = async () => {
    if (!profile.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      setProfileSaving(true);
      const updated = await authService.updateProfile({
        name: profile.name.trim(),
        phone: profile.phone ? profile.phone.trim() : undefined,
      });

      dispatch(setUser(updated));
      toast.success('Admin profile updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // Password change action
  const onChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    try {
      setPasswordChanging(true);
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to change password');
    } finally {
      setPasswordChanging(false);
    }
  };

  // Advanced settings submit action
  const onAdvancedSettingSubmit = async () => {
    if (!advancedForm.key.trim()) {
      toast.error('Key is required');
      return;
    }
    try {
      setAdvancedSaving(true);
      const parsed = JSON.parse(advancedForm.valueText);
      await settingsService.upsert(advancedForm.key.trim(), parsed);
      toast.success(`Configuration key "${advancedForm.key.trim()}" saved`);
      setAdvancedDialogOpen(false);
      await refresh();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Payload must be valid JSON: ' + error.message);
        return;
      }
      toast.error(error?.response?.data?.message ?? 'Failed to save configuration key');
    } finally {
      setAdvancedSaving(false);
    }
  };

  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(advancedForm.valueText);
      setAdvancedForm((s) => ({ ...s, valueText: JSON.stringify(parsed, null, 2) }));
      toast.success('JSON formatted');
    } catch (err: any) {
      toast.error('Cannot format invalid JSON: ' + err.message);
    }
  };

  // Advanced raw settings columns
  const columns = useMemo<MRT_ColumnDef<SettingRow>[]>(
    () => [
      {
        accessorKey: 'key',
        header: 'Configuration Key',
        Cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {row.original.key}
          </span>
        ),
      },
      {
        id: 'valuePreview',
        header: 'Raw Value Preview',
        accessorFn: (row) => JSON.stringify(row.value),
        Cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-500 line-clamp-1 max-w-xl">
            {JSON.stringify(row.original.value)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-amber-600"
                onClick={() => {
                  setAdvancedForm({
                    key: item.key,
                    valueText: JSON.stringify(item.value, null, 2),
                  });
                  setAdvancedDialogMode('edit');
                  setAdvancedDialogOpen(true);
                }}
                title="Edit configuration key"
              >
                <Edit3 size={13} />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-slate-900"
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(item.value, null, 2));
                  toast.success(`Copied "${item.key}" JSON to clipboard`);
                }}
                title="Copy JSON payload"
              >
                <Copy size={13} />
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  // Computed values for Tab 3 commercial preview
  const gstRateNumber = parseFloat(companyForm.defaultGstPercent || '18') || 0;
  const sampleSubtotal = 100000;
  const sampleGstAmount = (sampleSubtotal * gstRateNumber) / 100;
  const sampleGrandTotal = sampleSubtotal + sampleGstAmount;

  return (
    <PageShell
      title="Settings & Business Configuration"
      subtitle="Manage Thankam Events company identity, official contact details, tax & quotation defaults, and administrator credentials."
    >
      {/* 1. Category Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200/90 pb-3 mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
              activeTab === 'branding'
                ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-900'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 font-semibold shadow-2xs',
            )}
          >
            <Building2 size={14} className={activeTab === 'branding' ? 'text-amber-400' : 'text-slate-400'} />
            <span>Brand Identity & Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
              activeTab === 'contact'
                ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-900'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 font-semibold shadow-2xs',
            )}
          >
            <MapPin size={14} className={activeTab === 'contact' ? 'text-amber-400' : 'text-slate-400'} />
            <span>Contact & Operating Venue</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoicing')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
              activeTab === 'invoicing'
                ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-900'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 font-semibold shadow-2xs',
            )}
          >
            <Receipt size={14} className={activeTab === 'invoicing' ? 'text-amber-400' : 'text-slate-400'} />
            <span>Invoicing, Tax & Agreement Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
              activeTab === 'profile'
                ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-900'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 font-semibold shadow-2xs',
            )}
          >
            <UserRound size={14} className={activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'} />
            <span>My Profile & Security</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
              activeTab === 'advanced'
                ? 'bg-slate-900 text-amber-300 shadow-xs border border-slate-900'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 hover:bg-slate-50 font-semibold shadow-2xs',
            )}
          >
            <Sliders size={14} className={activeTab === 'advanced' ? 'text-amber-400' : 'text-slate-400'} />
            <span>Advanced Keys (JSON)</span>
          </button>
        </div>

        {/* Quick Header Save Action for Company Settings Tabs */}
        {(activeTab === 'branding' || activeTab === 'contact' || activeTab === 'invoicing') && (
          <button
            type="button"
            onClick={() => void onCompanySave()}
            disabled={companySaving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs border border-slate-800 shrink-0"
          >
            {companySaving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>

      {loading ? (
        <FormSkeleton />
      ) : (
        <>
          {/* ───────────────────────────────────────────────────────────
              2. TAB 1: BRAND IDENTITY & LOGO
             ─────────────────────────────────────────────────────────── */}
          {activeTab === 'branding' && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Main Form (8 cols) */}
              <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                {/* Brand Identity & Visuals Card */}
                <Card className="border-slate-200/90 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Brand Identity & Visuals</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Appears on quotations, digital contracts, tax invoices, and the customer portal.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Core Identity
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Brand Display Name" required>
                      <Input
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="e.g. THANKAM catering&event's"
                        className="text-xs font-semibold"
                      />
                    </Field>

                    <Field label="Legal Entity / Registered Name">
                      <Input
                        value={companyForm.legalName}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, legalName: e.target.value }))}
                        placeholder="e.g. Thankam Events & Catering Management"
                        className="text-xs"
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Tagline / Motto">
                        <Input
                          value={companyForm.tagline}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, tagline: e.target.value }))}
                          placeholder="e.g. Celebrations Crafted · Premier Catering & Event Management · Kollam"
                          className="text-xs"
                        />
                      </Field>
                    </div>

                    <Field label="Fallback Short Brand Text">
                      <Input
                        value={companyForm.logoName}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, logoName: e.target.value }))}
                        placeholder="Thankam"
                        className="text-xs font-medium"
                      />
                    </Field>

                    <Field label="Website URL">
                      <Input
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm((s) => ({ ...s, website: e.target.value }))}
                        placeholder="https://thankamevents.in"
                        className="text-xs font-mono"
                      />
                    </Field>
                  </div>
                </Card>

                {/* Brand Graphic Assets Card */}
                <Card className="border-slate-200/90 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Brand Graphic Assets</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        High-resolution logo and browser favicon (PNG, WebP or SVG recommended).
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Max 900 KB
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Logo Upload Box */}
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Company Logo
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Header & PDFs</span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-2xs overflow-hidden">
                          {companyForm.logoUrl ? (
                            <img
                              src={companyForm.logoUrl}
                              alt="Logo Preview"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <ImageIcon size={22} />
                              <span className="text-[9px] font-bold mt-0.5">NO LOGO</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs">
                              <Upload size={13} />
                              <span>{assetUploading === 'logo' ? 'Uploading...' : 'Upload Logo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => void onCompanyAssetUpload(e, 'logoUrl')}
                                className="hidden"
                              />
                            </label>
                            {companyForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prev = companyForm.logoUrl;
                                  setCompanyForm((s) => ({ ...s, logoUrl: '' }));
                                  if (prev && prev.includes('/uploads/')) {
                                    void uploadService.deleteFile(prev);
                                  }
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            PNG or WebP under 900KB
                          </p>
                        </div>
                      </div>

                      <Field label="Direct Logo URL (Optional)">
                        <Input
                          value={companyForm.logoUrl}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, logoUrl: e.target.value }))}
                          placeholder="https://..."
                          className="text-xs font-mono"
                        />
                      </Field>
                    </div>

                    {/* Favicon Upload Box */}
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Browser Favicon
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Browser Tabs</span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-2xs overflow-hidden">
                          {companyForm.faviconUrl ? (
                            <img
                              src={companyForm.faviconUrl}
                              alt="Favicon Preview"
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <Globe size={22} />
                              <span className="text-[9px] font-bold mt-0.5">DEFAULT</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs">
                              <Upload size={13} />
                              <span>{assetUploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => void onCompanyAssetUpload(e, 'faviconUrl')}
                                className="hidden"
                              />
                            </label>
                            {companyForm.faviconUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prev = companyForm.faviconUrl;
                                  setCompanyForm((s) => ({ ...s, faviconUrl: '' }));
                                  if (prev && prev.includes('/uploads/')) {
                                    void uploadService.deleteFile(prev);
                                  }
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Square 32x32 or 64x64 icon
                          </p>
                        </div>
                      </div>

                      <Field label="Direct Favicon URL (Optional)">
                        <Input
                          value={companyForm.faviconUrl}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, faviconUrl: e.target.value }))}
                          placeholder="https://..."
                          className="text-xs font-mono"
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                {/* Save Button Bar */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    Changes apply instantly across quotations, PDFs, and client portal
                  </span>
                  <button
                    type="button"
                    onClick={() => void onCompanySave()}
                    disabled={companySaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs border border-slate-800"
                  >
                    {companySaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Brand Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Live Preview Card (4-5 cols) - Warm Luxury Letterhead Preview */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4 sticky top-6">
                <Card className="border-slate-200/90 shadow-sm p-4 space-y-4 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Eye size={14} className="text-amber-600" />
                      Live Header Preview
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full">
                      Invoice / Quotation
                    </span>
                  </div>

                  {/* Letterhead Paper Representation */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                    {/* Gold Top Accent Line */}
                    <div className="h-1 bg-gradient-to-r from-amber-500 via-[#D4AF37] to-amber-600" />

                    <div className="p-4 space-y-3">
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {companyForm.logoUrl ? (
                            <img
                              src={companyForm.logoUrl}
                              alt="Brand Preview"
                              className="h-12 w-12 object-contain rounded-lg border border-slate-200 p-0.5 shrink-0 bg-white"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-300 font-black text-sm">
                              {companyForm.logoName?.slice(0, 2).toUpperCase() || 'TE'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-serif font-black text-sm text-slate-900 leading-tight truncate">
                              {companyForm.name || 'Thankam Events'}
                            </h4>
                            <p className="text-[9px] font-bold text-amber-700 tracking-wider uppercase mt-0.5 truncate">
                              {companyForm.tagline || 'Celebrations Crafted · Kollam'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 border-l border-slate-100 pl-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block">
                            Quotation Estimate
                          </span>
                          <span className="font-mono text-xs font-black text-slate-900 block mt-0.5">
                            Q-2027-001
                          </span>
                          <span className="text-[9px] text-slate-400 block">
                            Issued: Today
                          </span>
                        </div>
                      </div>

                      {/* Address & Contact Sub-row */}
                      <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500 space-y-0.5">
                        <p className="truncate">
                          <span className="font-medium text-slate-700">Central Base:</span>{' '}
                          {companyForm.address || 'Uliyacovil, Kollam, Kerala – 691001'}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-600">
                          <span>
                            <strong className="text-slate-700">Phone:</strong> +91 {companyForm.contact || '9745684766'}
                            {companyForm.altContact ? ` / +91 ${companyForm.altContact}` : ''}
                          </span>
                          <span>•</span>
                          <span className="truncate">
                            <strong className="text-slate-700">Web:</strong> {companyForm.website || 'thankamevents.in'}
                          </span>
                        </p>
                      </div>

                      {/* Mock Quotation Sections Preview */}
                      <div className="rounded-lg bg-slate-900 text-white p-2.5 text-[10px] space-y-1">
                        <div className="flex justify-between font-bold text-[9px] uppercase tracking-wider text-amber-300">
                          <span>Customer Details</span>
                          <span>Event Specifications</span>
                        </div>
                        <div className="flex justify-between text-slate-300 text-[10px]">
                          <span>Arya Uthaman (9672124665)</span>
                          <span>Sangeet Evening · 150 Guests</span>
                        </div>
                      </div>

                      <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50 flex items-center justify-between text-[10px]">
                        <span className="font-serif font-bold text-slate-800">1. CATERING FOOD MENU</span>
                        <span className="text-[9px] font-bold text-amber-700">25 DISHES · INCLUDED</span>
                      </div>
                    </div>
                  </div>

                  {/* Guidance Box */}
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 text-[11px] text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-800">
                      <Sparkles size={13} className="text-amber-600" />
                      Branding Guidelines & Best Practices
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      • Transparent PNG or WebP images render seamlessly on white PDF contracts and customer receipts.
                    </p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      • Brand Name and Contact details are automatically mapped to all generated PDF quotation proposals.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              3. TAB 2: CONTACT & OPERATING VENUE
             ─────────────────────────────────────────────────────────── */}
          {activeTab === 'contact' && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Main Contact Form (8 cols) */}
              <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                <Card className="border-slate-200/90 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Official Communication & Base Location</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Contact numbers, email, and address printed on client invoices, contracts, and proposals.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Client Facing
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Primary Business Phone" required>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={companyForm.contact}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, contact: e.target.value }))}
                          placeholder="9745684766"
                          className="pl-9 text-xs font-mono font-semibold"
                        />
                      </div>
                    </Field>

                    <Field label="Alternate / Secondary Phone">
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={companyForm.altContact}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, altContact: e.target.value }))}
                          placeholder="9207606150"
                          className="pl-9 text-xs font-mono"
                        />
                      </div>
                    </Field>

                    <Field label="Official Support Email" required>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="email"
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, email: e.target.value }))}
                          placeholder="info@thankamevents.in"
                          className="pl-9 text-xs"
                        />
                      </div>
                    </Field>

                    <Field label="Admin Portal URL">
                      <div className="relative">
                        <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={companyForm.app}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, app: e.target.value }))}
                          placeholder="https://thankamevents.in/admin"
                          className="pl-9 text-xs font-mono"
                        />
                      </div>
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Operating Address & Base Location" required>
                        <Textarea
                          value={companyForm.address}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))}
                          placeholder="Central Kitchen: Chinnakkada, Kollam, Kerala – 691001"
                          className="min-h-[90px] text-xs leading-relaxed"
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                {/* Email Delivery Diagnostics Box */}
                <Card className="border-amber-200/90 bg-amber-50/40 shadow-2xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                      <Send size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Transactional Email Pipeline Test
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Dispatches a live verification message via the primary MSG91 gateway (with Hostinger SMTP fallback).
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <Input
                      type="email"
                      placeholder="Enter email to receive test message (e.g. personal email)"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      className="text-xs h-9 bg-white border-amber-200 flex-1"
                    />
                    {companyForm.email && testEmailTarget !== companyForm.email && (
                      <button
                        type="button"
                        onClick={() => setTestEmailTarget(companyForm.email)}
                        className="text-[11px] text-amber-800 hover:text-amber-900 underline font-semibold whitespace-nowrap px-1"
                      >
                        Use Official Email
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onSendTestEmail()}
                      disabled={testingEmail}
                      className="inline-flex items-center gap-1.5 shrink-0 h-9 px-4 text-xs font-bold bg-slate-900 text-amber-300 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-xs disabled:opacity-50"
                    >
                      {testingEmail ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Dispatching Test...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Send Test Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </Card>

                {/* Save Button Bar */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium">
                    Updates customer inquiry footers, quotation headers, and WhatsApp links.
                  </span>
                  <button
                    type="button"
                    onClick={() => void onCompanySave()}
                    disabled={companySaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs border border-slate-800"
                  >
                    {companySaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Contact Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Contact Card Preview */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4 sticky top-6">
                <Card className="border-slate-200/90 shadow-sm p-4 space-y-4 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <PhoneCall size={14} className="text-amber-600" />
                      Client Contact Card Preview
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                      Live Preview
                    </span>
                  </div>

                  {/* Contact Preview Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-300 font-black text-xs">
                        TE
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 leading-tight truncate">
                          {companyForm.name || 'Thankam Events'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {companyForm.address.split(',')[0] || 'Kollam, Kerala'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200/70 text-xs text-slate-700">
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-amber-700" />
                        <span className="font-mono font-bold">{companyForm.contact || '9745684766'}</span>
                        {companyForm.altContact && (
                          <span className="text-slate-400 font-mono">/ {companyForm.altContact}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400" />
                        <span className="truncate">{companyForm.email || 'info@thankamevents.in'}</span>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-600 leading-relaxed">
                          {companyForm.address || 'Central Kitchen: Chinnakkada, Kollam, Kerala'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href={companyForm.website || 'https://thankamevents.in'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline"
                      >
                        <Globe size={12} />
                        <span>Visit {companyForm.website || 'thankamevents.in'}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              4. TAB 3: INVOICING, TAX & AGREEMENT DEFAULTS
             ─────────────────────────────────────────────────────────── */}
          {activeTab === 'invoicing' && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Main Invoicing Form (8 cols) */}
              <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                <Card className="border-slate-200/90 shadow-2xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Invoicing, GST & Agreement Terms</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Default tax calculations, GSTIN registration, and standard payment policy boilerplate.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Contracts & Taxes
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="GST / Tax Identification Number (GSTIN)">
                      <div className="relative">
                        <Receipt size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={companyForm.gstNumber}
                          onChange={(e) =>
                            setCompanyForm((s) => ({ ...s, gstNumber: e.target.value.toUpperCase() }))
                          }
                          placeholder="32AAAAA0000A1Z5"
                          className="pl-9 text-xs font-mono uppercase"
                          maxLength={15}
                        />
                      </div>
                    </Field>

                    <Field label="Default GST Rate (%)">
                      <div className="relative">
                        <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="number"
                          value={companyForm.defaultGstPercent || '18'}
                          onChange={(e) =>
                            setCompanyForm((s) => ({ ...s, defaultGstPercent: e.target.value }))
                          }
                          placeholder="18"
                          className="pl-9 text-xs font-mono"
                        />
                      </div>
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Authorized Signatory Label">
                        <Input
                          value={companyForm.authorizedSignatory || "For THANKAM catering&event's"}
                          onChange={(e) =>
                            setCompanyForm((s) => ({ ...s, authorizedSignatory: e.target.value }))
                          }
                          placeholder="e.g. For THANKAM catering&event's"
                          className="text-xs font-semibold"
                        />
                      </Field>
                    </div>

                    <div className="sm:col-span-2">
                      <Field label="Standard Agreement Payment Terms & Booking Notes">
                        <Textarea
                          value={companyForm.defaultTerms || ''}
                          onChange={(e) => setCompanyForm((s) => ({ ...s, defaultTerms: e.target.value }))}
                          placeholder="e.g. 50% advance on confirmation, 50% on event date morning..."
                          className="min-h-[120px] text-xs leading-relaxed font-mono"
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                {/* Save Button Bar */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs text-slate-500 font-medium">
                    Applied automatically as defaults when drafting new quotations and invoices.
                  </span>
                  <button
                    type="button"
                    onClick={() => void onCompanySave()}
                    disabled={companySaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs border border-slate-800"
                  >
                    {companySaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save Invoicing Defaults</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Live Tax & Commercial Calculation Preview */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4 sticky top-6">
                <Card className="border-slate-200/90 shadow-sm p-4 space-y-4 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Receipt size={14} className="text-amber-600" />
                      Commercial Estimate Preview
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-full">
                      Auto-Calculated
                    </span>
                  </div>

                  {/* Sample Calculation Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Sample Catering Subtotal:</span>
                      <span className="font-mono font-semibold">₹1,00,000.00</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>
                        GST Rate ({companyForm.defaultGstPercent || '18'}%
                        {companyForm.gstNumber ? ` · ${companyForm.gstNumber}` : ''}):
                      </span>
                      <span className="font-mono font-semibold">
                        ₹{sampleGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Total Estimated Proposal:</span>
                      <span className="font-mono text-amber-700">
                        ₹{sampleGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Signatory Box Representation */}
                  <div className="rounded-xl border border-dashed border-slate-300 p-3.5 space-y-2 bg-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Contract Signatory Box
                    </span>
                    <p className="font-serif font-black text-xs text-slate-800">
                      {companyForm.authorizedSignatory || "For THANKAM catering&event's"}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      <ShieldCheck size={12} />
                      <span>Digital Agreement Verification Seal</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              5. TAB 4: MY PROFILE & SECURITY
             ─────────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
              {/* Profile Card */}
              <Card className="border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70">
                      <UserRound size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Administrator Profile</h3>
                      <p className="text-xs text-slate-400">Personal administrator name and direct phone</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {user?.role ?? 'ADMIN'}
                  </span>
                </div>

                <div className="space-y-4">
                  <Field label="Full Display Name" required>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile((s) => ({ ...s, name: e.target.value }))}
                      placeholder="e.g. Sivakumar R"
                      className="text-xs font-semibold"
                    />
                  </Field>

                  <Field label="Email Address (System Primary)">
                    <div className="relative">
                      <Input
                        value={user?.email ?? ''}
                        disabled
                        className="text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                      <ShieldCheck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Primary login email cannot be changed directly for security audit reasons.
                    </p>
                  </Field>

                  <Field label="Direct Phone">
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="9745684766"
                        className="pl-9 text-xs font-mono"
                      />
                    </div>
                  </Field>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => void onProfileSave()}
                      disabled={profileSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
                    >
                      {profileSaving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Update Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>

              {/* Password Card */}
              <Card className="border-slate-200/90 shadow-2xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/70">
                    <KeyRound size={17} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Password & Security</h3>
                    <p className="text-xs text-slate-400">Keep account protected with 8+ characters</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="Current Password" required>
                    <div className="relative">
                      <Input
                        type={showPassword.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))
                        }
                        placeholder="Enter current password"
                        className="text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((p) => ({ ...p, current: !p.current }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.current ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="New Password" required>
                    <div className="relative">
                      <Input
                        type={showPassword.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))
                        }
                        placeholder="Min. 8 characters"
                        className="text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => ({ ...p, new: !p.new }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.new ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm New Password" required>
                    <div className="relative">
                      <Input
                        type={showPassword.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))
                        }
                        placeholder="Re-enter new password"
                        className="text-xs pr-9"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((p) => ({ ...p, confirm: !p.confirm }))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>

                  {/* Password Match Status Hints */}
                  {passwordForm.newPassword && (
                    <div className="text-[11px] space-y-1 pt-1">
                      <p
                        className={cn(
                          'flex items-center gap-1.5 font-medium',
                          passwordForm.newPassword.length >= 8
                            ? 'text-emerald-600'
                            : 'text-amber-600',
                        )}
                      >
                        {passwordForm.newPassword.length >= 8 ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        <span>Minimum 8 characters</span>
                      </p>
                      {passwordForm.confirmPassword && (
                        <p
                          className={cn(
                            'flex items-center gap-1.5 font-medium',
                            passwordForm.newPassword === passwordForm.confirmPassword
                              ? 'text-emerald-600'
                              : 'text-rose-600',
                          )}
                        >
                          {passwordForm.newPassword === passwordForm.confirmPassword ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          )}
                          <span>
                            {passwordForm.newPassword === passwordForm.confirmPassword
                              ? 'Passwords match'
                              : 'Passwords do not match'}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => void onChangePassword()}
                      disabled={passwordChanging}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-all shadow-xs disabled:opacity-50"
                    >
                      {passwordChanging ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} />
                          <span>Change Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────
              6. TAB 5: ADVANCED SYSTEM SETTINGS (JSON)
             ─────────────────────────────────────────────────────────── */}
          {activeTab === 'advanced' && (
            <Card className="border-slate-200/90 shadow-2xs space-y-4 p-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Advanced Configuration Store</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Low-level key-value JSON configurations managed by the backend engine.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdvancedForm({ key: '', valueText: '{\n  \n}' });
                    setAdvancedDialogMode('create');
                    setAdvancedDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 border border-slate-800 transition-all shadow-xs"
                >
                  <Plus size={14} />
                  <span>Add Custom Key</span>
                </button>
              </div>

              <DataTable columns={columns} data={rows} />
            </Card>
          )}
        </>
      )}

      {/* Advanced Key Dialog */}
      <FormDialog
        title={advancedDialogMode === 'create' ? 'Add Configuration Key' : 'Edit Configuration Key'}
        description="Manage low-level system settings JSON. Make sure syntax is valid JSON."
        open={advancedDialogOpen}
        onOpenChange={setAdvancedDialogOpen}
      >
        <div className="space-y-4">
          <Field label="Configuration Key" required>
            <Input
              value={advancedForm.key}
              disabled={advancedDialogMode === 'edit'}
              placeholder="e.g. integrations or features"
              onChange={(e) => setAdvancedForm((s) => ({ ...s, key: e.target.value }))}
              className="text-xs font-mono"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                JSON Value Payload <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePrettifyJson}
                className="text-[11px] text-amber-800 hover:text-amber-900 font-bold hover:underline"
              >
                Format / Prettify JSON
              </button>
            </div>
            <Textarea
              className="min-h-[220px] font-mono text-xs leading-relaxed"
              value={advancedForm.valueText}
              onChange={(e) => setAdvancedForm((s) => ({ ...s, valueText: e.target.value }))}
            />
          </div>

          <FormDialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="h-8 rounded-xl text-xs"
              onClick={() => setAdvancedDialogOpen(false)}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={advancedSaving}
              onClick={() => void onAdvancedSettingSubmit()}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-amber-300 hover:bg-slate-800 border border-slate-800 disabled:opacity-50"
            >
              {advancedSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>Save Key</span>
                </>
              )}
            </button>
          </FormDialogFooter>
        </div>
      </FormDialog>
    </PageShell>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function normalizeCompanySetting(value?: Record<string, unknown>): CompanySetting {
  const base = initialCompanySetting();
  if (!value) return base;
  return {
    app: sanitizeCompanyAppUrl(String(value.app ?? base.app)),
    name: String(value.name ?? base.name),
    legalName: String(value.legalName ?? base.legalName),
    logoName: String(value.logoName ?? base.logoName),
    logoUrl: String(value.logoUrl ?? ''),
    faviconUrl: String(value.faviconUrl ?? ''),
    tagline: String(value.tagline ?? base.tagline),
    contact: String(value.contact ?? base.contact),
    altContact: String(value.altContact ?? base.altContact),
    email: String(value.email ?? base.email),
    website: String(value.website ?? base.website),
    gstNumber: String(value.gstNumber ?? ''),
    address: String(value.address ?? base.address),
    defaultGstPercent: String(value.defaultGstPercent ?? base.defaultGstPercent),
    defaultTerms: String(value.defaultTerms ?? base.defaultTerms),
    authorizedSignatory: String(value.authorizedSignatory ?? base.authorizedSignatory),
  };
}

function sanitizeCompanyAppUrl(url: string) {
  const normalized = url.trim();
  if (!normalized || normalized === 'https://app.thankamevents.in') {
    return 'https://thankamevents.in/admin';
  }
  return normalized;
}

function buildCompanyPayload(form: CompanySetting) {
  return {
    app: sanitizeCompanyAppUrl(form.app),
    name: form.name.trim(),
    legalName: form.legalName.trim(),
    logoName: form.logoName.trim(),
    logoUrl: form.logoUrl.trim(),
    faviconUrl: form.faviconUrl.trim(),
    tagline: form.tagline.trim(),
    contact: form.contact.trim(),
    altContact: form.altContact.trim(),
    email: form.email.trim(),
    website: form.website.trim(),
    gstNumber: form.gstNumber.trim(),
    address: form.address.trim(),
    defaultGstPercent: form.defaultGstPercent?.trim() || '18',
    defaultTerms: form.defaultTerms?.trim(),
    authorizedSignatory: form.authorizedSignatory?.trim() || "For THANKAM catering&event's",
  };
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

async function prepareCompanyAssetUpload(
  file: File,
  field: 'logoUrl' | 'faviconUrl',
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  if (file.size <= COMPANY_ASSET_MAX_BYTES) {
    return file;
  }

  const optimized = await compressImageForCompanyAsset(file, field);
  if (optimized.size <= COMPANY_ASSET_MAX_BYTES) {
    return optimized;
  }

  throw new Error(
    `Selected file is ${formatFileSize(file.size)}. Please use a smaller image (under ${formatFileSize(
      COMPANY_ASSET_MAX_BYTES,
    )}).`,
  );
}

async function compressImageForCompanyAsset(
  file: File,
  field: 'logoUrl' | 'faviconUrl',
): Promise<File> {
  const source = await readFileAsImage(file);
  const maxEdge = field === 'logoUrl' ? 1200 : 512;
  const { width, height } = fitWithin(source.naturalWidth, source.naturalHeight, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to process image. Please try another file.');

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const qualitySteps = [0.9, 0.84, 0.78, 0.72, 0.66, 0.6];
  let bestBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (!blob) continue;
    bestBlob = blob;
    if (blob.size <= COMPANY_ASSET_TARGET_BYTES) break;
  }

  if (!bestBlob) {
    throw new Error('Unable to optimize image. Please upload a smaller file.');
  }

  return new File([bestBlob], toWebpFileName(file.name), {
    type: bestBlob.type || 'image/webp',
    lastModified: Date.now(),
  });
}

function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read image file'));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function fitWithin(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) return { width, height };
  const ratio = width / height;
  if (ratio >= 1) {
    return { width: maxEdge, height: Math.max(1, Math.round(maxEdge / ratio)) };
  }
  return { width: Math.max(1, Math.round(maxEdge * ratio)), height: maxEdge };
}

function toWebpFileName(fileName: string) {
  const name = fileName.replace(/\.[^.]+$/, '');
  return `${name || 'asset'}.webp`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
