import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

async function approveTemplate(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const templateId = formData.get("templateId") as string;
  if (!templateId) throw new Error("Missing templateId");

  const admin = createAdminClient();
  await admin
    .from("whatsapp_templates")
    .update({
      status: "approved",
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  revalidatePath("/admin/templates");
}

async function rejectTemplate(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const templateId = formData.get("templateId") as string;
  if (!templateId) throw new Error("Missing templateId");

  const admin = createAdminClient();
  await admin
    .from("whatsapp_templates")
    .update({
      status: "rejected",
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", templateId);

  revalidatePath("/admin/templates");
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function AdminTemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  // Fetch all templates across all tenants, including the tenant name
  const { data: templates, error } = await admin
    .from("whatsapp_templates")
    .select(
      `
      id,
      name,
      body,
      category,
      status,
      rejection_reason,
      created_at,
      tenant:tenant_id ( name )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch templates:", error);
  }

  // Status badge helper
  const statusConfig: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    draft: { label: "Draft", variant: "outline" },
    pending_review: { label: "Pending Review", variant: "secondary" },
    submitted_to_meta: { label: "Submitted to Meta", variant: "secondary" },
    approved: { label: "Approved", variant: "default" },
    rejected: { label: "Rejected", variant: "destructive" },
    paused: { label: "Paused", variant: "outline" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <FileText className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Template Moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and moderate WhatsApp message templates submitted by tenants.
            Approve or reject templates to prevent spam.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Templates</CardTitle>
          <CardDescription>
            {templates?.length ?? 0} template
            {(templates?.length ?? 0) !== 1 ? "s" : ""} across all tenants.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const cfg = statusConfig[template.status] ?? {
                    label: template.status,
                    variant: "outline" as const,
                  };
                  const tenantData = template.tenant as
                    | { name: string }
                    | { name: string }[]
                    | null;
                  const tenantName = Array.isArray(tenantData)
                    ? tenantData[0]?.name ?? "Unknown"
                    : tenantData?.name ?? "Unknown";

                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm text-muted-foreground">
                          {template.body}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tenantName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {template.status !== "approved" && (
                            <form action={approveTemplate}>
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-emerald-600 hover:text-emerald-700"
                                title="Approve template"
                              >
                                <CheckCircle2 className="size-4" />
                                Approve
                              </Button>
                            </form>
                          )}
                          {template.status !== "rejected" && (
                            <form action={rejectTemplate}>
                              <input
                                type="hidden"
                                name="templateId"
                                value={template.id}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:text-red-700"
                                title="Reject template"
                              >
                                <XCircle className="size-4" />
                                Reject
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FileText className="size-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No templates yet</p>
                <p className="text-xs text-muted-foreground">
                  Templates submitted by tenants will appear here for
                  moderation.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
