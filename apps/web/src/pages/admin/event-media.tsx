import {
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
  Sparkles,
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
import { galleryService, MediaRow } from '@/features/gallery/gallery.service';
import {
  websiteReviewService,
  ReviewRow,
  CreateReviewPayload,
} from '@/features/website-review/website-review.service';
import { uploadService } from '@/features/upload/upload.service';

type Tab = 'gallery' | 'testimonials';
type GalleryFilter = 'all' | 'IMAGE' | 'VIDEO' | 'FEATURED';

const SECTION_META: Record<Tab, { title: string; subtitle: string }> = {
  gallery: {
    title: 'Event Media & Gallery Showcase',
    subtitle: 'Upload high-resolution photography and cinematic video reels displayed in the customer gallery and portfolio.',
  },
  testimonials: {
    title: 'Client Stories & Testimonials',
    subtitle: 'Manage authentic 5-star customer reviews, ratings, and quotes showcased on the public landing page.',
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
              : 'fill-slate-700 text-slate-700'
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
            size={24}
            className={
              (hover || value) >= n
                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                : 'fill-slate-800 text-slate-600'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 border border-white/20 text-white hover:bg-black transition-colors"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={() => {
        if (!uploading) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-[#0c121e] border border-amber-500/30 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#080C14] border-b border-amber-900/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F3CA52]">
              <Upload size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F3CA52]">
                Showcase Management
              </p>
              <p className="text-sm font-black text-white">Upload Media to Gallery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="grid h-8 w-8 place-items-center rounded-xl border border-amber-500/20 bg-[#0c121e] text-slate-400 hover:text-white disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-6 text-xs">
          {previews.length === 0 ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-amber-500/30 bg-[#080C14] py-12 transition-all hover:border-[#D4AF37] hover:bg-amber-500/5 disabled:opacity-60"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-[#F3CA52] border border-amber-500/30">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white">
                  Click to select photos or videos
                </p>
                <p className="mt-1 text-xs text-slate-400">
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
                    className="relative aspect-square overflow-hidden rounded-xl border border-amber-500/20 bg-black group"
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
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-white">
                      {p.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'}
                    </span>
                  </div>
                ))}
                {files.length < maxFiles && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-amber-500/30 bg-[#080C14] text-slate-400 hover:text-white hover:border-[#D4AF37] transition-all"
                  >
                    <Plus size={18} />
                    <span className="text-[10px] font-semibold">+ Add more</span>
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
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Media Caption / Event Title (optional)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Royal Wedding Banquet at Raviz Resort"
              className="h-10 border-amber-500/20 bg-[#080C14] text-xs text-white placeholder:text-slate-500 focus:border-[#D4AF37]"
            />
          </div>

          {/* Featured on landing toggle */}
          <div className="flex items-center justify-between rounded-xl border border-amber-900/30 bg-[#080C14] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                <span>Feature on Public Showcase</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Highlights these items on the front landing page carousel
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeatured((p) => !p)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isFeatured ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3CA52]' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                  isFeatured ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Uploading assets…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-amber-900/30 bg-[#080C14] px-6 py-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl border border-amber-500/20 bg-[#0c121e] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleUpload()}
            disabled={uploading || !files.length}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] hover:brightness-110 px-5 py-2 text-xs font-bold text-slate-950 shadow-md disabled:opacity-50 transition-all"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-[#0c121e] border border-amber-500/30 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#080C14] border-b border-amber-900/30 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F3CA52]">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F3CA52]">
                Customer Reviews
              </p>
              <p className="text-sm font-black text-white">
                {(initial as any).id ? 'Edit Testimonial' : 'Add Client Story'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-amber-500/20 bg-[#0c121e] text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-6 text-xs">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Client Photo or Video Reel (optional)
            </label>
            {preview ? (
              <div className="relative w-36">
                {form.mediaType === 'VIDEO' ? (
                  <video
                    src={preview}
                    className="h-28 w-36 rounded-xl border border-amber-500/30 bg-black object-cover"
                    muted
                    controls
                  />
                ) : (
                  <img
                    src={preview}
                    alt=""
                    className="h-28 w-36 rounded-xl border border-amber-500/30 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setForm((p) => ({
                      ...p,
                      mediaUrl: undefined,
                      mediaType: undefined,
                    }));
                  }}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-[#080C14] px-4 py-3 text-xs text-slate-300 transition-colors hover:border-[#D4AF37] hover:text-white disabled:opacity-60"
              >
                <ImagePlus size={16} className="text-[#F3CA52]" />
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
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Client Name *
              </label>
              <Input
                value={form.clientName ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, clientName: e.target.value }))
                }
                placeholder="e.g. Dr. Thomas Kurian"
                className="h-10 border-amber-500/20 bg-[#080C14] text-xs text-white placeholder:text-slate-500 focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Event Type / Designation
              </label>
              <Input
                value={form.title ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="e.g. Wedding at Raviz Resort"
                className="h-10 border-amber-500/20 bg-[#080C14] text-xs text-white placeholder:text-slate-500 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Star Rating
            </label>
            <StarSelector
              value={form.rating ?? 5}
              onChange={(v) => setForm((p) => ({ ...p, rating: v }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Client Review &amp; Words *
            </label>
            <Textarea
              value={form.testimonial ?? ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, testimonial: e.target.value }))
              }
              rows={4}
              placeholder="The catering and floral stage setup exceeded our expectations. Every guest praised the Kerala Sadhya and chicken roast…"
              className="border-amber-500/20 bg-[#080C14] text-xs text-white placeholder:text-slate-500 focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-900/30 bg-[#080C14] px-4 py-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#F3CA52]" />
                <span>Feature on Public Landing Page</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Displays prominently in the client testimonials carousel
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({ ...p, isFeatured: !p.isFeatured }))
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isFeatured ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3CA52]' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                  form.isFeatured ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-amber-900/30 bg-[#080C14] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-amber-500/20 bg-[#0c121e] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] hover:brightness-110 px-5 py-2 text-xs font-bold text-slate-950 shadow-md disabled:opacity-50 transition-all"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
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
  const [loading, setLoading] = useState(false);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
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
    if (!search.trim()) return testimonials;
    const q = search.trim().toLowerCase();
    return testimonials.filter(
      (t) =>
        t.clientName?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.testimonial?.toLowerCase().includes(q),
    );
  }, [testimonials, search]);

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

      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/20 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/event-media/gallery')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === 'gallery'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] text-slate-950 font-black shadow-md'
                  : 'border border-amber-500/20 bg-[#080C14] text-slate-300 hover:text-white hover:border-amber-500/40'
              }`}
            >
              <GalleryHorizontal size={14} />
              <span>Gallery &amp; Showcase</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'gallery' ? 'bg-slate-950 text-[#F3CA52]' : 'bg-slate-800 text-slate-400'}`}>
                {galleryItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/event-media/testimonials')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === 'testimonials'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] text-slate-950 font-black shadow-md'
                  : 'border border-amber-500/20 bg-[#080C14] text-slate-300 hover:text-white hover:border-amber-500/40'
              }`}
            >
              <MessageSquare size={14} />
              <span>Client Testimonials</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'testimonials' ? 'bg-slate-950 text-[#F3CA52]' : 'bg-slate-800 text-slate-400'}`}>
                {testimonials.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => void refresh()}
            title="Refresh Records"
            className="grid h-9 w-9 place-items-center rounded-xl border border-amber-500/20 bg-[#080C14] text-slate-400 hover:text-white hover:border-amber-500/40 transition-colors shadow-md"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#D4AF37]' : ''} />
          </button>
        </div>

        {/* ── METRICS STRIP ── */}
        {tab === 'gallery' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0c121e] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Media</span>
                <span className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F3CA52]">
                  <GalleryHorizontal size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-white">{galleryItems.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">Photos and videos</p>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#0c1520] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sky-400">Photographs</span>
                <span className="h-8 w-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <ImageIcon size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-sky-400">{galleryPhotoCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">High-resolution stills</p>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#160c20] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-purple-400">Cinematic Reels</span>
                <span className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Film size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-purple-400">{galleryVideoCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Event highlight clips</p>
            </div>

            <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#181308] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F3CA52]">Featured Showcase</span>
                <span className="h-8 w-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3CA52]">
                  <Star size={16} className="fill-[#F3CA52]" />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-[#F3CA52]">{galleryFeaturedCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Landing page highlight reel</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0c121e] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Total Stories</span>
                <span className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F3CA52]">
                  <MessageSquare size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-white">{testimonials.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">Client reviews published</p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#181308] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-300">5-Star Ratings</span>
                <span className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Star size={16} className="fill-amber-300" />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-amber-300">{testimonialsFiveStarCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Flawless celebrations</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#081812] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">On Landing Page</span>
                <span className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-emerald-400">{testimonialsFeaturedCount}</p>
              <p className="mt-1 text-[11px] text-slate-400">Featured in client carousel</p>
            </div>

            <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#121620] to-[#080C14] p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#F3CA52]">Customer Satisfaction</span>
                <span className="h-8 w-8 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#F3CA52]">
                  <Quote size={16} />
                </span>
              </div>
              <p className="mt-3 font-serif text-2xl font-black text-[#F3CA52]">100%</p>
              <p className="mt-1 text-[11px] text-slate-400">Verified Kerala events</p>
            </div>
          </div>
        )}

        {/* ── TOOLBAR: Filter & Search ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-900/20 bg-[#0c121e]/90 p-3 shadow-xl backdrop-blur-md">
          {tab === 'gallery' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setUploadDialog(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] hover:brightness-110 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-95"
              >
                <Upload size={14} />
                <span>Upload Media</span>
              </button>

              <div className="inline-flex rounded-xl border border-amber-500/20 bg-[#080C14] p-1">
                {[
                  { key: 'all' as GalleryFilter, label: 'All', count: galleryItems.length },
                  { key: 'IMAGE' as GalleryFilter, label: 'Photos', count: galleryPhotoCount },
                  { key: 'VIDEO' as GalleryFilter, label: 'Videos', count: galleryVideoCount },
                  { key: 'FEATURED' as GalleryFilter, label: 'Featured', count: galleryFeaturedCount },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setGalleryFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                      galleryFilter === f.key
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] text-slate-950 font-black shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${galleryFilter === f.key ? 'bg-slate-950 text-[#F3CA52]' : 'bg-slate-800 text-slate-400'}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] hover:brightness-110 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Add Client Story</span>
            </button>
          )}

          <div className="relative min-w-[260px] flex-1 sm:max-w-sm">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'gallery' ? 'Search media title…' : 'Search client name, venue, review…'}
              className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#080C14] pl-9 pr-8 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#D4AF37]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════
            GALLERY TAB CONTENT
        ══════════════════════════════ */}
        {tab === 'gallery' && (
          <div>
            {filteredGalleryItems.length === 0 ? (
              <div className="rounded-2xl border border-amber-900/20 bg-[#0c121e]/90 p-16 text-center shadow-xl">
                <GalleryHorizontal size={40} className="mx-auto mb-3 text-slate-600" />
                <p className="text-base font-bold text-white">No gallery items found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {search ? 'Try clearing your search query.' : 'Upload photos and videos to showcase Thankam events.'}
                </p>
                <button
                  onClick={() => setUploadDialog(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] px-4 py-2 text-xs font-bold text-slate-950 shadow-md"
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
                    className="overflow-hidden rounded-2xl border border-amber-900/20 bg-[#0c121e]/90 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/40 group"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-black">
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

                      {/* Featured Badge */}
                      <div className="absolute right-2 top-2 flex gap-1">
                        {m.isFeatured && (
                          <span className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
                            ★ Featured
                          </span>
                        )}
                      </div>

                      {/* Video Indicator */}
                      {m.type === 'VIDEO' && (
                        <div className="absolute bottom-2 left-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white border border-white/20">
                            <Video size={10} /> REEL
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 space-y-2.5">
                      <div>
                        <p className="truncate text-xs font-bold text-white" title={m.title || 'Event Media'}>
                          {m.title || 'Untitled Event Media'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {fmt(m.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-900/20">
                        <button
                          type="button"
                          onClick={() => void featureMedia(m.id, m.isFeatured)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                            m.isFeatured
                              ? 'bg-amber-500/20 text-[#F3CA52] border border-amber-500/30'
                              : 'bg-[#080C14] text-slate-400 hover:text-white border border-amber-500/10'
                          }`}
                        >
                          <Star size={12} className={m.isFeatured ? 'fill-[#F3CA52]' : ''} />
                          <span>{m.isFeatured ? 'Featured' : 'Feature'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewImg(toMediaUrl(m.url))}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-[#080C14] text-slate-400 hover:text-white border border-amber-500/10"
                          title="View Media"
                        >
                          <Eye size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteMedia(m.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                          title="Delete"
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
            {filteredTestimonials.length === 0 ? (
              <div className="rounded-2xl border border-amber-900/20 bg-[#0c121e]/90 p-16 text-center shadow-xl">
                <MessageSquarePlus size={40} className="mx-auto mb-3 text-slate-600" />
                <p className="text-base font-bold text-white">No testimonials found</p>
                <p className="mt-1 text-xs text-slate-400">
                  {search ? 'Try clearing your search query.' : 'Add your first customer review or client story.'}
                </p>
                <button
                  onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] px-4 py-2 text-xs font-bold text-slate-950 shadow-md"
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
                    className="overflow-hidden rounded-2xl border border-amber-900/20 bg-[#0c121e]/90 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/40 flex flex-col justify-between"
                  >
                    <div>
                      {/* Media Banner */}
                      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-[#080C14] to-[#121927] overflow-hidden">
                        {t.mediaUrl && t.mediaType === 'VIDEO' ? (
                          <video
                            src={toMediaUrl(t.mediaUrl)}
                            className="h-full w-full object-cover"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                            onMouseLeave={(e) => {
                              const v = e.currentTarget as HTMLVideoElement;
                              v.pause();
                              v.currentTime = 0;
                            }}
                          />
                        ) : t.mediaUrl ? (
                          <img
                            src={toMediaUrl(t.mediaUrl)}
                            alt={t.clientName ?? ''}
                            className="h-full w-full cursor-pointer object-cover transition-transform duration-300 hover:scale-105"
                            onClick={() => setViewImg(toMediaUrl(t.mediaUrl!))}
                          />
                        ) : (
                          <span className="font-serif text-5xl font-black text-amber-500/10">
                            {(t.clientName ?? 'CL')
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}

                        {/* Featured Badge */}
                        <div className="absolute right-2 top-2">
                          {t.isFeatured && (
                            <span className="rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3CA52] px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-md">
                              ★ On Landing Page
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-white text-sm font-serif">
                              {t.clientName || '—'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {t.title || 'Event Client'} &bull; {fmt(t.createdAt)}
                            </p>
                          </div>
                          <StarRow rating={t.rating ?? 5} size={14} />
                        </div>

                        {t.testimonial && (
                          <div className="relative pl-3 border-l-2 border-[#D4AF37]/50">
                            <p className="text-xs italic text-slate-300 line-clamp-3 leading-relaxed">
                              &ldquo;{t.testimonial}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 pt-0">
                      <div className="flex items-center gap-1.5 pt-3 border-t border-amber-900/20">
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
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/20 bg-[#080C14] py-1.5 text-[11px] font-bold text-slate-300 hover:text-white hover:border-amber-500/40 transition-all"
                        >
                          <Edit3 size={12} /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void featureTestimonial(t.id, t.isFeatured)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                            t.isFeatured
                              ? 'bg-amber-500/20 text-[#F3CA52] border border-amber-500/30'
                              : 'bg-[#080C14] text-slate-400 hover:text-white border border-amber-500/10'
                          }`}
                        >
                          <Star size={12} className={t.isFeatured ? 'fill-[#F3CA52]' : ''} />
                          <span>{t.isFeatured ? 'Featured' : 'Feature'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteTestimonial(t.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                          title="Delete"
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
      </div>
    </PageShell>
  );
}
