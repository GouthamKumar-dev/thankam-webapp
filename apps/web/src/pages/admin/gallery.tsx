import { useEffect, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/common/file-upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CreateGalleryPayload,
  galleryService,
  MediaRow,
} from '@/features/gallery/gallery.service';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { uploadService } from '@/features/upload/upload.service';
import { PageShell } from '@/layouts/page-shell';
import { toMediaUrl } from '@/utils/media-url';

type GalleryFlags = {
  isWebsiteGallery: boolean;
  isSocialContent: boolean;
  isFeatured: boolean;
};

const defaultFlags: GalleryFlags = {
  isWebsiteGallery: true,
  isSocialContent: false,
  isFeatured: false,
};

export function GalleryPage() {
  const { confirm, confirmModal } = useConfirmModal();
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flags, setFlags] = useState<GalleryFlags>(defaultFlags);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const refresh = () => void galleryService.list().then(setRows);

  useEffect(() => {
    refresh();
  }, []);

  const onUpload = async () => {
    if (files.length === 0) {
      toast.error('Select image or video files to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadService.uploadMany(files, setUploadProgress);
      const payloads: CreateGalleryPayload[] = uploaded.map((asset) => ({
        title: title || asset.originalName,
        description: description || undefined,
        type: asset.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        url: asset.url,
        ...flags,
      }));

      await Promise.all(payloads.map((payload) => galleryService.create(payload)));
      toast.success(`${uploaded.length} file(s) uploaded successfully`);
      setFiles([]);
      setTitle('');
      setDescription('');
      setFlags(defaultFlags);
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onDelete = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete Media',
      description: 'Are you sure you want to delete this media item?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!accepted) return;
    try {
      await galleryService.remove(id);
      toast.success('Media deleted');
      refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Delete failed');
    }
  };

  return (
    <PageShell title="Gallery" subtitle="Upload and curate images/videos for site and social media">
      <Card>
        <h3 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight">
          <Upload size={18} /> Upload Media
        </h3>

        <div className="space-y-3">
          <FileUpload files={files} onFilesChange={setFiles} />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional, used for all selected files)"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={flags.isWebsiteGallery}
                onChange={(e) =>
                  setFlags((prev) => ({ ...prev, isWebsiteGallery: e.target.checked }))
                }
              />
              Website Gallery
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={flags.isSocialContent}
                onChange={(e) =>
                  setFlags((prev) => ({ ...prev, isSocialContent: e.target.checked }))
                }
              />
              Social Content
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={flags.isFeatured}
                onChange={(e) => setFlags((prev) => ({ ...prev, isFeatured: e.target.checked }))}
              />
              Featured
            </label>
          </div>

          {uploading ? (
            <div className="text-sm text-slate-600">Uploading... {uploadProgress}%</div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={() => void onUpload()} disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading...' : 'Upload & Save'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-xl font-bold tracking-tight">Uploaded Media</h3>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">No uploads yet</p>
            <p className="mt-1 text-sm text-slate-500">Upload images/videos to build your gallery.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => (
              <div key={row.id} className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="h-40 bg-slate-100">
                  {row.type === 'IMAGE' ? (
                    <img src={toMediaUrl(row.url)} alt={row.title ?? 'media'} className="h-full w-full object-cover" />
                  ) : (
                    <video src={toMediaUrl(row.url)} className="h-full w-full object-cover" controls />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-semibold">{row.title || 'Untitled'}</p>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {row.isWebsiteGallery ? <Tag label="Website" /> : null}
                    {row.isSocialContent ? <Tag label="Social" /> : null}
                    {row.isFeatured ? <Tag label="Featured" /> : null}
                  </div>
                  <Button variant="danger" className="h-8 w-full" onClick={() => void onDelete(row.id)}>
                    <Trash2 size={14} className="mr-2" /> Delete
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

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
      {label}
    </span>
  );
}
