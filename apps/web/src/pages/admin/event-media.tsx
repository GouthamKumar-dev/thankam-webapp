import {
  CalendarDays,
  Check,
  Edit3,
  Eye,
  Film,
  GalleryHorizontal,
  Image as ImageIcon,
  ImagePlus,
  MessageSquare,
  MessageSquarePlus,
  Plus,
  Quote,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageShell } from '@/layouts/page-shell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { toMediaUrl } from '@/utils/media-url';
import { cn } from '@/utils/cn';
import { galleryService, MediaRow } from '@/features/gallery/gallery.service';
import {
  websiteReviewService,
  ReviewRow,
  CreateReviewPayload,
} from '@/features/website-review/website-review.service';
import { uploadService } from '@/features/upload/upload.service';
import { CardGridSkeleton, KpiGridSkeleton } from '@/components/common/skeleton';

type Tab = 'gallery' | 'testimonials';
type GalleryFilter = 'all' | 'IMAGE' | 'VIDEO' | 'FEATURED';
type TestimonialFilter = 'all' | 'FEATURED' | 'FIVE_STAR';

const SECTION_META: Record<Tab, { title: string; subtitle: string }> = {
  gallery: {
    title: 'Event Media & Gallery Showcase',
    subtitle:
      'Upload high-resolution photography and cinematic video reels displayed in the customer gallery and public portfolio.',
  },
  testimonials: {
    title: 'Client Stories & Testimonials',
    subtitle:
      'Manage authentic customer reviews, 5-star ratings, and celebration quotes showcased on the public website.',
  },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={
            rating >= n
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-100 text-slate-300'
          }
        />
      ))}
    </div>
  );
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-115 active:scale-95"
        >
          <Star
            size={22}
            className={
              (hover || value) >= n
                ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                : 'fill-slate-100 text-slate-300'
            }
          />
        </button>
      ))}
    </div>
  );
}

function MediaModal({ src, onClose }: { src: string; onClose: () => void }) {
  const isVideo =
    /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(src) || src.includes('video');
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-black transition-colors"
          title="Close Preview"
        >
          <X size={16} />
        </button>
        {isVideo ? (
          <video
            src={src}
            controls
            autoPlay
            className="max-h-[85vh] w-full bg-black object-contain"
          />
        ) : (
          <img
            src={src}
            alt=""
            className="max-h-[85vh] w-full bg-black object-contain"
          />
        )}
      </div>
    </div>
  );
}

/* ── Gallery Upload Dialog ───────────────────────────────────────── */
function GalleryUploadDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const maxFiles = 10;
  const configuredMaxFileSizeMb = Number(
    import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_MB ?? 50,
  );
  const maxFileSizeMb =
    Number.isFinite(configuredMaxFileSizeMb) && configuredMaxFileSizeMb > 0
      ? configuredMaxFileSizeMb
      : 50;
  const maxFileSize = maxFileSizeMb * 1024 * 1024;
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [isFeatured, setFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!selected.length) return;

    const mediaFiles = selected.filter((file) =>
      /^(image|video)\//.test(file.type),
    );
    const acceptedFiles = mediaFiles.filter((file) => file.size <= maxFileSize);
    const existingKeys = new Set(
      files.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
    );
    const uniqueFiles = acceptedFiles.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    const availableSlots = maxFiles - files.length;

    if (mediaFiles.length !== selected.length) {
      toast.error('Only image and video files can be uploaded');
    }
    if (acceptedFiles.length !== mediaFiles.length) {
      toast.error(`Each file must be ${maxFileSizeMb} MB or smaller`);
    }
    if (uniqueFiles.length > availableSlots) {
      toast.error(`A maximum of ${maxFiles} files can be uploaded at once`);
    }
    if (availableSlots <= 0) return;

    setFiles((prev) => [...prev, ...uniqueFiles.slice(0, availableSlots)]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const nextPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
    }));
    setPreviews(nextPreviews);
    return () =>
      nextPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [files]);

  const handleUpload = async () => {
    if (!files.length) {
      toast.error('Select at least one photo or video');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const assets = await uploadService.uploadMany(files, setUploadProgress);
      await Promise.all(
        assets.map((a) =>
          galleryService.create({
            url: a.url,
            type: a.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
            title: title.trim() || undefined,
            isWebsiteGallery: true,
            isFeatured,
          }),
        ),
      );
      toast.success(
        `${assets.length} file${assets.length > 1 ? 's' : ''} added to showcase`,
      );
      onDone();
    } catch (error: any) {
      toast.error(error?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={() => {
        if (!uploading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-50/80 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <Upload size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Showcase Management
              </p>
              <p className="text-sm font-bold text-slate-900">Upload Media to Gallery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6 text-xs">
          {previews.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/20 py-10 transition-all hover:border-amber-400 hover:bg-amber-50/40 disabled:opacity-60"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                <Upload size={20} />
              </div>
              <div className="text-center px-4">
                <p className="text-xs font-bold text-slate-800">
                  Click to select photos or videos
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Up to {maxFiles} files per batch &bull; Max {maxFileSizeMb} MB each
                </p>
              </div>
            </button>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2.5">
                {previews.map((p, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-900 group shadow-2xs"
                  >
                    {p.type.startsWith('video/') ? (
                      <video src={p.url} className="h-full w-full object-cover" />
                    ) : (
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-500 transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono text-white">
                      {p.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'}
                    </span>
                  </div>
                ))}
                {files.length < maxFiles && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-amber-400 hover:bg-amber-50/30 transition-all"
                  >
                    <Plus size={18} />
                    <span className="text-[10px] font-bold">+ Add more</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFiles}
          />

          {/* Title input */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Media Caption / Event Title (optional)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Royal Wedding Feast at Raviz Resort"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Featured on landing toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>Feature on Public Showcase</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Highlights these items on the front landing page carousel
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeatured((p) => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isFeatured ? 'bg-gradient-to-r from-amber-500 to-[#fc8019]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-xs ${
                  isFeatured ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>Uploading assets…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#fc8019] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleUpload()}
            disabled={uploading || !files.length}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Upload size={14} />
            )}
            <span>{uploading ? 'Uploading…' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Testimonial Form Modal ──────────────────────────────────────── */
const EMPTY_FORM: CreateReviewPayload = {
  clientName: '',
  title: '',
  testimonial: '',
  rating: 5,
  mediaUrl: undefined,
  mediaType: undefined,
  isFeatured: true,
};

function TestimonialModal({
  initial,
  onSave,
  onClose,
}: {
  initial: CreateReviewPayload & { id?: string };
  onSave: (payload: CreateReviewPayload, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateReviewPayload>({ ...initial });
  const [preview, setPreview] = useState<string | null>(
    initial.mediaUrl ? toMediaUrl(initial.mediaUrl) : null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadService.uploadOne(file);
      const isVideo = file.type.startsWith('video/');
      setForm((p) => ({
        ...p,
        mediaUrl: asset.url,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      }));
      setPreview(toMediaUrl(asset.url));
    } catch {
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.clientName?.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (!form.testimonial?.trim()) {
      toast.error('Testimonial text is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(form, (initial as any).id);
      onClose();
    } catch {
      toast.error('Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-slate-50/80 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
              <MessageSquare size={15} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Customer Reviews
              </p>
              <p className="text-sm font-bold text-slate-900">
                {(initial as any).id ? 'Edit Testimonial' : 'Add Client Story'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-6 text-xs">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Client Photo or Video Reel (optional)
            </label>
            {preview ? (
              <div className="relative w-36">
                {form.mediaType === 'VIDEO' ? (
                  <video
                    src={preview}
                    className="h-28 w-36 rounded-xl border border-slate-200 bg-black object-cover shadow-2xs"
                    muted
                    controls
                  />
                ) : (
                  <img
                    src={preview}
                    alt=""
                    className="h-28 w-36 rounded-xl border border-slate-200 object-cover shadow-2xs"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = form.mediaUrl;
                    setPreview(null);
                    setForm((p) => ({
                      ...p,
                      mediaUrl: undefined,
                      mediaType: undefined,
                    }));
                    if (toDelete && toDelete.includes('/uploads/')) {
                      void uploadService.deleteFile(toDelete);
                    }
                  }}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-md transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/20 px-4 py-3 text-xs text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-50/40 disabled:opacity-60"
              >
                <ImagePlus size={16} className="text-amber-600" />
                <span>{uploading ? 'Uploading…' : 'Attach Photo or Video Reel'}</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => void handleFile(e)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Client Name *
              </label>
              <input
                value={form.clientName ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                placeholder="e.g. Dr. Thomas Kurian"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Event Type / Designation
              </label>
              <input
                value={form.title ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Wedding at Raviz Resort"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Star Rating
            </label>
            <StarSelector
              value={form.rating ?? 5}
              onChange={(v) => setForm((p) => ({ ...p, rating: v }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Client Review &amp; Words *
            </label>
            <textarea
              value={form.testimonial ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, testimonial: e.target.value }))
              }
              rows={4}
              placeholder="The catering and floral stage setup exceeded our expectations. Every guest praised the Kerala Sadhya and chicken roast…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>Feature on Public Landing Page</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displays prominently in the client testimonials carousel
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({ ...p, isFeatured: !p.isFeatured }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isFeatured ? 'bg-gradient-to-r from-amber-500 to-[#fc8019]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-xs ${
                  form.isFeatured ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#fc8019] px-5 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Plus size={14} />
            )}
            <span>
              {saving
                ? 'Saving…'
                : (initial as any).id
                ? 'Save Changes'
                : 'Publish Testimonial'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN EVENT MEDIA PAGE (Gallery & Testimonials)
═══════════════════════════════════════════════════════════════════ */
export function EventMediaPage({ section = 'gallery' }: { section?: Tab }) {
  const navigate = useNavigate();
  const { confirm, confirmModal } = useConfirmModal();
  const tab: Tab = section === 'testimonials' ? 'testimonials' : 'gallery';

  const [galleryItems, setGalleryItems] = useState<MediaRow[]>([]);
  const [testimonials, setTestimonials] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  const [testimonialFilter, setTestimonialFilter] = useState<TestimonialFilter>('all');
  const [search, setSearch] = useState('');
  const [testimonialModal, setTestimonialModal] = useState<
    (CreateReviewPayload & { id?: string }) | null
  >(null);
  const [uploadDialog, setUploadDialog] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === 'testimonials') {
        setTestimonials(await websiteReviewService.list());
      } else {
        setGalleryItems(await galleryService.list());
      }
    } catch {
      toast.error('Failed to load media records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [tab]);

  /* ── Gallery actions ── */
  const featureMedia = async (id: string, curr: boolean) => {
    await galleryService.update(id, { isFeatured: !curr });
    toast.success(!curr ? 'Added to featured showcase' : 'Removed from featured');
    void refresh();
  };

  const deleteMedia = async (id: string) => {
    if (
      !(await confirm({
        title: 'Delete Media',
        description: 'Are you sure you want to delete this media asset permanently?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return;
    await galleryService.remove(id);
    toast.success('Media deleted');
    void refresh();
  };

  /* ── Testimonial actions ── */
  const saveTestimonial = async (
    payload: CreateReviewPayload,
    id?: string,
  ) => {
    if (id) {
      await websiteReviewService.update(id, payload);
      toast.success('Testimonial updated');
    } else {
      await websiteReviewService.create(payload);
      toast.success('Testimonial published');
    }
    void refresh();
  };

  const featureTestimonial = async (id: string, curr: boolean) => {
    await websiteReviewService.toggleFeatured(id, !curr);
    toast.success(
      !curr
        ? 'Now featured on landing page'
        : 'Removed from landing page',
    );
    void refresh();
  };

  const deleteTestimonial = async (id: string) => {
    if (
      !(await confirm({
        title: 'Delete Testimonial',
        description: 'Are you sure you want to delete this client testimonial?',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    )
      return;
    await websiteReviewService.remove(id);
    toast.success('Testimonial deleted');
    void refresh();
  };

  /* ── Computed Metrics & Filters ── */
  const galleryPhotoCount = galleryItems.filter((m) => m.type === 'IMAGE').length;
  const galleryVideoCount = galleryItems.filter((m) => m.type === 'VIDEO').length;
  const galleryFeaturedCount = galleryItems.filter((m) => m.isFeatured).length;

  const filteredGalleryItems = useMemo(() => {
    return galleryItems.filter((m) => {
      if (galleryFilter === 'IMAGE' && m.type !== 'IMAGE') return false;
      if (galleryFilter === 'VIDEO' && m.type !== 'VIDEO') return false;
      if (galleryFilter === 'FEATURED' && !m.isFeatured) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return m.title?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [galleryItems, galleryFilter, search]);

  const testimonialsFeaturedCount = testimonials.filter((t) => t.isFeatured).length;
  const testimonialsFiveStarCount = testimonials.filter((t) => (t.rating ?? 5) === 5).length;

  const filteredTestimonials = useMemo(() => {
    return testimonials.filter((t) => {
      if (testimonialFilter === 'FEATURED' && !t.isFeatured) return false;
      if (testimonialFilter === 'FIVE_STAR' && (t.rating ?? 5) < 5) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          t.clientName?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q) ||
          t.testimonial?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [testimonials, testimonialFilter, search]);

  return (
    <PageShell
      title={SECTION_META[tab]?.title || 'Event Media'}
      subtitle={SECTION_META[tab]?.subtitle}
    >
      {confirmModal}
      {viewImg && <MediaModal src={viewImg} onClose={() => setViewImg(null)} />}
      {testimonialModal && (
        <TestimonialModal
          initial={testimonialModal}
          onSave={saveTestimonial}
          onClose={() => setTestimonialModal(null)}
        />
      )}
      {uploadDialog && (
        <GalleryUploadDialog
          onClose={() => setUploadDialog(false)}
          onDone={() => {
            setUploadDialog(false);
            void refresh();
          }}
        />
      )}

      <div className="space-y-5">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/event-media/gallery')}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs',
                tab === 'gallery'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <GalleryHorizontal size={14} />
              <span>Gallery &amp; Showcase</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  tab === 'gallery' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {galleryItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/event-media/testimonials')}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-2xs',
                tab === 'testimonials'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <MessageSquare size={14} />
              <span>Client Testimonials</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  tab === 'testimonials' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {testimonials.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => void refresh()}
            title="Refresh Records"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber-600' : ''} />
          </button>
        </div>

        {/* ── METRICS STRIP ── */}
        {loading ? (
          <KpiGridSkeleton count={4} />
        ) : tab === 'gallery' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Media</span>
                <p className="mt-0.5 text-xl font-black font-mono text-slate-900">{galleryItems.length}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <GalleryHorizontal size={15} />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700/80 block">Photographs</span>
                <p className="mt-0.5 text-xl font-black font-mono text-slate-900">{galleryPhotoCount}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                <ImageIcon size={15} />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700/80 block">Cinematic Reels</span>
                <p className="mt-0.5 text-xl font-black font-mono text-slate-900">{galleryVideoCount}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <Film size={15} />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 block">Featured Showcase</span>
                <p className="mt-0.5 text-xl font-black font-mono text-amber-700">{galleryFeaturedCount}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Star size={15} className="fill-amber-500 text-amber-500" />
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Stories</span>
                <p className="mt-0.5 text-xl font-black font-mono text-slate-900">{testimonials.length}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <MessageSquare size={15} />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 block">5-Star Ratings</span>
                <p className="mt-0.5 text-xl font-black font-mono text-amber-700">{testimonialsFiveStarCount}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Star size={15} className="fill-amber-500 text-amber-500" />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 block">On Landing Page</span>
                <p className="mt-0.5 text-xl font-black font-mono text-emerald-700">{testimonialsFeaturedCount}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Eye size={15} />
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 block">Client Satisfaction</span>
                <p className="mt-0.5 text-xl font-black font-mono text-slate-900">100%</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                <Quote size={15} />
              </span>
            </div>
          </div>
        )}

        {/* ── TOOLBAR: Filter & Search ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
          {tab === 'gallery' ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all' as GalleryFilter, label: 'All Media', count: galleryItems.length },
                { key: 'IMAGE' as GalleryFilter, label: 'Photos', count: galleryPhotoCount },
                { key: 'VIDEO' as GalleryFilter, label: 'Videos', count: galleryVideoCount },
                { key: 'FEATURED' as GalleryFilter, label: 'Featured', count: galleryFeaturedCount },
              ].map((f) => {
                const isActive = galleryFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setGalleryFilter(f.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'all' as const, label: 'All Stories', count: testimonials.length },
                { key: 'FEATURED' as const, label: 'On Landing Page', count: testimonialsFeaturedCount },
                { key: 'FIVE_STAR' as const, label: '5-Star Ratings', count: testimonialsFiveStarCount },
              ].map((f) => {
                const isActive = testimonialFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTestimonialFilter(f.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 sm:max-w-md justify-end">
            <div className="relative flex-1">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === 'gallery' ? 'Search media by title...' : 'Search by client, title, quote...'}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {tab === 'gallery' ? (
              <button
                type="button"
                onClick={() => setUploadDialog(true)}
                className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#fc8019] px-3.5 text-xs font-bold text-white shadow-2xs hover:brightness-105 transition-all shrink-0"
              >
                <Upload size={14} />
                <span>Upload Media</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
                className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#fc8019] px-3.5 text-xs font-bold text-white shadow-2xs hover:brightness-105 transition-all shrink-0"
              >
                <Plus size={14} />
                <span>Add Client Story</span>
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            GALLERY TAB CONTENT
        ══════════════════════════════ */}
        {tab === 'gallery' && (
          <div>
            {loading ? (
              <CardGridSkeleton count={8} columns="grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
            ) : filteredGalleryItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                <GalleryHorizontal size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No gallery media found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {search || galleryFilter !== 'all'
                    ? 'Try clearing your search query or media filter.'
                    : 'Upload photography and cinematic reels to showcase Thankam events.'}
                </p>
                <button
                  type="button"
                  onClick={() => setUploadDialog(true)}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#fc8019] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-105"
                >
                  <Upload size={13} />
                  <span>Upload Media Now</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredGalleryItems.map((m) => (
                  <div
                    key={m.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:border-amber-400/80 transition-all duration-150"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                      {m.type === 'IMAGE' ? (
                        <img
                          src={toMediaUrl(m.url)}
                          alt={m.title ?? ''}
                          className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setViewImg(toMediaUrl(m.url))}
                        />
                      ) : (
                        <video
                          src={toMediaUrl(m.url)}
                          className="h-full w-full cursor-pointer object-cover"
                          muted
                          playsInline
                          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                          onMouseLeave={(e) => {
                            const v = e.currentTarget as HTMLVideoElement;
                            v.pause();
                            v.currentTime = 0;
                          }}
                          onClick={() => setViewImg(toMediaUrl(m.url))}
                        />
                      )}

                      {/* Badges on Media */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        {m.type === 'VIDEO' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                            <Film size={11} /> Reel
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                            <ImageIcon size={11} /> Photo
                          </span>
                        )}

                        {m.isFeatured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                            <Star size={10} className="fill-white" /> Featured
                          </span>
                        )}
                      </div>

                      {/* Quick Preview Hover Overlay */}
                      <button
                        type="button"
                        onClick={() => setViewImg(toMediaUrl(m.url))}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-xs px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md transform translate-y-1 group-hover:translate-y-0 transition-transform">
                          <Eye size={13} /> View Full
                        </span>
                      </button>
                    </div>

                    {/* Details & Action Row */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900 truncate" title={m.title || 'Untitled Event Media'}>
                          {m.title || 'Untitled Event Media'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                          <CalendarDays size={11} />
                          {fmt(m.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => void featureMedia(m.id, m.isFeatured)}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all shadow-2xs',
                            m.isFeatured
                              ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                          )}
                          title={m.isFeatured ? 'Remove from featured showcase' : 'Add to featured showcase'}
                        >
                          <Star size={12} className={m.isFeatured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
                          <span>{m.isFeatured ? 'Featured' : 'Feature'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewImg(toMediaUrl(m.url))}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                          title="Preview Media"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteMedia(m.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-2xs"
                          title="Delete media"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════
            TESTIMONIALS TAB CONTENT
        ══════════════════════════════ */}
        {tab === 'testimonials' && (
          <div>
            {loading ? (
              <CardGridSkeleton count={6} columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
            ) : filteredTestimonials.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                <MessageSquarePlus size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No testimonials found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {search || testimonialFilter !== 'all'
                    ? 'Try clearing your search query or filter.'
                    : 'Add your first customer review or celebration testimonial.'}
                </p>
                <button
                  type="button"
                  onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
                  className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-[#fc8019] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-105"
                >
                  <Plus size={13} />
                  <span>Add First Testimonial</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTestimonials.map((t) => (
                  <div
                    key={t.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:border-amber-400/80 transition-all duration-150 space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header with Client Avatar & Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {t.mediaUrl ? (
                            <div
                              className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200 shadow-2xs cursor-pointer shrink-0"
                              onClick={() => setViewImg(toMediaUrl(t.mediaUrl!))}
                            >
                              {t.mediaType === 'VIDEO' ? (
                                <video src={toMediaUrl(t.mediaUrl)} className="h-full w-full object-cover" muted />
                              ) : (
                                <img src={toMediaUrl(t.mediaUrl)} alt="" className="h-full w-full object-cover" />
                              )}
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center justify-center shrink-0 shadow-2xs text-sm">
                              {(t.clientName ?? 'CL')
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {t.clientName || 'Anonymous Client'}
                            </h4>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {t.title || 'Wedding / Feast Celebration'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {fmt(t.createdAt)}
                            </p>
                          </div>
                        </div>

                        {t.isFeatured && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-2xs">
                            ★ Landing Page
                          </span>
                        )}
                      </div>

                      {/* Star Rating */}
                      <div className="pt-1">
                        <StarRow rating={t.rating ?? 5} size={15} />
                      </div>

                      {/* Testimonial Quote */}
                      {t.testimonial && (
                        <div className="relative rounded-xl bg-slate-50/80 p-3.5 border border-slate-100">
                          <Quote size={16} className="text-amber-500/80 mb-1" />
                          <p className="text-xs italic text-slate-700 line-clamp-4 leading-relaxed">
                            &ldquo;{t.testimonial}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Attached Media Thumbnail Pill (if provided) */}
                      {t.mediaUrl && (
                        <button
                          type="button"
                          onClick={() => setViewImg(toMediaUrl(t.mediaUrl!))}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {t.mediaType === 'VIDEO' ? <Film size={12} /> : <ImageIcon size={12} />}
                          <span>Preview Attached {t.mediaType === 'VIDEO' ? 'Reel' : 'Photo'}</span>
                        </button>
                      )}
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setTestimonialModal({
                            id: t.id,
                            clientName: t.clientName ?? '',
                            title: t.title ?? '',
                            testimonial: t.testimonial ?? '',
                            rating: t.rating ?? 5,
                            mediaUrl: t.mediaUrl ?? undefined,
                            mediaType: t.mediaType ?? undefined,
                            isFeatured: t.isFeatured,
                          })
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void featureTestimonial(t.id, t.isFeatured)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all shadow-2xs',
                          t.isFeatured
                            ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        <Star size={12} className={t.isFeatured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
                        <span>{t.isFeatured ? 'Featured' : 'Feature'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteTestimonial(t.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-2xs"
                        title="Delete testimonial"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
