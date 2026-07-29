import { Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { uploadFile } from "@/api/file";
import { toast } from "@/components/common/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DictSelectOption } from "@/constants/dicts";
import type { FileRecord } from "@/types";
import { getErrorMessage } from "@/lib/api-error";

type FileUploadDialogProps = {
  open: boolean;
  businessModuleOptions: DictSelectOption[];
  onCancel: () => void;
  onUploaded: (record: FileRecord) => void;
};

export function FileUploadDialog({
  open,
  businessModuleOptions,
  onCancel,
  onUploaded,
}: FileUploadDialogProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [businessModule, setBusinessModule] = useState("");
  const [remark, setRemark] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open, uploading]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBusinessModule("");
      setRemark("");
      setError("");
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("请选择文件");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const record = await uploadFile(file, {
        businessModule: businessModule.trim() || undefined,
        remark: remark.trim() || undefined,
      });
      toast.success("文件上传成功");
      onUploaded(record);
      onCancel();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "文件上传失败"));
    } finally {
      setUploading(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) {
          onCancel();
        }
      }}
    >
      <section
        className="max-h-[calc(100vh-48px)] w-full max-w-[520px] overflow-hidden rounded-admin border border-border bg-surface shadow-admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            上传文件
          </h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={uploading}
            onClick={onCancel}
            aria-label="关闭上传弹窗"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <form className="px-5 py-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                文件 <span className="ml-1 text-error">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  选择文件
                </Button>
                <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                  {file ? file.name : "未选择文件"}
                </span>
                {file && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    disabled={uploading}
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="清除文件"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="upload-business-module"
                className="block text-sm font-medium text-text-primary"
              >
                业务模块
              </label>
              {businessModuleOptions.length > 0 ? (
                <Select
                  id="upload-business-module"
                  value={businessModule}
                  onChange={(event) => setBusinessModule(event.target.value)}
                  disabled={uploading}
                >
                  <option value="">请选择业务模块</option>
                  {businessModuleOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id="upload-business-module"
                  value={businessModule}
                  onChange={(event) => setBusinessModule(event.target.value)}
                  disabled={uploading}
                  placeholder="例如：user、system-config"
                />
              )}
              <p className="min-h-[18px] text-xs text-text-tertiary">
                可选，用于标识文件所属业务
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="upload-remark"
                className="block text-sm font-medium text-text-primary"
              >
                备注
              </label>
              <Textarea
                id="upload-remark"
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                disabled={uploading}
                placeholder="补充说明"
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}
          </div>

          <footer className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={onCancel}
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !file}
            >
              {uploading ? "上传中..." : "上传"}
            </Button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
