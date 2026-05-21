import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  MessageSquarePlus,
  Pencil,
  Star,
  Trash2,
  Globe,
  Image as ImageIcon,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/layouts/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormDialog } from '@/components/common/form-dialog';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { websiteReviewService, ReviewRow, CreateReviewPayload } from '@/features/website-review/website-review.service';
import { galleryService, MediaRow } from '@/features/gallery/gallery.service';
import { toMediaUrl } from '@/utils/media-url';

const EMPTY_FORM: CreateReviewPayload = {
  clientName: '',
  title: '',
  testimonial: '',
  rating: 5,
  mediaUrl: '',
  mediaType: undefined,
  isFeatured: false,
};

export function WebsiteReviewPage() {
  const { confirm, confirmModal } = useConfirmModal();

  /* reviews */
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);
  const [form, setForm] = useState<CreateReviewPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* gallery */
  const [gallery, setGallery] = useState<MediaRow[]>([]);
  const [galleryTab, setGalleryTab] = useState<'all' | 'website' | 'featured'>('all');

  /* media picker inside review form */
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const refreshReviews = () => void websiteReviewService.list().then(setReviews);
  const refreshGallery = () => void galleryService.list().then(setGallery);

  useEffect(() => {
    refreshReviews();
    refreshGallery();
  }, []);

  /* ---------- Reviews CRUD ---------- */
  function openNewReview() {
    setEditingReview(null);
    setForm(EMPTY_FORM);
    setReviewDialogOpen(true);
  }

  function openEditReview(r: ReviewRow) {
    setEditingReview(r);
    setForm({
      clientName: r.clientName ?? '',
      title: r.title ?? '',
      testimonial: r.testimonial ?? '',
      rating: r.rating ?? 5,
      mediaUrl: r.mediaUrl ?? '',
      mediaType: r.mediaType ?? undefined,
      isFeatured: r.isFeatured,
    });
    setReviewDialogOpen(true);
  }

  async function saveReview() {
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
      if (editingReview) {
        await websiteReviewService.update(editingReview.id, form);
        toast.success('Review updated');
      } else {
        await websiteReviewService.create(form);
        toast.success('Review added');
      }
      setReviewDialogOpen(false);
      refreshReviews();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to save review');
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(id: string) {
    const ok = await confirm({
      title: 'Delete Review',
      description: 'This testimonial will be permanently removed from the website.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await websiteReviewService.remove(id);
      toast.success('Review deleted');
      refreshReviews();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Delete failed');
    }
  }

  async function toggleReviewFeatured(r: ReviewRow) {
    try {
      await websiteReviewService.toggleFeatured(r.id, !r.isFeatured);
      toast.success(r.isFeatured ? 'Hidden from website' : 'Now visible on website');
      refreshReviews();
    } catch {
      toast.error('Failed to update');
    }
  }

  /* ---------- Gallery Flag Toggles ---------- */
  async function toggleGalleryWebsite(row: MediaRow) {
    try {
      await galleryService.update(row.id, { isWebsiteGallery: !row.isWebsiteGallery });
      toast.success(row.isWebsiteGallery ? 'Removed from website gallery' : 'Added to website gallery');
      refreshGallery();
    } catch {
      toast.error('Failed to update');
    }
  }

  async function toggleGalleryFeatured(row: MediaRow) {
    try {
      await galleryService.update(row.id, { isFeatured: !row.isFeatured });
      toast.success(row.isFeatured ? 'Unfeatured' : 'Set as featured');
      refreshGallery();
    } catch {
      toast.error('Failed to update');
    }
  }

  /* ---------- Media picker for review ---------- */
  function pickMedia(row: MediaRow) {
    setForm((prev) => ({
      ...prev,
      mediaUrl: row.url,
      mediaType: row.type,
    }));
    setMediaPickerOpen(false);
  }

  const filteredGallery = gallery.filter((g) => {
    if (galleryTab === 'website') return g.isWebsiteGallery;
    if (galleryTab === 'featured') return g.isFeatured;
    return true;
  });

  const featuredCount = reviews.filter((r) => r.isFeatured).length;
  const websiteGalleryCount = gallery.filter((g) => g.isWebsiteGallery).length;

  return (
    <PageShell
      title="Website Content"
      subtitle="Manage testimonials and gallery items shown on the public landing page"
    >
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
            <Star size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{reviews.length}</p>
            <p className="text-sm text-slate-500">Total Reviews</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-100 text-green-600">
            <Globe size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{featuredCount}</p>
            <p className="text-sm text-slate-500">Featured on Website</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600">
            <ImageIcon size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{websiteGalleryCount}</p>
            <p className="text-sm text-slate-500">Gallery Items on Website</p>
          </div>
        </Card>
      </div>

      {/* ---- Testimonials Section ---- */}
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Client Testimonials</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Toggle the eye icon to show / hide reviews on the website. Featured reviews appear in the testimonials section.
            </p>
          </div>
          <Button onClick={openNewReview} className="gap-2">
            <MessageSquarePlus size={16} /> Add Review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Star size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No testimonials yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first client review to display it on the website.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className={`relative overflow-hidden rounded-2xl border transition-all ${
                  r.isFeatured
                    ? 'border-amber-300 bg-amber-50 shadow-[0_4px_20px_rgba(251,191,36,0.2)]'
                    : 'border-border bg-white'
                }`}
              >
                {r.isFeatured && (
                  <div className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </div>
                )}

                {/* Media thumbnail */}
                {r.mediaUrl && (
                  <div className="h-36 w-full overflow-hidden bg-slate-100">
                    {r.mediaType === 'VIDEO' ? (
                      <video src={toMediaUrl(r.mediaUrl)} className="h-full w-full object-cover" />
                    ) : (
                      <img src={toMediaUrl(r.mediaUrl)} alt={r.clientName ?? ''} className="h-full w-full object-cover" />
                    )}
                  </div>
                )}

                <div className="p-4">
                  {/* Stars */}
                  <div className="mb-2 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < (r.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-slate-700">
                    "{r.testimonial || 'No testimonial text.'}"
                  </p>

                  <div className="mt-3">
                    <p className="text-sm font-bold text-slate-900">{r.clientName || '—'}</p>
                    <p className="text-xs text-slate-500">{r.title || 'Event Client'}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => void toggleReviewFeatured(r)}
                      title={r.isFeatured ? 'Hide from website' : 'Show on website'}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        r.isFeatured
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {r.isFeatured ? <Eye size={13} /> : <EyeOff size={13} />}
                      {r.isFeatured ? 'On Website' : 'Hidden'}
                    </button>
                    <div className="flex gap-2">
                      <Button variant="outline" className="h-8 w-8 p-0" onClick={() => openEditReview(r)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="danger" className="h-8 w-8 p-0" onClick={() => void deleteReview(r.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ---- Gallery Content Management ---- */}
      <Card>
        <div className="mb-5">
          <h3 className="text-xl font-bold tracking-tight">Gallery Content</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Control which uploaded media appears in the website gallery. Use the toggles to enable/disable items.
          </p>
        </div>

        {/* Tab Filter */}
        <div className="mb-4 inline-flex rounded-xl border border-border bg-slate-50 p-1 text-sm font-semibold">
          {(['all', 'website', 'featured'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setGalleryTab(tab)}
              className={`rounded-lg px-4 py-1.5 capitalize transition-all ${
                galleryTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'all' ? 'All Uploads' : tab === 'website' ? 'On Website' : 'Featured'}
            </button>
          ))}
        </div>

        {filteredGallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <ImageIcon size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No media found</p>
            <p className="mt-1 text-sm text-slate-500">Staff can upload event photos and videos from their portal.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredGallery.map((row) => (
              <div
                key={row.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  row.isWebsiteGallery ? 'border-blue-300 shadow-sm' : 'border-border'
                }`}
              >
                <div className="relative h-40 bg-slate-100">
                  {row.type === 'IMAGE' ? (
                    <img src={toMediaUrl(row.url)} alt={row.title ?? 'media'} className="h-full w-full object-cover" />
                  ) : (
                    <video src={toMediaUrl(row.url)} className="h-full w-full object-cover" />
                  )}
                  {row.isFeatured && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">
                      Featured
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.title || 'Untitled'}</p>
                  <p className="text-xs text-slate-400 capitalize">{row.type.toLowerCase()}</p>

                  {/* Website Gallery Toggle */}
                  <button
                    onClick={() => void toggleGalleryWebsite(row)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      row.isWebsiteGallery
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe size={12} /> Website Gallery
                    </span>
                    {row.isWebsiteGallery ? <ToggleRight size={16} className="text-blue-600" /> : <ToggleLeft size={16} />}
                  </button>

                  {/* Featured Toggle */}
                  <button
                    onClick={() => void toggleGalleryFeatured(row)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      row.isFeatured
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Star size={12} /> Hero Featured
                    </span>
                    {row.isFeatured ? <ToggleRight size={16} className="text-amber-500" /> : <ToggleLeft size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ---- Add / Edit Review Dialog ---- */}
      <FormDialog
        title={editingReview ? 'Edit Testimonial' : 'Add Testimonial'}
        description="This review will appear in the testimonials section on the public website when featured."
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Client Name *
              </label>
              <Input
                placeholder="Rahul & Priya"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event / Title
              </label>
              <Input
                placeholder="Wedding Couple, Birthday Party..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Testimonial *
            </label>
            <Textarea
              rows={4}
              placeholder="Write the client's review in their own words..."
              value={form.testimonial}
              onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={24}
                    className={n <= (form.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                  />
                </button>
              ))}
              <span className="ml-2 self-center text-sm font-semibold text-slate-600">{form.rating}/5</span>
            </div>
          </div>

          {/* Media attachment */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attach Photo / Video (optional)
            </label>
            {form.mediaUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <div className="h-32 bg-slate-100">
                  {form.mediaType === 'VIDEO' ? (
                    <video src={toMediaUrl(form.mediaUrl)} className="h-full w-full object-cover" />
                  ) : (
                    <img src={toMediaUrl(form.mediaUrl)} alt="selected" className="h-full w-full object-cover" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, mediaUrl: '', mediaType: undefined })}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-slate-50 py-6 text-sm font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700"
              >
                <ImageIcon size={16} /> Pick from gallery
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="review-featured"
              checked={form.isFeatured}
              onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              className="h-4 w-4 rounded accent-teal-600"
            />
            <label htmlFor="review-featured" className="text-sm font-semibold text-slate-700">
              Show on website immediately
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveReview()} disabled={saving}>
              {saving ? 'Saving...' : editingReview ? 'Update Review' : 'Add Review'}
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* ---- Media Picker Dialog ---- */}
      <FormDialog
        title="Pick from Gallery"
        description="Select a photo or video from the uploaded gallery to attach to this testimonial."
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
      >
        <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto pr-1">
          {gallery.length === 0 ? (
            <p className="col-span-3 py-8 text-center text-sm text-slate-500">No gallery items yet.</p>
          ) : (
            gallery.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => pickMedia(g)}
                className="group overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-teal-400 focus:border-teal-500 focus:outline-none"
              >
                <div className="h-24 bg-slate-100">
                  {g.type === 'IMAGE' ? (
                    <img src={toMediaUrl(g.url)} alt={g.title ?? ''} className="h-full w-full object-cover" />
                  ) : (
                    <video src={toMediaUrl(g.url)} className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="truncate bg-white p-1 text-[11px] text-slate-600">{g.title || 'Untitled'}</p>
              </button>
            ))
          )}
        </div>
      </FormDialog>

      {confirmModal}
    </PageShell>
  );
}
