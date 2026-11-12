import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Files, Trash2 } from "lucide-react";
import { useAppData, type ImportFileResult } from "@/context/AppDataContext";
import { formatDateTime, formatPercent, milestoneBadgeClass } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileError {
  fileName: string;
  message: string;
}

export function Upload() {
  const { data, importFile, removeImport, displayName } = useAppData();
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<FileError[]>([]);
  const [results, setResults] = useState<ImportFileResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Files are imported one after another, in the order given, so each builds on the last.
  const handleFiles = useCallback(
    async (files: File[]) => {
      const nextErrors: FileError[] = [];
      const nextResults: ImportFileResult[] = [];
      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const text = new TextDecoder("windows-1252").decode(buffer);
          nextResults.push(importFile(file.name, text));
        } catch (e) {
          nextErrors.push({ fileName: file.name, message: e instanceof Error ? e.message : "Failed to process file" });
        }
      }
      setErrors(nextErrors);
      setResults(nextResults);
    },
    [importFile]
  );

  function handleRemove(importId: string, fileName: string) {
    const confirmed = window.confirm(
      `Remove "${fileName}"?\n\nPayment data will be rebuilt as if this file was never imported. Clients that only came from this file will be removed. Documentation status is kept.`
    );
    if (!confirmed) return;
    removeImport(importId);
    setResults([]);
  }

  const importsNewestFirst = [...data.imports].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Sales Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the daily payment export to refresh milestone data. Documentation status is edited per client.
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
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length > 0) handleFiles(files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass-card flex flex-col items-center justify-center gap-3 border-2 border-dashed py-16 text-center cursor-pointer transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <UploadCloud size={32} className="text-primary" />
        <div>
          <p className="text-sm font-medium">Drag & drop one or more report files here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Expects the daily Sales Report export — matched by column header, not position: Customer Name, TCP, Payment Percentage</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.tsv,.txt,.xls,text/csv,text/tab-separated-values,text/plain"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) handleFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.map((err, i) => (
        <Card key={`${i}-${err.fileName}`} className="border-destructive/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle size={18} className="text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              <span className="font-medium">{err.fileName}:</span> {err.message}
            </p>
          </CardContent>
        </Card>
      ))}

      {results.map((result, i) => (
        <Card key={`${i}-${result.fileName}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              <CardTitle>Imported {result.fileName}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Processed {result.customersProcessed} customer{result.customersProcessed === 1 ? "" : "s"} (contracts combined per customer). {result.newNotifications.length}{" "}
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
                    <span className="font-medium">{displayName(n.client_name)}</span>
                    <div className="flex items-center gap-3">
                      <span className={milestoneBadgeClass(n.milestone)}>
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
      ))}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Files size={16} className="text-muted-foreground" />
            <CardTitle>Imported Files</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {importsNewestFirst.length === 0 && !data.baseline ? (
            <p className="text-sm text-muted-foreground">No files imported yet. Uploaded reports will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Imported</th>
                    <th>Rows</th>
                    <th>Customers</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {importsNewestFirst.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium break-all">{record.file_name}</td>
                      <td className="text-muted-foreground whitespace-nowrap">{formatDateTime(record.imported_at)}</td>
                      <td className="font-mono">{record.row_count}</td>
                      <td className="font-mono">{record.customers_processed}</td>
                      <td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(record.id, record.file_name)}
                          aria-label={`Remove ${record.file_name}`}
                        >
                          <Trash2 size={14} />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data.baseline && (
                    <tr>
                      <td className="font-medium text-muted-foreground">Data imported before file tracking</td>
                      <td className="text-muted-foreground whitespace-nowrap">Before {formatDateTime(data.baseline.captured_at)}</td>
                      <td className="font-mono text-muted-foreground">—</td>
                      <td className="font-mono text-muted-foreground">{data.baseline.clients.length}</td>
                      <td className="text-right text-xs text-muted-foreground">Can't be removed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Removing a file rebuilds payment data from the remaining files in the order they were imported. Documentation status is never changed.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground" />
            <CardTitle>Sales Report Format Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="rounded-md bg-secondary/50 border border-border p-4 text-xs font-mono overflow-x-auto">
{`Customer Name\tTCP\tPayment Percentage\t...
DELA CRUZ, JUAN\t14799600.00000\t30.13595\t...`}
          </pre>
          <ul className="text-xs text-muted-foreground mt-3 space-y-1 list-disc pl-4">
            <li>This is the raw Sales Report export from the source system — tab or comma delimited, any file extension (.xls, .txt, .csv all accepted, since the source system labels its text exports as .xls)</li>
            <li>Columns are matched by header name, not position — extra or reordered columns are ignored safely</li>
            <li>Required columns: <strong>Customer Name</strong>, <strong>TCP</strong> (contract value), <strong>Payment Percentage</strong> — this app trusts the percentage given, it does not recompute it</li>
            <li>Existing clients are matched by name and updated; unmatched names create new client records</li>
            <li>This upload only affects payment data. Documentation status is managed separately — see each client's detail page</li>
            <li>Genuine binary Excel files (not text-based exports) are not supported — if this fails, re-export as plain text/CSV from the source system</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
