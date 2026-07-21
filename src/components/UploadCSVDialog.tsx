"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CsvRow {
  name?: string;
  phone_number?: string;
  tags?: string;
  [key: string]: string | undefined;
}

interface UploadResult {
  inserted: number;
  errors?: Array<{ row: number; reason: string }>;
}

export function UploadCSVDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file.");
      return;
    }

    setFile(file);
    setResult(null);

    // Parse a preview (first 5 rows) for the user to review
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete(results) {
        if (results.data.length === 0) {
          toast.error("The CSV file appears to be empty.");
          setFile(null);
          return;
        }
        setPreview(results.data);
      },
      error() {
        toast.error("Failed to parse the CSV file.");
        setFile(null);
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  }

  /**
   * Normalise a phone number to E.164 format (+ and digits only).
   * Strips spaces, dashes, parens, dots and ensures a + prefix.
   */
  function normalisePhone(raw: string | undefined): string {
    if (!raw) return "";
    // Strip everything except digits
    const digits = raw.replace(/[^\d]/g, "");
    if (!digits) return "";
    // If it starts with "00", replace with +
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    // If it already had a + in the original, keep it
    if (raw.trim().startsWith("+")) return `+${digits}`;
    // Otherwise assume it needs a +
    return `+${digits}`;
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      // Parse the full file
      const parsed = await new Promise<Papa.ParseResult<CsvRow>>(
        (resolve, reject) => {
          Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          });
        }
      );

      // Map CSV columns → API format
      const contacts = parsed.data
        .filter((row) => {
          // Must have a phone-like value in at least one column
          return Object.values(row).some(
            (v) => v && v.replace(/[\s\-\(\)\.]/g, "").length >= 7
          );
        })
        .map((row) => {
          // Try to find the phone number column (common names)
          const phoneKey =
            Object.keys(row).find((k) =>
              /phone|mobile|cell|tel|number|whatsapp/i.test(k)
            ) || Object.keys(row)[0];

          // Try to find the name column
          const nameKey = Object.keys(row).find((k) =>
            /name|full.?name|first.?name|last.?name|contact/i.test(k)
          );

          // Try to find the tags column
          const tagsKey = Object.keys(row).find((k) =>
            /tag|label|group|category/i.test(k)
          );

          return {
            phone_number: normalisePhone(row[phoneKey]),
            name: nameKey ? (row[nameKey]?.trim() ?? null) : null,
            tags: tagsKey
              ? (row[tagsKey] ?? "")
                  .split(/[,;|]/)
                  .map((t: string) => t.trim().toLowerCase())
                  .filter(Boolean)
              : [],
          };
        })
        .filter((c) => c.phone_number.length > 7);

      if (contacts.length === 0) {
        toast.error(
          "No valid phone numbers found in the CSV. Make sure there's a column with phone numbers."
        );
        setLoading(false);
        return;
      }

      // Send to the bulk-insert API
      const res = await fetch("/api/contacts/bulk-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      const data: UploadResult & { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult({ inserted: data.inserted, errors: data.errors });
      toast.success(`${data.inserted} contacts imported successfully!`);
      router.refresh();
    } catch (error) {
      console.error("CSV upload error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload CSV. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setFile(null);
    setPreview([]);
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && (v ? setOpen(true) : handleClose())}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your contacts. We&apos;ll auto-detect the
            phone number and name columns.
          </DialogDescription>
        </DialogHeader>

        {/* CSV format hint */}
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
            <FileSpreadsheet className="size-3.5" />
            Expected CSV format
          </p>
          <p>
            Your CSV should have columns like{" "}
            <code className="rounded bg-muted px-1 py-0.5">phone</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">name</code>, and
            optionally <code className="rounded bg-muted px-1 py-0.5">tags</code>
            . Column names are auto-detected.
          </p>
          <Button
            variant="link"
            size="xs"
            className="mt-1 h-auto p-0 text-xs"
            onClick={() => {
              const blob = new Blob(
                ["phone,name,tags\n+14155552671,Jane Smith,vip\n+441234567890,John Doe,lead"],
                { type: "text/csv" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "contacts-template.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-1 size-3" />
            Download template CSV
          </Button>
        </div>

        {/* Drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <>
              <FileSpreadsheet className="size-8 text-primary" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop your CSV here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Files must be .csv format
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
            }}
          />
        </div>

        {/* Preview */}
        {preview.length > 0 && !result && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Preview (first {preview.length} rows)
            </p>
            <div className="max-h-32 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.keys(preview[0]).map((col) => (
                      <th key={col} className="px-3 py-1.5 text-left font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="truncate px-3 py-1.5">
                          {val || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload result */}
        {result && (
          <div className="space-y-2">
            <div
              className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
                result.errors?.length
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
            >
              {result.errors?.length ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-medium">
                  {result.inserted} contact{result.inserted !== 1 ? "s" : ""}{" "}
                  imported
                </p>
                {result.errors && result.errors.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.reason}
                      </li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        …and {result.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter showCloseButton>
          {file && !result && (
            <Button onClick={handleUpload} disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Import {preview.length > 0 ? `${preview.length}+ ` : ""}Contacts
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
