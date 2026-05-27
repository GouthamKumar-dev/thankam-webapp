import { useEffect, useMemo, useState } from 'react';
import { Camera, Trash2, Upload, Video, Image as ImageIcon, Info } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/common/file-upload';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { galleryService, MediaRow, CreateGalleryPayload } from '@/features/gallery/gallery.service';
import { uploadService } from '@/features/upload/upload.service';
import { toMediaUrl } from '@/utils/media-url';

const EVENT_CATEGORIES = [
  'Wedding',
  'Birthday Party',
  'Engagement',
  'Anniversary',
  'House Warming',
  'Memorial Service',
  'Corporate Event',
  'Venue Photo',
  'Other',
];

export function StaffGalleryPage() {
  const { confirm, confirmModal } = useConfirmModal();

  const [rows, setRows] = useState<MediaRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterType, setFilterType] = useState<'ALL' | 'IMAGE' | 'VIDEO'>('ALL');

  const refresh = () => void galleryService.list().then(setRows);

  useEffect(() => {
    refresh();
  }, []);

  const onUpload = async () => {
    if (files.length === 0) {
      toast.error('Select at least one image or video to upload');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadService.uploadMany(files, setUploadProgress);
      const payloads: CreateGalleryPayload[] = uploaded.map((asset) => ({
        title: title.trim() || asset.originalName,
        description: [description.trim(), category ? `Category: ${category}` : '']
          .filter(Boolean)
          .join(' | ') || undefined,
        type: asset.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        url: asset.url,
        isWebsiteGallery: false,
        isSocialContent: false,
        isFeatured: false,
      }));

      await Promise.all(payloads.map((p) => galleryService.create(p)));
      toast.success(`${uploaded.length} file(s) uploaded. Admin will review and publish to the website.`);
      setFiles([]);
      setTitle('');
      setDescription('');
      setCategory('');
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDelete = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete Upload',
      description: 'Are you sure you want to delete this upload? This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;
    try {
      await galleryService.remove(id);
      toast.success('Upload deleted');
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Delete failed');
    }
  };

  const filtered = useMemo(() => {
    if (filterType === 'ALL') return rows;
    return rows.filter((r) => r.type === filterType);
  }, [rows, filterType]);

  const imageCount = rows.filter((r) => r.type === 'IMAGE').length;
  const videoCount = rows.filter((r) => r.type === 'VIDEO').length;
  const publishedCount = rows.filter((r) => r.isWebsiteGallery).length;

  return (
    <PageShell title="My Uploads" subtitle="Upload event photos and videos — Admin will review and publish them to the website">

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600">
            <Camera size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{imageCount}</p>
            <p className="text-sm text-slate-500">Photos Uploaded</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-100 text-purple-600">
            <Video size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{videoCount}</p>
            <p className="text-sm text-slate-500">Videos Uploaded</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-100 text-green-600">
            <Upload size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{publishedCount}</p>
            <p className="text-sm text-slate-500">Published on Website</p>
          </div>
        </Card>
      </div>

      {/* Upload Card */}
      <Card>
        <h3 className="mb-1 flex items-center gap-2 text-xl font-bold tracking-tight">
          <Upload size={18} /> Upload New Media
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Upload event photos and videos. Admin will review your uploads and choose which ones to display on the website gallery.
        </p>

        {/* Info banner */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-700">
            Accepted formats: <strong>JPG, PNG, WEBP, MP4, MOV, WEBM</strong>. Max 50MB per file.
            Your uploads go to a review queue — Admin publishes them to the website.
          </p>
        </div>

        <div className="space-y-4">
          <FileUpload files={files} onFilesChange={setFiles} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sharma Wedding Ceremony"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
              >
                <option value="">Select category...</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the event or photo..."
            />
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Uploading files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => void onUpload()}
              disabled={uploading || files.length === 0}
              className="gap-2"
            >
              <Upload size={15} />
              {uploading ? `Uploading ${uploadProgress}%...` : `Upload ${files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}`}
            </Button>
          </div>
        </div>
      </Card>

      {/* My Uploads */}
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight">My Uploads</h3>
            <p className="mt-0.5 text-sm text-slate-500">{rows.length} total file{rows.length !== 1 ? 's' : ''} uploaded</p>
          </div>

          {/* Type filter */}
          <div className="inline-flex rounded-xl border border-border bg-slate-50 p-1 text-sm font-semibold">
            {(['ALL', 'IMAGE', 'VIDEO'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  filterType === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'IMAGE' && <ImageIcon size={12} />}
                {t === 'VIDEO' && <Video size={12} />}
                {t === 'ALL' ? 'All' : t === 'IMAGE' ? 'Photos' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Camera size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No uploads yet</p>
            <p className="mt-1 text-sm text-slate-500">Upload your first event photo or video above.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((row) => (
              <div
                key={row.id}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-44 bg-slate-100">
                  {row.type === 'IMAGE' ? (
                    <img
                      src={toMediaUrl(row.url)}
                      alt={row.title ?? 'media'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={toMediaUrl(row.url)}
                      className="h-full w-full object-cover"
                      controls
                    />
                  )}
                  {/* Status badge */}
                  <div
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      row.isWebsiteGallery
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-700/70 text-white backdrop-blur-sm'
                    }`}
                  >
                    {row.isWebsiteGallery ? 'Published' : 'Pending Review'}
                  </div>
                  {/* Type badge */}
                  <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    {row.type}
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.title || 'Untitled'}</p>
                  {row.description && (
                    <p className="line-clamp-2 text-xs text-slate-500">{row.description}</p>
                  )}
                  <p className="text-xs text-slate-400">
                    {new Date(row.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  <Button
                    variant="danger"
                    className="h-8 w-full gap-1.5 text-xs"
                    onClick={() => void onDelete(row.id)}
                  >
                    <Trash2 size={13} /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {confirmModal}
    </PageShell>
  );
}
