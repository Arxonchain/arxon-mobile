import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Users, Play, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportResult {
  total: number;
  processed: number;
  created: number;
  skipped: number;
  errors: string[];
  preview: Array<{
    email: string;
    total_points: number;
    username: string | null;
  }>;
}

const AdminImportUsers = () => {
  const [csvInput, setCsvInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const getLineCount = (input: string): number => {
    const lines = input.trim().split('\n').filter(line => line.trim());
    // Subtract header if present
    if (lines.length > 0 && lines[0].toLowerCase().startsWith('email,')) {
      return lines.length - 1;
    }
    return lines.length;
  };

  const handlePreview = async () => {
    if (!csvInput.trim()) {
      toast.error("Paste your CSV data first");
      return;
    }

    setIsPreviewing(true);
    setResult(null);

    try {
      toast.loading("Validating CSV...", { id: 'import' });

      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-users-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ csvData: csvInput, dryRun: true }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed');
      }

      setResult(data.results);
      toast.success(`Preview complete: ${data.results.processed} users ready to import`, { id: 'import' });
    } catch (err: any) {
      toast.error(err.message || 'Preview failed', { id: 'import' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!csvInput.trim()) {
      toast.error("Paste your CSV data first");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to import these users?\n\nThis will:\n• Create auth accounts (email_confirmed=true)\n• Restore their profiles and points\n• Users can use "Forgot Password" to regain access\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setIsImporting(true);

    try {
      toast.loading("Importing users... This may take a while.", { id: 'import' });

      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-users-csv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ csvData: csvInput, dryRun: false }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data.results);
      toast.success(
        `Import complete! Created ${data.results.created}, skipped ${data.results.skipped} existing.`,
        { id: 'import' }
      );
    } catch (err: any) {
      toast.error(err.message || 'Import failed', { id: 'import' });
    } finally {
      setIsImporting(false);
    }
  };

  const lineCount = getLineCount(csvInput);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Legacy Users</h1>
        <p className="text-muted-foreground">
          Import users from your filtered CSV. They'll be able to reset their password to regain access.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Paste CSV Data
            </CardTitle>
            <CardDescription>
              Paste the exported CSV (with header row) from the Export Filter tool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`email,total_points,mining_points,task_points,social_points,referral_points,daily_streak,referral_bonus_pct,x_post_boost_pct,username,referral_code,signup_date
user@example.com,1500,1200,200,50,50,7,5,0,CoolUser,ARX-ABC123,2025-01-15
...`}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="min-h-[300px] font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {lineCount > 0 ? (
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    {lineCount.toLocaleString()} rows detected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Paste CSV to begin
                  </span>
                )}
              </span>
              <Button
                onClick={() => {
                  setCsvInput("");
                  setResult(null);
                }}
                variant="ghost"
                size="sm"
                disabled={!csvInput}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Users
            </CardTitle>
            <CardDescription>
              Preview first, then import when ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium">Import will:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Create auth accounts (auto-confirmed)</li>
                <li>✓ Restore profiles with username & referral code</li>
                <li>✓ Restore all point balances exactly</li>
                <li>✓ Skip emails that already exist</li>
                <li>→ Users reset password to regain access</li>
              </ul>
            </div>

            {result && (
              <div className="rounded-lg border bg-accent/10 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-bold">{result.processed}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-500">{result.created}</div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-500">{result.skipped}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>

                {result.preview && result.preview.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium mb-2">Preview (first 10):</h5>
                    <div className="max-h-32 overflow-auto text-xs font-mono space-y-1">
                      {result.preview.map((u, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="truncate max-w-[150px]">{u.email}</span>
                          <span className="text-muted-foreground">{u.total_points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-red-500 mb-1">
                      Errors ({result.errors.length}):
                    </h5>
                    <div className="max-h-24 overflow-auto text-xs text-red-400 space-y-1">
                      {result.errors.slice(0, 10).map((e, i) => (
                        <div key={i}>{e}</div>
                      ))}
                      {result.errors.length > 10 && (
                        <div>...and {result.errors.length - 10} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handlePreview}
                disabled={lineCount === 0 || isPreviewing || isImporting}
                variant="outline"
                className="flex-1"
              >
                {isPreviewing ? (
                  <>Validating...</>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>

              <Button
                onClick={handleImport}
                disabled={lineCount === 0 || isPreviewing || isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Import {lineCount > 0 ? lineCount.toLocaleString() : ''} Users
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>First, use the <strong>Export Filter</strong> tool to generate a CSV with your real users</li>
            <li>Open the exported CSV file</li>
            <li>Copy all content (Ctrl+A, Ctrl+C) including the header row</li>
            <li>Paste it in the text area above</li>
            <li>Click "Preview" to validate the data</li>
            <li>Click "Import" to create the accounts</li>
            <li>Users can now use "Forgot Password" on the login page to set a new password and regain access</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminImportUsers;
