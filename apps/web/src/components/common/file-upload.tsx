import { useEffect, useMemo } from 'react';
import { Button } from '../ui/button';

type FileUploadProps = {
  accept?: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
};

export function FileUpload({ accept = 'image/*,video/*', multiple = true, files, onFilesChange }: FileUploadProps) {
  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), type: file.type })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews],
  );

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => onFilesChange(Array.from(e.target.files ?? []))}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {previews.map((preview) => (
          <div key={preview.name} className="overflow-hidden rounded-md border border-border">
            {preview.type.startsWith('image/') ? (
              <img src={preview.url} alt={preview.name} className="h-24 w-full object-cover" />
            ) : (
              <video src={preview.url} className="h-24 w-full object-cover" />
            )}
            <p className="truncate p-2 text-xs">{preview.name}</p>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={() => onFilesChange([])}>
        Clear
      </Button>
    </div>
  );
}
