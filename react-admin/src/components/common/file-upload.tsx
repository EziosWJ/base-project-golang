import { Upload, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { uploadFile } from "@/api/file";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import type { FileRecord, FileUploadOptions } from "@/types/file";

type FileUploadProps = FileUploadOptions & {
  accept?: string;
  disabled?: boolean;
  buttonText?: string;
  helperText?: string;
  className?: string;
  onUploaded?: (file: FileRecord) => void;
  onAccessUrlChange?: (accessUrl: string, file: FileRecord) => void;
};

function getErrorMessage(error: unknown) {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "文件上传失败";
}

export function FileUpload({
  accept,
  disabled = false,
  buttonText = "选择文件",
  helperText,
  businessModule,
  remark,
  className,
  onUploaded,
  onAccessUrlChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedName(file.name);
    setErrorMessage("");
    setUploading(true);

    try {
      const uploadedFile = await uploadFile(file, {
        businessModule,
        remark,
      });
      onUploaded?.(uploadedFile);
      onAccessUrlChange?.(uploadedFile.accessUrl, uploadedFile);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleClear = () => {
    setSelectedName("");
    setErrorMessage("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || uploading}
          className="sr-only"
          onChange={handleSelect}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || uploading}
          className={cn(uploading && "cursor-wait")}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? "上传中..." : buttonText}
        </Button>
        {selectedName && (
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary">
            <span className="max-w-[240px] truncate">{selectedName}</span>
            <button
              type="button"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-tertiary hover:bg-slate-100 hover:text-text-primary"
              disabled={uploading}
              onClick={handleClear}
              aria-label="清除已选文件"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
      {helperText && (
        <p className="text-xs leading-5 text-text-tertiary">{helperText}</p>
      )}
      {errorMessage && (
        <p className="text-xs leading-5 text-error">{errorMessage}</p>
      )}
    </div>
  );
}
