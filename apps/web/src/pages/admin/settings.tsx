import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { MRT_ColumnDef } from 'material-react-table';
import { Edit3, KeyRound, Plus, Upload, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setUser } from '@/store/slices/auth.slice';
import { authService } from '@/features/auth/auth.service';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { settingsService, SettingRow } from '@/features/settings/settings.service';
import { SectionHeader } from '@/components/common/section-header';
import { FormDialog, FormDialogFooter } from '@/components/common/form-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { uploadService } from '@/features/upload/upload.service';
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
};

const COMPANY_ASSET_MAX_BYTES = 900 * 1024; // Keep below common 1 MB proxy limits
const COMPANY_ASSET_TARGET_BYTES = 720 * 1024;

function initialCompanySetting(): CompanySetting {
  return {
    app: 'https://thankamevents.in/admin',
    name: 'Thankam Events',
    legalName: 'Thankam Events Management',
    logoName: 'Thankam',
    logoUrl: '',
    faviconUrl: '',
    tagline: 'Celebrations Crafted',
    contact: '',
    altContact: '',
    email: 'info@thankamevents.in',
    website: 'https://thankamevents.in',
    gstNumber: '',
    address: 'Kerala, India',
  };
}

const COMPANY_SETTING_TEMPLATE = {
  app: 'https://thankamevents.in/admin',
  name: 'Thankam Events',
  legalName: 'Thankam Events Management',
  logoName: 'Thankam',
  logoUrl: 'https://thankamevents.in/logo.png',
  faviconUrl: 'https://thankamevents.in/favicon.ico',
  tagline: 'Celebrations Crafted',
  contact: '+91XXXXXXXXXX',
  altContact: '',
  email: 'info@thankamevents.in',
  website: 'https://thankamevents.in',
  gstNumber: '',
  address: 'Kerala, India',
};

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [rows, setRows] = useState<SettingRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    key: '',
    valueText: JSON.stringify(COMPANY_SETTING_TEMPLATE, null, 2),
  });

  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
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

  const columns = useMemo<MRT_ColumnDef<SettingRow>[]>(
    () => [
      { accessorKey: 'key', header: 'Setting Key' },
      {
        id: 'valuePreview',
        header: 'Value Preview',
        accessorFn: (row) => JSON.stringify(row.value),
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => (
          <Button
            variant="outline"
            className="h-8 px-2.5"
            onClick={() => {
              const item = row.original;
              setForm({ key: item.key, valueText: JSON.stringify(item.value, null, 2) });
              setOpen(true);
            }}
          >
            <Edit3 size={14} />
          </Button>
        ),
      },
    ],
    [],
  );

  const onSettingSubmit = async () => {
    try {
      const parsed = JSON.parse(form.valueText);
      await settingsService.upsert(form.key, parsed);
      toast.success('Setting saved');
      setOpen(false);
      await refresh();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Value must be valid JSON');
        return;
      }
      toast.error(error?.response?.data?.message ?? 'Failed to save setting');
    }
  };

  const onCompanySave = async () => {
    try {
      setCompanySaving(true);
      await settingsService.upsert('company', buildCompanyPayload(companyForm));
      toast.success('Branding & company setting saved');
      await refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to save company setting');
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
      toast.success(`${field === 'logoUrl' ? 'Logo' : 'Favicon'} uploaded`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Failed to upload asset');
    } finally {
      setAssetUploading(null);
    }
  };

  const onProfileSave = async () => {
    try {
      const updated = await authService.updateProfile({
        name: profile.name,
        phone: profile.phone || undefined,
      });

      dispatch(setUser(updated));
      toast.success('Profile updated');
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

  return (
    <PageShell title="Settings" subtitle="Company settings, profile, and password security">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <UserRound size={18} className="text-primary" />
            <h3 className="text-xl font-bold">My Profile</h3>
          </div>
          <div className="space-y-3">
            <Field label="Name">
              <Input
                value={profile.name}
                onChange={(e) => setProfile((s) => ({ ...s, name: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <Input value={user?.email ?? ''} disabled />
            </Field>
            <Field label="Phone">
              <Input
                value={profile.phone}
                onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
              />
            </Field>
            <Button onClick={() => void onProfileSave()}>Save Profile</Button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={18} className="text-primary" />
            <h3 className="text-xl font-bold">Password & Recovery</h3>
          </div>
          <div className="space-y-3">
            <Field label="Current Password">
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))
                }
              />
            </Field>
            <Field label="New Password">
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))
                }
              />
            </Field>
            <Field label="Confirm New Password">
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))
                }
              />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void onChangePassword()}>Change Password</Button>
            
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader
          title="Company Branding & Deployment"
          subtitle="Configure logo, favicon, and company identity for landing page, quotations, and agreements"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Brand Name">
            <Input
              value={companyForm.name}
              onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>
          <Field label="Legal Name">
            <Input
              value={companyForm.legalName}
              onChange={(e) => setCompanyForm((s) => ({ ...s, legalName: e.target.value }))}
            />
          </Field>
          <Field label="Tagline">
            <Input
              value={companyForm.tagline}
              onChange={(e) => setCompanyForm((s) => ({ ...s, tagline: e.target.value }))}
            />
          </Field>
          <Field label="Logo Name">
            <Input
              value={companyForm.logoName}
              onChange={(e) => setCompanyForm((s) => ({ ...s, logoName: e.target.value }))}
              placeholder="Used when logo image is unavailable"
            />
          </Field>
          <Field label="Website URL">
            <Input
              value={companyForm.website}
              onChange={(e) => setCompanyForm((s) => ({ ...s, website: e.target.value }))}
            />
          </Field>
          <Field label="Admin Portal URL">
            <Input
              value={companyForm.app}
              onChange={(e) => setCompanyForm((s) => ({ ...s, app: e.target.value }))}
              placeholder="https://thankamevents.in/admin"
            />
          </Field>
          <Field label="Primary Contact">
            <Input
              value={companyForm.contact}
              onChange={(e) => setCompanyForm((s) => ({ ...s, contact: e.target.value }))}
            />
          </Field>
          <Field label="Alternate Contact">
            <Input
              value={companyForm.altContact}
              onChange={(e) => setCompanyForm((s) => ({ ...s, altContact: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <Input
              value={companyForm.email}
              onChange={(e) => setCompanyForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Field>
          <Field label="GST Number">
            <Input
              value={companyForm.gstNumber}
              onChange={(e) => setCompanyForm((s) => ({ ...s, gstNumber: e.target.value }))}
            />
          </Field>
          <Field label="Logo URL">
            <Input
              value={companyForm.logoUrl}
              onChange={(e) => setCompanyForm((s) => ({ ...s, logoUrl: e.target.value }))}
            />
          </Field>
          <Field label="Favicon URL">
            <Input
              value={companyForm.faviconUrl}
              onChange={(e) => setCompanyForm((s) => ({ ...s, faviconUrl: e.target.value }))}
            />
          </Field>
          <Field label="Upload Logo">
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onCompanyAssetUpload(e, 'logoUrl')}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              />
              {companyForm.logoUrl ? (
                <img
                  src={companyForm.logoUrl}
                  alt="Company logo preview"
                  className="h-12 w-auto rounded border border-slate-200 bg-white p-1"
                />
              ) : null}
            </div>
          </Field>
          <Field label="Upload Favicon">
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void onCompanyAssetUpload(e, 'faviconUrl')}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              />
              {companyForm.faviconUrl ? (
                <img
                  src={companyForm.faviconUrl}
                  alt="Favicon preview"
                  className="h-10 w-10 rounded border border-slate-200 bg-white p-1"
                />
              ) : null}
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Address">
              <Textarea
                value={companyForm.address}
                onChange={(e) => setCompanyForm((s) => ({ ...s, address: e.target.value }))}
                className="min-h-[80px]"
              />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => void onCompanySave()} disabled={companySaving}>
            {companySaving ? 'Saving...' : 'Save Branding Setting'}
          </Button>
          {assetUploading ? (
            <span className="inline-flex items-center text-xs font-semibold text-slate-500">
              <Upload size={13} className="mr-1.5" />
              Uploading {assetUploading}...
            </span>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="System Settings"
          subtitle="Advanced JSON upsert for deployment configuration and custom keys"
          actionLabel="Add Setting"
          actionIcon={<Plus size={16} className="mr-2" />}
          onAction={() => {
            setForm({ key: '', valueText: JSON.stringify(COMPANY_SETTING_TEMPLATE, null, 2) });
            setOpen(true);
          }}
        />
        <DataTable columns={columns} data={rows} />
      </Card>

      <FormDialog
        title="Advanced Upsert Setting"
        description="Use JSON for custom keys. For brand/deployment data, prefer Company Branding section."
        open={open}
        onOpenChange={setOpen}
      >
        <div className="space-y-3">
          <Field label="Key">
            <Input value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} />
          </Field>
          <Field label="Value (JSON)">
            <Textarea
              className="min-h-[220px] font-mono text-xs"
              value={form.valueText}
              onChange={(e) => setForm((s) => ({ ...s, valueText: e.target.value }))}
            />
          </Field>
          <FormDialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSettingSubmit()}>Save</Button>
          </FormDialogFooter>
        </div>
      </FormDialog>
    </PageShell>
  );
}

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
    contact: String(value.contact ?? ''),
    altContact: String(value.altContact ?? ''),
    email: String(value.email ?? base.email),
    website: String(value.website ?? base.website),
    gstNumber: String(value.gstNumber ?? ''),
    address: String(value.address ?? base.address),
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
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
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
