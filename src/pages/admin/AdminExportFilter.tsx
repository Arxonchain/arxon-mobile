 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Textarea } from "@/components/ui/textarea";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Download, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 
 const AdminExportFilter = () => {
   const [emailInput, setEmailInput] = useState("");
   const [isExporting, setIsExporting] = useState(false);
   const [stats, setStats] = useState<{ input: number; matched: number } | null>(null);
 
   const parseEmails = (input: string): string[] => {
     // Handle CSV format or newline-separated
     const lines = input.split(/[\n,]/).map(line => line.trim().toLowerCase());
     // Filter valid emails
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return lines.filter(line => emailRegex.test(line));
   };
 
   const handleExport = async () => {
     const emails = parseEmails(emailInput);
     
     if (emails.length === 0) {
       toast.error("No valid emails found. Paste your email list first.");
       return;
     }
 
     setIsExporting(true);
     setStats({ input: emails.length, matched: 0 });
     
     try {
       toast.loading(`Filtering ${emails.length} emails against database...`, { id: 'export' });
       
       const { data: sessionData } = await supabase.auth.getSession();
       
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data-csv`,
         {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${sessionData.session?.access_token}`,
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ emails }),
         }
       );
 
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Export failed');
       }
 
       const blob = await response.blob();
       const text = await blob.text();
       const rowCount = text.split('\n').length - 1; // Minus header
       
       setStats({ input: emails.length, matched: rowCount });
       
       // Download the file
       const url = window.URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
       const a = document.createElement('a');
       a.href = url;
       a.download = `filtered_users_${rowCount}_matched_${new Date().toISOString().split('T')[0]}.csv`;
       document.body.appendChild(a);
       a.click();
       window.URL.revokeObjectURL(url);
       document.body.removeChild(a);
       
       toast.success(`Export complete! ${rowCount} users matched from ${emails.length} emails.`, { id: 'export' });
     } catch (err: any) {
       toast.error(err.message || 'Export failed', { id: 'export' });
     } finally {
       setIsExporting(false);
     }
   };
 
   const emailCount = parseEmails(emailInput).length;
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold text-foreground">Export Filtered Users</h1>
         <p className="text-muted-foreground">
           Paste your list of real user emails to export only their data (excludes bots/spam)
         </p>
       </div>
 
       <div className="grid gap-6 lg:grid-cols-2">
         {/* Input Section */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Upload className="h-5 w-5" />
               Paste Email List
             </CardTitle>
             <CardDescription>
               Paste emails from your CSV (one per line or comma-separated)
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <Textarea
               placeholder={`user1@example.com\nuser2@example.com\nuser3@example.com\n\n...or paste comma-separated emails`}
               value={emailInput}
               onChange={(e) => setEmailInput(e.target.value)}
               className="min-h-[300px] font-mono text-sm"
             />
             <div className="flex items-center justify-between">
               <span className="text-sm text-muted-foreground">
                 {emailCount > 0 ? (
                   <span className="flex items-center gap-1 text-green-500">
                     <CheckCircle2 className="h-4 w-4" />
                     {emailCount.toLocaleString()} valid emails detected
                   </span>
                 ) : (
                   <span className="flex items-center gap-1">
                     <AlertCircle className="h-4 w-4" />
                     Paste emails to begin
                   </span>
                 )}
               </span>
               <Button
                 onClick={() => setEmailInput("")}
                 variant="ghost"
                 size="sm"
                 disabled={!emailInput}
               >
                 Clear
               </Button>
             </div>
           </CardContent>
         </Card>
 
         {/* Export Section */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <FileText className="h-5 w-5" />
               Export Matched Data
             </CardTitle>
             <CardDescription>
               Downloads CSV with full user data for emails that exist in the database
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
               <h4 className="font-medium">CSV will include:</h4>
               <ul className="text-sm text-muted-foreground space-y-1">
                 <li>• Email address</li>
                 <li>• Total points, mining points, task points, social points, referral points</li>
                 <li>• Daily streak</li>
                 <li>• Referral bonus %, X post boost %</li>
                 <li>• Username, referral code</li>
                 <li>• Signup date</li>
               </ul>
             </div>
 
             {stats && (
               <div className="rounded-lg border bg-accent/10 p-4">
                 <div className="grid grid-cols-2 gap-4 text-center">
                   <div>
                     <div className="text-2xl font-bold">{stats.input.toLocaleString()}</div>
                     <div className="text-xs text-muted-foreground">Emails Submitted</div>
                   </div>
                   <div>
                     <div className="text-2xl font-bold text-green-500">{stats.matched.toLocaleString()}</div>
                     <div className="text-xs text-muted-foreground">Users Matched</div>
                   </div>
                 </div>
               </div>
             )}
 
             <Button
               onClick={handleExport}
               disabled={emailCount === 0 || isExporting}
               className="w-full"
               size="lg"
             >
               {isExporting ? (
                 <>Processing...</>
               ) : (
                 <>
                   <Download className="h-4 w-4 mr-2" />
                   Export {emailCount > 0 ? `${emailCount.toLocaleString()} Users` : 'Matched Users'}
                 </>
               )}
             </Button>
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
             <li>Open your CSV file with the 5,000 real user emails</li>
             <li>Copy the email column (just the emails, no headers)</li>
             <li>Paste them in the text area above</li>
             <li>Click "Export Matched Users" to download their full data</li>
             <li>Use the exported CSV to import users into your new database with their points intact</li>
           </ol>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default AdminExportFilter;