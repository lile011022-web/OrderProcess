import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

export function UploadBox({ label, required }: { label: string; required?: boolean }) {
  const [preview, setPreview] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</p>
      <button type="button" onClick={() => inputRef.current?.click()} className="flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white/70 text-slate-500">
        {preview ? <img src={preview} className="h-full w-full object-cover" alt={label} /> : <span className="flex flex-col items-center gap-2 text-sm font-bold"><ImagePlus size={24} />上传图片</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
      />
    </div>
  );
}
