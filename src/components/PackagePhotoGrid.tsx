import { FileImage } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchUploadBlob, listUploadsApi, type UploadRecord } from "../utils/api";

type PhotoPreview = UploadRecord & {
  objectUrl?: string;
};

export function PackagePhotoGrid({ packageId }: { packageId: string }) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    setLoading(true);
    listUploadsApi("package", packageId)
      .then(async (result) => {
        const previews = await Promise.all(result.data.map(async (upload) => {
          if (!upload.mimeType.startsWith("image/")) return upload;
          try {
            const blob = await fetchUploadBlob(upload.id);
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            return { ...upload, objectUrl };
          } catch {
            return upload;
          }
        }));
        if (active) setPhotos(previews);
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [packageId]);

  if (loading) return <p className="text-sm font-bold text-slate-400">正在加载照片...</p>;
  if (!photos.length) return <p className="text-sm font-bold text-slate-400">暂无照片</p>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <div key={photo.id} className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
          {photo.objectUrl ? (
            <img src={photo.objectUrl} alt={photo.filename} className="h-28 w-full object-cover" />
          ) : (
            <div className="grid h-28 place-items-center text-slate-400"><FileImage size={28} /></div>
          )}
          <div className="p-3">
            <p className="truncate text-xs font-black text-ink">{photo.filename}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">{Math.ceil(photo.size / 1024)} KB</p>
          </div>
        </div>
      ))}
    </div>
  );
}
