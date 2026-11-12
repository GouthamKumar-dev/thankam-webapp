import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import {
  Building2,
  Check,
  CheckCircle2,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  ImageIcon,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  Receipt,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Upload,
  UserRound,
  X,
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

const COMPANY_ASSET_MAX_BYTES = 900 * 1024; // Keep below common 1 MB proxy limits
const COMPANY_ASSET_TARGET_BYTES = 720 * 1024;

function initialCompanySetting(): CompanySetting {
  return {
    app: 'https://thankamevents.in/admin',
    name: "THANKAM catering&event's",
    legalName: 'Thankam Events & Catering Management',
    logoName: 'Thankam',
    logoUrl: '',
    faviconUrl: '',
    tagline: 'Celebrations Crafted · Premier Catering & Event Management · Kollam',
    contact: '9745684766',
    altContact: '',
    email: 'info@thankamevents.in',
    website: 'https://thankamevents.in',
    gstNumber: '',
    address: 'Uliyacovil, Kollam, Kerala – 691001',
    defaultGstPercent: '18',
    defaultTerms: '50% advance on confirmation, 40% on event date morning, 10% upon event completion.',
    authorizedSignatory: "For THANKAM catering&event's",
  };
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  // Active category tab: 'branding' | 'contact' | 'invoicing' | 'profile' | 'advanced'
  const [activeTab, setActiveTab] = useState<
    'branding' | 'contact' | 'invoicing' | 'profile' | 'advanced'
  >('branding');

  const [rows, setRows] = useState<SettingRow[]>([]);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);
  const [advancedForm, setAdvancedForm] = useState({
    key: '',
    valueText: '{}',
  });

  // Profile & Password forms
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Company settings form
  const [companyForm, setCompanyForm] = useState<CompanySetting>(initialCompanySetting());
  const [companySaving, setCompanySaving] = useState(false);
  const [assetUploading, setAssetUploading] = useState<'logo' | 'favicon' | null>(null);

  const refresh = async () => {
    const settings = await settingsService.list();
    setRows(settings);

    const company = settings.find((row) => row.key === 'company');
    setCompanyForm(normalizeCompanySetting(company?.value));
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

  // Advanced raw settings columns
  const columns = useMemo<MRT_ColumnDef<SettingRow>[]>(
    () => [
      {
        accessorKey: 'key',
        header: 'Configuration Key',
        Cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
            {row.original.key}
          </span>
        ),
      },
      {
        id: 'valuePreview',
        header: 'Raw Value JSON',
        accessorFn: (row) => JSON.stringify(row.value),
        Cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-500 line-clamp-1 max-w-md">
            {JSON.stringify(row.original.value)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => (
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-[#B8860B]"
            onClick={() => {
              const item = row.original;
              setAdvancedForm({
                key: item.key,
                valueText: JSON.stringify(item.value, null, 2),
              });
              setAdvancedDialogOpen(true);
            }}
            title="Edit configuration key"
          >
            <Edit3 size={14} />
          </Button>
        ),
      },
    ],
    [],
  );

  const onCompanySave = async () => {
    try {
      setCompanySaving(true);
      await settingsService.upsert('company', buildCompanyPayload(companyForm));
      toast.success('Company branding & business settings saved');
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to save settings');
    } finally {
      setCompanySaving(false);
    }
  };

  const onCompanyAssetUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'logoUrl' | 'faviconUrl',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setAssetUploading(field === 'logoUrl' ? 'logo' : 'favicon');
      const uploadFile = await prepareCompanyAssetUpload(file, field);
      const uploaded = await uploadService.uploadOne(uploadFile);
      const absoluteUrl = toMediaUrl(uploaded.url);
      setCompanyForm((prev) => ({ ...prev, [field]: absoluteUrl }));
      toast.success(`${field === 'logoUrl' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Failed to upload asset');
    } finally {
      setAssetUploading(null);
    }
  };

  const onProfileSave = async () => {
    try {
      const updated = await authService.updateProfile({
        name: profile.name.trim(),
        phone: profile.phone ? profile.phone.trim() : undefined,
      });

      dispatch(setUser(updated));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to update profile');
    }
  };

  const onChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to change password');
    }
  };

  const onAdvancedSettingSubmit = async () => {
    try {
      const parsed = JSON.parse(advancedForm.valueText);
      await settingsService.upsert(advancedForm.key, parsed);
      toast.success(`Setting "${advancedForm.key}" saved`);
      setAdvancedDialogOpen(false);
      await refresh();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Value must be valid JSON');
        return;
      }
      toast.error(error?.response?.data?.message ?? 'Failed to save setting');
    }
  };

  return (
    <PageShell
      title="Settings & Business Configuration"
      subtitle="Manage Thankam Events company identity, official contact details, tax & quotation defaults, and administrator credentials."
    >
      {/* 1. Category Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 pb-3 mb-6 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'branding'
              ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200',
          )}
        >
          <Building2 size={14} />
          <span>Brand Identity & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'contact'
              ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200',
          )}
        >
          <MapPin size={14} />
          <span>Contact & Operating Venue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoicing')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'invoicing'
              ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200',
          )}
        >
          <Receipt size={14} />
          <span>Invoicing, Tax & Agreement Defaults</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'profile'
              ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200',
          )}
        >
          <UserRound size={14} />
          <span>My Profile & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap',
            activeTab === 'advanced'
              ? 'bg-[#080C14] text-[#F3CA52] shadow-xs border border-[#D4AF37]/50'
              : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200',
          )}
        >
          <Sliders size={14} />
          <span>Advanced Keys (JSON)</span>
        </button>
      </div>

      {/* 2. TAB 1: BRAND IDENTITY & LOGO */}
      {activeTab === 'branding' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Form (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            <Card className="border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Brand Identity & Visuals</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Appears on quotations, digital contracts, tax invoices, and the customer portal.
                </p>
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
                    placeholder="Used when logo image is unavailable"
                    className="text-xs"
                  />
                </Field>

                <Field label="Website URL">
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm((s) => ({ ...s, website: e.target.value }))}
                    placeholder="https://thankamevents.in"
                    className="text-xs"
                  />
                </Field>
              </div>
            </Card>

            {/* Logo & Favicon Assets */}
            <Card className="border-slate-200/90 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Brand Graphic Assets</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload high-resolution logos (PNG or WebP with transparent background recommended).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Logo Upload Box */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Company Logo
                  </span>

                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-xs overflow-hidden">
                      {companyForm.logoUrl ? (
                        <img
                          src={companyForm.logoUrl}
                          alt="Logo Preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs">
                        <Upload size={13} />
                        <span>{assetUploading === 'logo' ? 'Uploading...' : 'Upload Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void onCompanyAssetUpload(e, 'logoUrl')}
                          className="hidden"
                        />
                      </label>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Browser Favicon
                  </span>

                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-xs overflow-hidden">
                      {companyForm.faviconUrl ? (
                        <img
                          src={companyForm.faviconUrl}
                          alt="Favicon Preview"
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <Globe size={24} className="text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs">
                        <Upload size={13} />
                        <span>{assetUploading === 'favicon' ? 'Uploading...' : 'Upload Favicon'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void onCompanyAssetUpload(e, 'faviconUrl')}
                          className="hidden"
                        />
                      </label>
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
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs text-slate-400">
                Changes apply instantly across quotations, PDFs, and client portal
              </span>
              <button
                type="button"
                onClick={() => void onCompanySave()}
                disabled={companySaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-5 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] disabled:opacity-50 transition-all shadow-xs"
              >
                <Check size={14} />
                <span>{companySaving ? 'Saving...' : 'Save Brand Settings'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview Card (4 cols) */}
          <div className="space-y-4 lg:col-span-4">
            <div className="sticky top-6 rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#080C14] to-[#121927] p-5 text-white shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <Sparkles size={13} /> Live Header Preview
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                  Invoice / Quote
                </span>
              </div>

              {/* Preview Box */}
              <div className="rounded-xl bg-white p-4 text-slate-900 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  {companyForm.logoUrl ? (
                    <img
                      src={companyForm.logoUrl}
                      alt="Brand Preview"
                      className="h-10 w-10 object-contain rounded border border-slate-200 p-0.5"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#080C14] text-[#F3CA52] font-black text-xs">
                      {companyForm.logoName.slice(0, 2).toUpperCase() || 'TE'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 leading-tight truncate">
                      {companyForm.name || "THANKAM catering&event's"}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">
                      {companyForm.address.split(',')[0] || 'Kollam'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone size={11} className="text-[#B8860B]" />
                    <span className="font-mono">{companyForm.contact || '9745684766'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail size={11} className="text-slate-400" />
                    <span className="truncate">{companyForm.email || 'info@thankamevents.in'}</span>
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-300">Branding Guidelines:</p>
                <p>• Clean high-contrast logo renders best on client agreement PDFs.</p>
                <p>• Display name matches official Kerala tax invoice registrations.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: CONTACT & OPERATING VENUE */}
      {activeTab === 'contact' && (
        <Card className="max-w-4xl border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Official Communication & Venue Location</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Contact numbers and venue address printed on client invoices and receipts.
            </p>
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
                  placeholder="+91..."
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
                  placeholder="Uliyacovil, Kollam, Kerala – 691001"
                  className="min-h-[90px] text-xs"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void onCompanySave()}
              disabled={companySaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-5 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] disabled:opacity-50 transition-all shadow-xs"
            >
              <Check size={14} />
              <span>{companySaving ? 'Saving...' : 'Save Contact Details'}</span>
            </button>
          </div>
        </Card>
      )}

      {/* 4. TAB 3: INVOICING, TAX & AGREEMENT DEFAULTS */}
      {activeTab === 'invoicing' && (
        <Card className="max-w-4xl border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Invoicing, GST & Agreement Terms</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Default tax calculations and legal agreement boilerplate for event bookings.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GST / Tax Identification Number (GSTIN)">
              <div className="relative">
                <Receipt size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={companyForm.gstNumber}
                  onChange={(e) => setCompanyForm((s) => ({ ...s, gstNumber: e.target.value }))}
                  placeholder="32AAAAA0000A1Z5"
                  className="pl-9 text-xs font-mono uppercase"
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
                  placeholder="e.g. 50% advance on confirmation, 40% on event date morning, 10% upon event completion."
                  className="min-h-[110px] text-xs leading-relaxed"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void onCompanySave()}
              disabled={companySaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-5 py-2.5 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927] disabled:opacity-50 transition-all shadow-xs"
            >
              <Check size={14} />
              <span>{companySaving ? 'Saving...' : 'Save Invoicing Defaults'}</span>
            </button>
          </div>
        </Card>
      )}

      {/* 5. TAB 4: MY PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
          {/* Profile Card */}
          <Card className="border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[#B8860B]">
                <UserRound size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Administrator Profile</h3>
                <p className="text-xs text-slate-400">Your personal administrator credentials</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <Field label="Full Name">
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((s) => ({ ...s, name: e.target.value }))}
                  className="text-xs"
                />
              </Field>

              <Field label="Email Address">
                <Input value={user?.email ?? ''} disabled className="text-xs bg-slate-50 text-slate-500" />
              </Field>

              <Field label="Direct Phone">
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                  placeholder="9745XXXXXX"
                  className="text-xs font-mono"
                />
              </Field>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void onProfileSave()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#080C14] px-4 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
                >
                  <Check size={14} />
                  <span>Update Profile</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Password Card */}
          <Card className="border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <KeyRound size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Password & Security</h3>
                <p className="text-xs text-slate-400">Keep your account secure with 8+ characters</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <Field label="Current Password">
                <div className="relative">
                  <Input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))
                    }
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

              <Field label="New Password">
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

              <Field label="Confirm New Password">
                <div className="relative">
                  <Input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))
                    }
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

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void onChangePassword()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-all"
                >
                  <Lock size={13} />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 6. TAB 5: ADVANCED SYSTEM SETTINGS (JSON) */}
      {activeTab === 'advanced' && (
        <Card className="border-slate-200/90 shadow-xs space-y-4 p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
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
                setAdvancedDialogOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#080C14] px-3.5 py-2 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
            >
              <Plus size={14} />
              <span>Add Custom Key</span>
            </button>
          </div>

          <DataTable columns={columns} data={rows} />
        </Card>
      )}

      {/* Advanced Key Dialog */}
      <FormDialog
        title="Custom Configuration Key"
        description="Edit low-level system settings JSON. Make sure syntax is valid JSON."
        open={advancedDialogOpen}
        onOpenChange={setAdvancedDialogOpen}
      >
        <div className="space-y-3.5">
          <Field label="Configuration Key">
            <Input
              value={advancedForm.key}
              placeholder="e.g. integrations or features"
              onChange={(e) => setAdvancedForm((s) => ({ ...s, key: e.target.value }))}
              className="text-xs font-mono"
            />
          </Field>
          <Field label="JSON Value Payload">
            <Textarea
              className="min-h-[220px] font-mono text-xs leading-relaxed"
              value={advancedForm.valueText}
              onChange={(e) => setAdvancedForm((s) => ({ ...s, valueText: e.target.value }))}
            />
          </Field>
          <FormDialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="h-8 rounded-xl text-xs"
              onClick={() => setAdvancedDialogOpen(false)}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={() => void onAdvancedSettingSubmit()}
              className="inline-flex h-8 items-center justify-center rounded-xl bg-[#080C14] px-4 text-xs font-bold text-[#F3CA52] border border-[#D4AF37] hover:bg-[#121927]"
            >
              Save Key
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
    altContact: String(value.altContact ?? ''),
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
