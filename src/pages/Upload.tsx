import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { formatPercent } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Notification } from "@/types";

export function Upload() {
  const { uploadCsv } = useAppData();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rowsProcessed: number; newNotifications: Notification[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      try {
        const text = await file.text();
        const res = uploadCsv(text);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to process CSV");
      }
    },
    [uploadCsv]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CSV Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the daily client payment and documentation export to refresh milestone data.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass-card flex flex-col items-center justify-center gap-3 border-2 border-dashed py-16 text-center cursor-pointer transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <UploadCloud size={32} className="text-primary" />
        <div>
          <p className="text-sm font-medium">Drag & drop your CSV here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Expected columns: name, contract_value, payment_to_date, documents_submitted</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle size={18} className="text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              <CardTitle>Upload Successful</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Processed {result.rowsProcessed} row{result.rowsProcessed === 1 ? "" : "s"}. {result.newNotifications.length}{" "}
              new milestone{result.newNotifications.length === 1 ? "" : "s"} triggered.
            </p>

            {result.newNotifications.length > 0 && (
              <div className="space-y-2">
                {result.newNotifications.map((n) => (
                  <Link
                    key={n.id}
                    to={`/clients/${n.client_id}`}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="font-medium">{n.client_name}</span>
                    <div className="flex items-center gap-3">
                      <span className={n.milestone === "10% Payment" ? "milestone-badge-10" : "milestone-badge-creq"}>
                        {n.milestone}
                      </span>
                      <span className="font-mono text-muted-foreground">{formatPercent(n.payment_percentage)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground" />
            <CardTitle>CSV Format Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-secondary/50 border border-border p-4 text-xs font-mono overflow-x-auto">
{`name,contract_value,payment_to_date,documents_submitted
Maria Santos,5000000,475000,Valid ID;Proof of Income;Tax Returns`}
          </pre>
          <ul className="text-xs text-muted-foreground mt-3 space-y-1 list-disc pl-4">
            <li>Documents are separated with a semicolon ( ; )</li>
            <li>payment_percentage is computed automatically as payment_to_date / contract_value</li>
            <li>Existing clients are matched by name and updated; new names create new client records</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
