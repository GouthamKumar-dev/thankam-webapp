import {
  Camera,
  CheckCheck,
  Edit3,
  Eye,
  GalleryHorizontal,
  ImagePlus,
  Layers3,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageShell } from '@/layouts/page-shell';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { toMediaUrl } from '@/utils/media-url';
import { eventMediaService, EventSelfieRow, EventReviewRow } from '@/features/event-media/event-media.service';
import { galleryService, MediaRow } from '@/features/gallery/gallery.service';
import { websiteReviewService, ReviewRow, CreateReviewPayload } from '@/features/website-review/website-review.service';
import { uploadService } from '@/features/upload/upload.service';

type Tab = 'selfies' | 'reviews' | 'staff' | 'testimonials' | 'gallery';
type GalleryFilter = 'all' | 'IMAGE' | 'VIDEO';

const SECTION_META: Record<Tab, { title: string; subtitle: string }> = {
  gallery: {
    title: 'Gallery',
    subtitle: 'Upload and manage photos or videos displayed in the customer gallery.',
  },
  testimonials: {
    title: 'Testimonials',
    subtitle: 'Manage featured client stories displayed on the landing page.',
  },
  selfies: {
    title: 'Selfies',
    subtitle: 'Review and curate selfies submitted by customers.',
  },
  reviews: {
    title: 'Reviews',
    subtitle: 'Approve and feature customer reviews submitted after events.',
  },
  staff: {
    title: 'Staff Uploads',
    subtitle: 'Review media submitted by staff before publishing it to the gallery.',
  },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ approved, featured }: { approved: boolean; featured: boolean }) {
  if (featured) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">★ Featured</span>;
  if (approved) return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Approved</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Pending</span>;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={size} className={rating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </div>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star size={22} className={(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300 fill-slate-100'} />
        </button>
      ))}
    </div>
  );
}

function MediaModal({ src, onClose }: { src: string; onClose: () => void }) {
  const isVideo = /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(src) || src.includes('video');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -right-3 -top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white shadow-lg text-slate-700 hover:bg-slate-100">
          <X size={14} />
        </button>
        {isVideo ? (
          <video src={src} controls autoPlay className="w-full max-h-[85vh] rounded-2xl bg-black" />
        ) : (
          <img src={src} alt="" className="w-full max-h-[85vh] rounded-2xl object-contain bg-black" />
        )}
      </div>
    </div>
  );
}

/* ── Gallery Upload Dialog ───────────────────────────────────────── */
function GalleryUploadDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const maxFiles = 10;
  const maxFileSize = 50 * 1024 * 1024;
  const [files, setFiles]           = useState<File[]>([]);
  const [previews, setPreviews]     = useState<{ url: string; type: string }[]>([]);
  const [title, setTitle]           = useState('');
  const [isFeatured, setFeatured]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const photoCount                  = files.filter(file => file.type.startsWith('image/')).length;
  const videoCount                  = files.filter(file => file.type.startsWith('video/')).length;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!selected.length) return;

    const mediaFiles = selected.filter(file => /^(image|video)\//.test(file.type));
    const acceptedFiles = mediaFiles.filter(file => file.size <= maxFileSize);
    const existingKeys = new Set(files.map(file => `${file.name}:${file.size}:${file.lastModified}`));
    const uniqueFiles = acceptedFiles.filter(file => {
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
      toast.error('Each file must be 50 MB or smaller');
    }
    if (uniqueFiles.length > availableSlots) {
      toast.error(`A maximum of ${maxFiles} files can be uploaded at once`);
    }
    if (availableSlots <= 0) return;

    setFiles(prev => [...prev, ...uniqueFiles.slice(0, availableSlots)]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const nextPreviews = files.map(file => ({ url: URL.createObjectURL(file), type: file.type }));
    setPreviews(nextPreviews);
    return () => nextPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
  }, [files]);

  const handleUpload = async () => {
    if (!files.length) { toast.error('Select at least one file'); return; }
    setUploading(true);
    setUploadProgress(0);
    try {
      const assets = await uploadService.uploadMany(files, setUploadProgress);
      await Promise.all(assets.map(a =>
        galleryService.create({
          url: a.url,
          type: a.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
          title: title.trim() || undefined,
          isWebsiteGallery: true,
          isFeatured,
        }),
      ));
      toast.success(`${assets.length} file${assets.length > 1 ? 's' : ''} added to gallery`);
      onDone();
    } catch (error: any) { toast.error(error?.message ?? 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => { if (!uploading) onClose(); }}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0F1B3C] px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Landing Page</p>
            <p className="text-sm font-black text-white">Upload to Gallery</p>
          </div>
          <button onClick={onClose} disabled={uploading}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/60 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* File picker */}
          {previews.length === 0 ? (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-10 hover:border-[#0F1B3C]/30 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50">
                <Upload size={24} className="text-[#0F1B3C]/50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Click to select photos or videos</p>
                <p className="mt-0.5 text-xs text-slate-400">Up to 10 files per upload | 50 MB each</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                  {p.type.startsWith('video/') ? (
                    <video src={p.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removeFile(i)} disabled={uploading}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50">
                    <X size={10} />
                  </button>
                  {p.type.startsWith('video/') && (
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">VIDEO</span>
                  )}
                </div>
              ))}
              {files.length < maxFiles && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center hover:border-[#0F1B3C]/30 transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                  <Plus size={20} className="text-slate-400" />
                </button>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
          {files.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-slate-600">
                {files.length} selected | {photoCount} photo{photoCount === 1 ? '' : 's'} | {videoCount} video{videoCount === 1 ? '' : 's'}
              </p>
              <button type="button" onClick={() => setFiles([])} disabled={uploading}
                className="font-bold text-slate-400 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
                Clear all
              </button>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Title <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Wedding Ceremony 2025" />
            {files.length > 1 && <p className="mt-1 text-xs text-slate-400">This title will be applied to all selected media.</p>}
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Mark as Featured</p>
              <p className="text-xs text-slate-400">Highlighted in the gallery</p>
            </div>
            <button type="button" onClick={() => setFeatured(f => !f)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Uploading {files.length} media file{files.length === 1 ? '' : 's'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0F1B3C] transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} disabled={uploading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => void handleUpload()} disabled={uploading || !files.length}
            className="flex items-center gap-2 rounded-xl bg-[#0F1B3C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a2d5a] disabled:opacity-60">
            {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : `Upload${files.length > 1 ? ` (${files.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Testimonial Form Modal ──────────────────────────────────────── */
const EMPTY_FORM: CreateReviewPayload = {
  clientName: '', title: '', testimonial: '', rating: 5,
  mediaUrl: undefined, mediaType: undefined, isFeatured: false,
};

function TestimonialModal({
  initial, onSave, onClose,
}: {
  initial: CreateReviewPayload & { id?: string };
  onSave: (payload: CreateReviewPayload, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm]         = useState<CreateReviewPayload>({ ...initial });
  const [preview, setPreview]   = useState<string | null>(initial.mediaUrl ? toMediaUrl(initial.mediaUrl) : null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await uploadService.uploadOne(file);
      const isVideo = file.type.startsWith('video/');
      setForm(p => ({ ...p, mediaUrl: asset.url, mediaType: isVideo ? 'VIDEO' : 'IMAGE' }));
      setPreview(toMediaUrl(asset.url));
    } catch { toast.error('Failed to upload media'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.clientName?.trim()) { toast.error('Client name is required'); return; }
    if (!form.testimonial?.trim()) { toast.error('Testimonial text is required'); return; }
    setSaving(true);
    try {
      await onSave(form, (initial as any).id);
      onClose();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0F1B3C] px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Testimonial</p>
            <p className="text-sm font-black text-white">
              {(initial as any).id ? 'Edit Testimonial' : 'Add Testimonial'}
            </p>
          </div>
          <button onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/15 bg-white/10 text-white/60 hover:bg-white/20">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo upload */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Client Photo <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            {preview ? (
              <div className="relative w-32">
                {form.mediaType === 'VIDEO' ? (
                  <video src={preview} className="w-32 h-24 rounded-xl object-cover border border-slate-200 bg-black" muted controls />
                ) : (
                  <img src={preview} alt="" className="w-32 h-24 rounded-xl object-cover border border-slate-200" />
                )}
                <button onClick={() => { setPreview(null); setForm(p => ({ ...p, mediaUrl: undefined, mediaType: undefined })); }}
                  className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white hover:bg-rose-600">
                  <X size={10} />
                </button>
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                  {form.mediaType === 'VIDEO' ? 'Video' : 'Photo'}
                </span>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-[#0F1B3C]/30 hover:text-[#0F1B3C] transition-colors disabled:opacity-60">
                <ImagePlus size={16} />
                {uploading ? 'Uploading…' : 'Upload Photo or Video'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => void handleFile(e)} />
          </div>

          {/* Name + title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Client Name *</label>
              <Input value={form.clientName ?? ''} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                placeholder="e.g. Rahul Nair" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Event Type</label>
              <Input value={form.title ?? ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Wedding Client" />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Rating</label>
            <StarSelector value={form.rating ?? 5} onChange={v => setForm(p => ({ ...p, rating: v }))} />
          </div>

          {/* Testimonial text */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Testimonial *</label>
            <Textarea value={form.testimonial ?? ''}
              onChange={e => setForm(p => ({ ...p, testimonial: e.target.value }))}
              rows={4} placeholder="Write the client's testimonial…" />
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Feature on Landing Page</p>
              <p className="text-xs text-slate-400">Shows in the testimonial carousel</p>
            </div>
            <button type="button"
              onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFeatured ? 'bg-[#0F1B3C]' : 'bg-slate-200'}`}>
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow ${form.isFeatured ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={() => void handleSave()} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#0F1B3C] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1a2d5a] disabled:opacity-60">
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Plus size={14} />}
            {saving ? 'Saving…' : (initial as any).id ? 'Save Changes' : 'Add Testimonial'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export function EventMediaPage({ section = 'gallery' }: { section?: Tab }) {
  const { confirm, confirmModal } = useConfirmModal();
  const tab = section;
  const [selfies, setSelfies]       = useState<EventSelfieRow[]>([]);
  const [reviews, setReviews]       = useState<EventReviewRow[]>([]);
  const [staffMedia, setStaff]      = useState<MediaRow[]>([]);
  const [testimonials, setTestimonials] = useState<ReviewRow[]>([]);
  const [loading, setLoading]       = useState(false);
  const [viewImg, setViewImg]       = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'featured'>('all');
  const [testimonialModal, setTestimonialModal] = useState<(CreateReviewPayload & { id?: string }) | null>(null);
  const [uploadDialog, setUploadDialog]         = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === 'selfies') {
        setSelfies(await eventMediaService.listSelfies());
      } else if (tab === 'reviews') {
        setReviews(await eventMediaService.listReviews());
      } else if (tab === 'testimonials') {
        setTestimonials(await websiteReviewService.list());
      } else {
        setStaff(await galleryService.list());
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [tab]);

  /* ── Selfie actions ── */
  const approveSelfie = async (id: string, curr: boolean) => {
    await eventMediaService.updateSelfie(id, { isApproved: !curr, isFeatured: curr ? false : undefined });
    toast.success(!curr ? 'Approved' : 'Approval removed'); void refresh();
  };
  const featureSelfie = async (id: string, curr: boolean) => {
    await eventMediaService.updateSelfie(id, { isFeatured: !curr, isApproved: !curr ? true : undefined });
    toast.success(!curr ? 'Featured' : 'Unfeatured'); void refresh();
  };
  const deleteSelfie = async (id: string) => {
    if (!await confirm({ title: 'Delete Selfie', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    await eventMediaService.removeSelfie(id); toast.success('Deleted'); void refresh();
  };

  /* ── Review actions ── */
  const approveReview = async (id: string, curr: boolean) => {
    await eventMediaService.updateReview(id, { isApproved: !curr, isFeatured: curr ? false : undefined });
    toast.success(!curr ? 'Approved' : 'Approval removed'); void refresh();
  };
  const featureReview = async (id: string, curr: boolean) => {
    await eventMediaService.updateReview(id, { isFeatured: !curr, isApproved: !curr ? true : undefined });
    toast.success(!curr ? 'Featured' : 'Unfeatured'); void refresh();
  };
  const deleteReview = async (id: string) => {
    if (!await confirm({ title: 'Delete Review', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    await eventMediaService.removeReview(id); toast.success('Deleted'); void refresh();
  };

  /* ── Staff media actions ── */
  const publishMedia = async (id: string, curr: boolean) => {
    await galleryService.update(id, { isWebsiteGallery: !curr });
    toast.success(!curr ? 'Published' : 'Unpublished'); void refresh();
  };
  const featureMedia = async (id: string, curr: boolean) => {
    await galleryService.update(id, { isFeatured: !curr });
    toast.success(!curr ? 'Featured' : 'Unfeatured'); void refresh();
  };
  const deleteMedia = async (id: string) => {
    if (!await confirm({ title: 'Delete Media', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    await galleryService.remove(id); toast.success('Deleted'); void refresh();
  };

  /* ── Testimonial actions ── */
  const saveTestimonial = async (payload: CreateReviewPayload, id?: string) => {
    if (id) {
      await websiteReviewService.update(id, payload);
      toast.success('Testimonial updated');
    } else {
      await websiteReviewService.create(payload);
      toast.success('Testimonial added');
    }
    void refresh();
  };
  const featureTestimonial = async (id: string, curr: boolean) => {
    await websiteReviewService.toggleFeatured(id, !curr);
    toast.success(!curr ? 'Now featured on landing page' : 'Removed from landing page');
    void refresh();
  };
  const deleteTestimonial = async (id: string) => {
    if (!await confirm({ title: 'Delete Testimonial', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    await websiteReviewService.remove(id); toast.success('Deleted'); void refresh();
  };

  /* ── Filters ── */
  const filteredSelfies = useMemo(() => {
    if (statusFilter === 'all') return selfies;
    if (statusFilter === 'featured') return selfies.filter(s => s.isFeatured);
    if (statusFilter === 'approved') return selfies.filter(s => s.isApproved && !s.isFeatured);
    return selfies.filter(s => !s.isApproved);
  }, [selfies, statusFilter]);

  const filteredReviews = useMemo(() => {
    if (statusFilter === 'all') return reviews;
    if (statusFilter === 'featured') return reviews.filter(r => r.isFeatured);
    if (statusFilter === 'approved') return reviews.filter(r => r.isApproved && !r.isFeatured);
    return reviews.filter(r => !r.isApproved);
  }, [reviews, statusFilter]);

  const galleryItems = staffMedia.filter(m => m.isWebsiteGallery);
  const galleryPhotoCount = galleryItems.filter(m => m.type === 'IMAGE').length;
  const galleryVideoCount = galleryItems.filter(m => m.type === 'VIDEO').length;
  const filteredGalleryItems = galleryFilter === 'all'
    ? galleryItems
    : galleryItems.filter(m => m.type === galleryFilter);

  return (
    <PageShell title={SECTION_META[tab].title} subtitle={SECTION_META[tab].subtitle}>
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
          onDone={() => { setUploadDialog(false); void refresh(); }}
        />
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-3 gap-3">
        {tab === 'gallery' ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* <button onClick={() => setUploadDialog(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F1B3C] px-4 py-2 text-sm font-bold text-white hover:bg-[#1a2d5a]">
              <Upload size={15} /> Upload to Gallery
            </button> */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              {[
                { key: 'all' as GalleryFilter, label: 'All', count: galleryItems.length },
                { key: 'IMAGE' as GalleryFilter, label: 'Photos', count: galleryPhotoCount },
                { key: 'VIDEO' as GalleryFilter, label: 'Videos', count: galleryVideoCount },
              ].map(filter => (
                <button key={filter.key} type="button" aria-pressed={galleryFilter === filter.key}
                  onClick={() => setGalleryFilter(filter.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    galleryFilter === filter.key ? 'bg-[#0F1B3C] text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  {filter.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    galleryFilter === filter.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : tab === 'testimonials' ? (
          <button onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F1B3C] px-4 py-2 text-sm font-bold text-white hover:bg-[#1a2d5a]">
            <Plus size={15} /> Add Testimonial
          </button>
        ) : tab === 'selfies' || tab === 'reviews' ? (
          <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(['all', 'pending', 'approved', 'featured'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${statusFilter === f ? 'bg-[#0F1B3C] text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                {f}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <button onClick={() => void refresh()}
          className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 flex-shrink-0">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ══════════════════════════════
          GALLERY TAB
      ══════════════════════════════ */}
      {tab === 'gallery' && (
        <div>
          {galleryItems.length === 0 ? (
            <EmptyState
              icon={<GalleryHorizontal size={32} className="text-slate-300" />}
              text="No gallery items yet"
              action={
                <button onClick={() => setUploadDialog(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#0F1B3C]/20 px-4 py-2 text-xs font-bold text-[#0F1B3C] hover:bg-[#0F1B3C]/5">
                  <Upload size={13} /> Upload your first photo or video
                </button>
              }
            />
          ) : filteredGalleryItems.length === 0 ? (
            <EmptyState
              icon={galleryFilter === 'VIDEO'
                ? <Video size={32} className="text-slate-300" />
                : <GalleryHorizontal size={32} className="text-slate-300" />}
              text={galleryFilter === 'VIDEO' ? 'No videos in the gallery yet' : 'No photos in the gallery yet'}
              action={
                <button onClick={() => setUploadDialog(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#0F1B3C]/20 px-4 py-2 text-xs font-bold text-[#0F1B3C] hover:bg-[#0F1B3C]/5">
                  <Upload size={13} /> Upload photos or videos
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGalleryItems.map(m => (
                <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative">
                    {m.type === 'IMAGE' ? (
                      <img src={toMediaUrl(m.url)} alt={m.title ?? ''}
                        className="aspect-square w-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setViewImg(toMediaUrl(m.url))} />
                    ) : (
                      <video
                        src={toMediaUrl(m.url)}
                        className="aspect-square w-full object-cover cursor-pointer"
                        muted playsInline
                        onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                        onClick={() => setViewImg(toMediaUrl(m.url))}
                      />
                    )}
                    <div className="absolute right-2 top-2 flex gap-1">
                      {m.isFeatured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">★ Featured</span>}
                    </div>
                    {m.type === 'VIDEO' && (
                      <div className="absolute bottom-2 left-2">
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">VIDEO</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {m.title && <p className="font-semibold text-slate-800 text-sm truncate mb-0.5">{m.title}</p>}
                    <p className="text-xs text-slate-400">{fmt(m.createdAt)}</p>
                    <div className="mt-3 flex gap-1.5">
                      <button onClick={() => void featureMedia(m.id, m.isFeatured)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${m.isFeatured ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}>
                        <Star size={12} /> {m.isFeatured ? 'Featured' : 'Feature'}
                      </button>
                      <button onClick={() => void deleteMedia(m.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick upload card */}
              <button onClick={() => setUploadDialog(true)}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-3 p-8 min-h-[240px] hover:border-[#0F1B3C]/30 hover:bg-slate-50/50 transition-all">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F1B3C]/5">
                  <Upload size={22} className="text-[#0F1B3C]/50" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Upload Media</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          TESTIMONIALS TAB
      ══════════════════════════════ */}
      {tab === 'testimonials' && (
        <div className="space-y-3">
          {testimonials.length === 0 ? (
            <EmptyState
              icon={<MessageSquarePlus size={32} className="text-slate-300" />}
              text="No testimonials yet"
              action={<button onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#0F1B3C]/20 px-4 py-2 text-xs font-bold text-[#0F1B3C] hover:bg-[#0F1B3C]/5">
                <Plus size={13} /> Add your first testimonial
              </button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map(t => (
                <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Photo */}
                  <div className="relative h-44 bg-gradient-to-br from-[#0F1B3C] to-[#1a2d5a] flex items-center justify-center">
                    {t.mediaUrl && t.mediaType === 'VIDEO' ? (
                      <video src={toMediaUrl(t.mediaUrl)} className="w-full h-full object-cover" muted loop playsInline
                        onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
                    ) : t.mediaUrl ? (
                      <img src={toMediaUrl(t.mediaUrl)} alt={t.clientName ?? ''}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewImg(toMediaUrl(t.mediaUrl!))} />
                    ) : (
                      <span className="text-5xl font-black text-white/20" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {(t.clientName ?? 'CL').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    {/* Featured badge */}
                    <div className="absolute right-2 top-2">
                      {t.isFeatured && (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-[#0F1B3C]">
                          ★ On Landing Page
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-slate-800">{t.clientName || '—'}</p>
                        <p className="text-xs text-slate-400">{t.title || 'Event Client'} · {fmt(t.createdAt)}</p>
                      </div>
                      <StarRow rating={t.rating ?? 5} />
                    </div>
                    {t.testimonial && (
                      <p className="text-xs text-slate-600 italic line-clamp-2 mb-3">"{t.testimonial}"</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button onClick={() => setTestimonialModal({ id: t.id, clientName: t.clientName ?? '', title: t.title ?? '', testimonial: t.testimonial ?? '', rating: t.rating ?? 5, mediaUrl: t.mediaUrl ?? undefined, mediaType: t.mediaType ?? undefined, isFeatured: t.isFeatured })}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                        <Edit3 size={12} /> Edit
                      </button>
                      <button onClick={() => void featureTestimonial(t.id, t.isFeatured)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${t.isFeatured ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}>
                        <Star size={12} /> {t.isFeatured ? 'Featured' : 'Feature'}
                      </button>
                      <button onClick={() => void deleteTestimonial(t.id)}
                        className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add new card */}
              <button onClick={() => setTestimonialModal({ ...EMPTY_FORM })}
                className="rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-3 p-8 min-h-[300px] hover:border-[#0F1B3C]/30 hover:bg-slate-50/50 transition-all">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F1B3C]/5">
                  <Plus size={22} className="text-[#0F1B3C]/50" />
                </div>
                <p className="text-sm font-semibold text-slate-400">Add Testimonial</p>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          SELFIES TAB
      ══════════════════════════════ */}
      {tab === 'selfies' && (
        <div>
          {filteredSelfies.length === 0
            ? <EmptyState icon={<Camera size={32} className="text-slate-300" />} text="No selfies yet" />
            : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSelfies.map(s => (
                  <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative">
                      <img src={toMediaUrl(s.imageUrl)} alt={s.customerName}
                        className="aspect-square w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setViewImg(toMediaUrl(s.imageUrl))} />
                      <div className="absolute right-2 top-2">
                        <StatusBadge approved={s.isApproved} featured={s.isFeatured} />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-slate-800 text-sm">{s.customerName}</p>
                      <p className="text-xs text-slate-400">{s.phone} · {fmt(s.createdAt)}</p>
                      <div className="mt-3 flex gap-1.5">
                        <button onClick={() => void approveSelfie(s.id, s.isApproved)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${s.isApproved ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                          <CheckCheck size={13} /> {s.isApproved ? 'Approved' : 'Approve'}
                        </button>
                        <button onClick={() => void featureSelfie(s.id, s.isFeatured)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${s.isFeatured ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}>
                          <Star size={13} /> {s.isFeatured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => void deleteSelfie(s.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ══════════════════════════════
          CUSTOMER REVIEWS TAB
      ══════════════════════════════ */}
      {tab === 'reviews' && (
        <div className="space-y-3">
          {filteredReviews.length === 0
            ? <EmptyState icon={<Star size={32} className="text-slate-300" />} text="No reviews yet" />
            : filteredReviews.map(r => (
              <div key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-4 p-4">
                  {r.imageUrl && (
                    <img src={toMediaUrl(r.imageUrl)} alt="" onClick={() => setViewImg(toMediaUrl(r.imageUrl!))}
                      className="h-20 w-20 shrink-0 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-bold text-slate-800">{r.customerName}</p>
                        <p className="text-xs text-slate-400">{r.phone} · {fmt(r.createdAt)}</p>
                      </div>
                      <StatusBadge approved={r.isApproved} featured={r.isFeatured} />
                    </div>
                    <StarRow rating={r.rating} />
                    <p className="mt-2 text-sm text-slate-700 line-clamp-3">{r.reviewText}</p>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-slate-100 px-4 py-2.5">
                  <button onClick={() => void approveReview(r.id, r.isApproved)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${r.isApproved ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                    <CheckCheck size={13} /> {r.isApproved ? 'Approved' : 'Approve'}
                  </button>
                  <button onClick={() => void featureReview(r.id, r.isFeatured)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${r.isFeatured ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}>
                    <Star size={13} /> {r.isFeatured ? 'Featured' : 'Feature'}
                  </button>
                  <button onClick={() => void deleteReview(r.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-100">
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ══════════════════════════════
          STAFF MEDIA TAB
      ══════════════════════════════ */}
      {tab === 'staff' && (
        <div>
          {staffMedia.filter(m => !m.isWebsiteGallery).length === 0
            ? <EmptyState icon={<Layers3 size={32} className="text-slate-300" />} text="No pending staff uploads" />
            : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {staffMedia.filter(m => !m.isWebsiteGallery).map(m => (
                  <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative">
                      {m.type === 'IMAGE' ? (
                        <img src={toMediaUrl(m.url)} alt={m.title ?? ''}
                          className="aspect-square w-full object-cover cursor-pointer hover:opacity-90"
                          onClick={() => setViewImg(toMediaUrl(m.url))} />
                      ) : (
                        <div className="aspect-square w-full bg-slate-900 flex flex-col items-center justify-center cursor-pointer"
                          onClick={() => setViewImg(toMediaUrl(m.thumbnailUrl ?? m.url))}>
                          <Video size={32} className="text-white/60 mb-2" />
                          <p className="text-xs text-white/40">Video</p>
                        </div>
                      )}
                      <div className="absolute right-2 top-2 flex gap-1">
                        {m.isFeatured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">★ Featured</span>}
                        {!m.isWebsiteGallery && <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-white">Pending</span>}
                      </div>
                    </div>
                    <div className="p-3">
                      {m.title && <p className="font-semibold text-slate-800 text-sm truncate">{m.title}</p>}
                      <p className="text-xs text-slate-400">{fmt(m.createdAt)}</p>
                      <div className="mt-3 flex gap-1.5">
                        <button onClick={() => void publishMedia(m.id, m.isWebsiteGallery)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${m.isWebsiteGallery ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                          <Eye size={13} /> {m.isWebsiteGallery ? 'Published' : 'Publish'}
                        </button>
                        <button onClick={() => void featureMedia(m.id, m.isFeatured)}
                          className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${m.isFeatured ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'}`}>
                          <Star size={13} /> {m.isFeatured ? 'Featured' : 'Feature'}
                        </button>
                        <button onClick={() => void deleteMedia(m.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}
    </PageShell>
  );
}

function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16">
      {icon}
      <p className="mt-3 text-sm text-slate-400">{text}</p>
      {action}
    </div>
  );
}
