import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, FileUp, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { PanelCard, PanelError, PanelLoading } from "@/components/panel/PanelShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DELIVERY_TYPES,
  PRODUCT_TYPES,
  TEMPLATE_CATEGORIES,
  parseChangelog,
  parseFaq,
  parseTiers,
  type ChangelogEntry,
  type ProductTier,
  type TemplateFaq,
} from "@/lib/db-types";
import { detectPlatform, EXTERNAL_PLATFORMS, platformById } from "@/lib/external-platforms";
import {
  adminCreateProductUpload,
  adminDeleteProductFile,
  adminDeleteTemplate,
  adminGetTemplate,
  adminSaveTemplate,
  type TemplateInput,
} from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/admin/templates/$id")({
  validateSearch: (search: Record<string, unknown>): { url?: string } => (typeof search["url"] === "string" && search["url"] ? { url: search["url"] } : {}),
  component: ProductEditorPage,
});

type TierForm = { id: string; name: string; price: string; compareAtPrice: string; description: string; includes: string };
type ChangelogForm = { version: string; date: string; notes: string };

type FormState = {
  title: string;
  slug: string;
  slugTouched: boolean;
  tagline: string;
  category: string;
  productType: string;
  deliveryType: string;
  price: string;
  compareAtPrice: string;
  tiers: TierForm[];
  coverImageUrl: string;
  galleryUrls: string;
  description: string;
  highlights: string;
  includes: string;
  previewUrl: string;
  demoUrl: string;
  videoUrl: string;
  docsUrl: string;
  externalUrl: string;
  externalPlatform: string;
  version: string;
  platforms: string;
  techStack: string;
  requirements: string;
  changelog: ChangelogForm[];
  licenseTerms: string;
  fileSize: string;
  faq: TemplateFaq[];
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
  duplicateUrl: string;
  guideUrl: string;
  downloadUrl: string;
  downloadPath: string;
  accessUrl: string;
  issueLicense: boolean;
  licenseMaxActivations: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  slugTouched: false,
  tagline: "",
  category: "business",
  productType: "software",
  deliveryType: "license",
  price: "",
  compareAtPrice: "",
  tiers: [],
  coverImageUrl: "",
  galleryUrls: "",
  description: "",
  highlights: "",
  includes: "",
  previewUrl: "",
  demoUrl: "",
  videoUrl: "",
  docsUrl: "",
  externalUrl: "",
  externalPlatform: "",
  version: "1.0.0",
  platforms: "",
  techStack: "",
  requirements: "",
  changelog: [],
  licenseTerms: "",
  fileSize: "",
  faq: [],
  isPublished: false,
  isFeatured: false,
  sortOrder: "0",
  duplicateUrl: "",
  guideUrl: "",
  downloadUrl: "",
  downloadPath: "",
  accessUrl: "",
  issueLicense: true,
  licenseMaxActivations: "3",
  notes: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Start a new product from a pasted marketplace link (Gumroad, Amazon, Fiverr, ...). */
function externalPrefill(url: string): FormState {
  const platform = detectPlatform(url);
  const guessType =
    platform.id === "amazon" || platform.id === "kindle"
      ? "ebook"
      : platform.id === "udemy" || platform.id === "skillshare" || platform.id === "youtube"
        ? "course"
        : platform.id === "fiverr" || platform.id === "upwork" || platform.id === "topmate"
          ? "service_gig"
          : platform.id === "play_store" || platform.id === "app_store"
            ? "mobile_app"
            : platform.id === "notion"
              ? "notion_template"
              : "other";
  return { ...emptyForm, deliveryType: "external", productType: guessType, externalUrl: url, externalPlatform: platform.id, version: "", price: "0" };
}

function lines(value: string) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function csv(value: string) {
  return value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function tierToForm(t: ProductTier): TierForm {
  return {
    id: t.id,
    name: t.name,
    price: String(t.price),
    compareAtPrice: t.compare_at_price == null ? "" : String(t.compare_at_price),
    description: t.description,
    includes: t.includes.join("\n"),
  };
}

function changelogToForm(c: ChangelogEntry): ChangelogForm {
  return { version: c.version, date: c.date, notes: c.notes.join("\n") };
}

function ProductEditorPage() {
  const { id } = Route.useParams();
  const { url: prefillUrl } = Route.useSearch();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => (isNew && prefillUrl ? externalPrefill(prefillUrl) : emptyForm));
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const existing = useQuery({
    queryKey: ["admin-template", id],
    enabled: !isNew,
    queryFn: () => adminGetTemplate({ data: { id } }),
  });

  useEffect(() => {
    if (!existing.data) return;
    const { template, deliverable } = existing.data;
    setForm({
      title: template.title,
      slug: template.slug,
      slugTouched: true,
      tagline: template.tagline,
      category: template.category,
      productType: template.product_type,
      deliveryType: template.delivery_type,
      price: String(template.price),
      compareAtPrice: template.compare_at_price == null ? "" : String(template.compare_at_price),
      tiers: parseTiers(template.tiers).map(tierToForm),
      coverImageUrl: template.cover_image_url ?? "",
      galleryUrls: template.gallery_urls.join("\n"),
      description: template.description,
      highlights: template.highlights.join("\n"),
      includes: template.includes.join("\n"),
      previewUrl: template.preview_url ?? "",
      demoUrl: template.demo_url ?? "",
      videoUrl: template.video_url ?? "",
      docsUrl: template.docs_url ?? "",
      externalUrl: template.external_url ?? "",
      externalPlatform: template.external_platform ?? "",
      version: template.version,
      platforms: template.platforms.join(", "),
      techStack: template.tech_stack.join(", "),
      requirements: template.requirements.join("\n"),
      changelog: parseChangelog(template.changelog).map(changelogToForm),
      licenseTerms: template.license_terms,
      fileSize: template.file_size,
      faq: parseFaq(template.faq),
      isPublished: template.is_published,
      isFeatured: template.is_featured,
      sortOrder: String(template.sort_order),
      duplicateUrl: deliverable?.duplicate_url ?? "",
      guideUrl: deliverable?.guide_url ?? "",
      downloadUrl: deliverable?.download_url ?? "",
      downloadPath: deliverable?.download_path ?? "",
      accessUrl: deliverable?.access_url ?? "",
      issueLicense: deliverable?.issue_license ?? template.delivery_type === "license",
      licenseMaxActivations: String(deliverable?.license_max_activations ?? 3),
      notes: deliverable?.notes ?? "",
    });
  }, [existing.data]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload: TemplateInput = {
        ...(isNew ? {} : { id }),
        slug: form.slug || slugify(form.title),
        title: form.title.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        category: form.category,
        product_type: form.productType as TemplateInput["product_type"],
        delivery_type: form.deliveryType as TemplateInput["delivery_type"],
        price: Number(form.price) || 0,
        compare_at_price: form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null,
        tiers: form.tiers
          .filter((t) => t.name.trim())
          .map((t) => ({
            id: t.id.trim() || slugify(t.name),
            name: t.name.trim(),
            price: Number(t.price) || 0,
            compare_at_price: t.compareAtPrice.trim() ? Number(t.compareAtPrice) : null,
            description: t.description.trim(),
            includes: lines(t.includes),
          })),
        cover_image_url: form.coverImageUrl.trim() || null,
        gallery_urls: lines(form.galleryUrls),
        includes: lines(form.includes),
        highlights: lines(form.highlights),
        preview_url: form.previewUrl.trim() || null,
        demo_url: form.demoUrl.trim() || null,
        video_url: form.videoUrl.trim() || null,
        docs_url: form.docsUrl.trim() || null,
        external_url: form.externalUrl.trim() || null,
        external_platform: form.deliveryType === "external" ? form.externalPlatform : "",
        version: form.version.trim(),
        platforms: csv(form.platforms),
        tech_stack: csv(form.techStack),
        requirements: lines(form.requirements),
        changelog: form.changelog
          .filter((c) => c.version.trim())
          .map((c) => ({ version: c.version.trim(), date: c.date.trim(), notes: lines(c.notes) })),
        license_terms: form.licenseTerms.trim(),
        file_size: form.fileSize.trim(),
        faq: form.faq.filter((f) => f.q.trim() && f.a.trim()),
        is_published: form.isPublished,
        is_featured: form.isFeatured,
        sort_order: Number(form.sortOrder) || 0,
        deliverable: {
          duplicate_url: form.duplicateUrl.trim(),
          guide_url: form.guideUrl.trim(),
          download_url: form.downloadUrl.trim(),
          download_path: form.downloadPath.trim(),
          access_url: form.accessUrl.trim(),
          issue_license: form.issueLicense,
          license_max_activations: Number(form.licenseMaxActivations) || 0,
          notes: form.notes.trim(),
        },
      };
      return adminSaveTemplate({ data: payload });
    },
    onSuccess: async (result) => {
      toast.success(isNew ? "Product created" : "Product saved");
      await queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-template", result.id] });
      if (isNew) await navigate({ to: "/admin/templates/$id", params: { id: result.id } });
    },
    onError: (error) => toast.error("Could not save", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: () => adminDeleteTemplate({ data: { id } }),
    onSuccess: async (result) => {
      toast.success(result.deleted ? "Product deleted" : "Product unpublished (it has orders, so it was kept)");
      await queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      await navigate({ to: "/admin/templates" });
    },
    onError: (error) => toast.error("Could not delete", { description: error.message }),
  });

  async function uploadFile(file: File) {
    if (isNew) {
      toast.error("Save the product first, then upload its files.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Files over 50 MB can't be stored here — paste an external download link instead.");
      return;
    }
    setUploading(true);
    try {
      const { path, token } = await adminCreateProductUpload({ data: { templateId: id, filename: file.name, size: file.size } });
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.storage.from("product-files").uploadToSignedUrl(path, token, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const previous = form.downloadPath;
      update("downloadPath", path);
      if (!form.fileSize.trim()) update("fileSize", `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      if (previous && previous !== path) {
        await adminDeleteProductFile({ data: { path: previous } }).catch(() => undefined);
      }
      toast.success("File uploaded — remember to save the product");
    } catch (error) {
      toast.error("Upload failed", { description: error instanceof Error ? error.message : "Try again" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeFile() {
    if (!form.downloadPath) return;
    try {
      await adminDeleteProductFile({ data: { path: form.downloadPath } });
      update("downloadPath", "");
      toast.success("File removed — save the product to confirm");
    } catch (error) {
      toast.error("Could not remove file", { description: error instanceof Error ? error.message : "Try again" });
    }
  }

  if (!isNew && existing.isLoading) return <PanelLoading rows={5} />;
  if (!isNew && existing.error) return <PanelError error={existing.error} />;
  if (!isNew && existing.data === null) {
    return (
      <PanelCard>
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Link to="/admin/templates" className="mt-3 inline-flex text-sm text-primary hover:underline">
          Back to products
        </Link>
      </PanelCard>
    );
  }

  const isNotion = form.productType === "notion_template";
  const isExternal = form.deliveryType === "external";
  const detectedPlatform = detectPlatform(form.externalUrl);
  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/templates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Products
        </Link>
        <div className="flex items-center gap-2">
          {!isNew ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                  <AlertDialogDescription>If customers have ordered it, it will be unpublished instead so their orders stay intact.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction onClick={() => remove.mutate()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isNew ? "Create product" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <PanelCard title="Listing">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((c) => ({ ...c, title, slug: c.slugTouched ? c.slug : slugify(title) }));
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Link (slug)</Label>
                <Input id="slug" value={form.slug} onChange={(e) => setForm((c) => ({ ...c, slug: slugify(e.target.value), slugTouched: true }))} required />
                <p className="text-xs text-muted-foreground">/store/{form.slug || "…"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" value={form.category} onChange={(e) => update("category", e.target.value)} className={selectClass}>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ptype">Product type</Label>
                <select id="ptype" value={form.productType} onChange={(e) => update("productType", e.target.value)} className={selectClass}>
                  {PRODUCT_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dtype">Delivery</Label>
                <select
                  id="dtype"
                  value={form.deliveryType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((c) => ({ ...c, deliveryType: next, issueLicense: next === "license" ? true : c.issueLicense }));
                  }}
                  className={selectClass}
                >
                  {DELIVERY_TYPES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{DELIVERY_TYPES.find((d) => d.id === form.deliveryType)?.hint}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tagline">Tagline (one line under the title)</Label>
                <Input id="tagline" value={form.tagline} onChange={(e) => update("tagline", e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={7} value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlights">Highlights (one per line, max 3 shown)</Label>
                <Textarea id="highlights" rows={4} value={form.highlights} onChange={(e) => update("highlights", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="includes">What's included (one per line)</Label>
                <Textarea id="includes" rows={4} value={form.includes} onChange={(e) => update("includes", e.target.value)} />
              </div>
            </div>
          </PanelCard>

          {!isNotion && !isExternal ? (
            <PanelCard title="Software details" description="Shown as a spec sheet on the product page and used by search.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="version">Current version</Label>
                  <Input id="version" value={form.version} onChange={(e) => update("version", e.target.value)} placeholder="2.1.0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filesize">Download size</Label>
                  <Input id="filesize" value={form.fileSize} onChange={(e) => update("fileSize", e.target.value)} placeholder="48 MB" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platforms">Platforms (comma separated)</Label>
                  <Input id="platforms" value={form.platforms} onChange={(e) => update("platforms", e.target.value)} placeholder="Web, Android, Windows" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech">Tech stack (comma separated)</Label>
                  <Input id="tech" value={form.techStack} onChange={(e) => update("techStack", e.target.value)} placeholder="React, Supabase, Node.js" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="requirements">Requirements (one per line)</Label>
                  <Textarea id="requirements" rows={3} value={form.requirements} onChange={(e) => update("requirements", e.target.value)} placeholder="Node.js 20+&#10;A Supabase project (free tier works)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo">Live demo link</Label>
                  <Input id="demo" type="url" value={form.demoUrl} onChange={(e) => update("demoUrl", e.target.value)} placeholder="https://demo.example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video">Walkthrough video link</Label>
                  <Input id="video" type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} placeholder="https://youtu.be/…" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="docs">Public documentation link</Label>
                  <Input id="docs" type="url" value={form.docsUrl} onChange={(e) => update("docsUrl", e.target.value)} placeholder="https://docs.example.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="license">Licence terms (shown on the product page)</Label>
                  <Textarea id="license" rows={3} value={form.licenseTerms} onChange={(e) => update("licenseTerms", e.target.value)} placeholder="Single business licence. Unlimited end users. Resale of source code not permitted." />
                </div>
              </div>
            </PanelCard>
          ) : null}

          <PanelCard
            title="Pricing tiers (optional)"
            description="Leave empty for a single price. With tiers, the base price below is ignored and buyers pick an edition."
            actions={
              <button
                type="button"
                onClick={() => update("tiers", [...form.tiers, { id: "", name: "", price: "", compareAtPrice: "", description: "", includes: "" }])}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Plus className="h-3.5 w-3.5" /> Add tier
              </button>
            }
          >
            {form.tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tiers — the single price on the right applies.</p>
            ) : (
              <div className="space-y-4">
                {form.tiers.map((tier, index) => {
                  const set = (patch: Partial<TierForm>) => update("tiers", form.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)));
                  return (
                    <div key={index} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input value={tier.name} onChange={(e) => set({ name: e.target.value, id: tier.id || slugify(e.target.value) })} placeholder="Personal / Business / Agency" />
                      </div>
                      <div className="space-y-1">
                        <Label>Id (stable, lowercase)</Label>
                        <Input value={tier.id} onChange={(e) => set({ id: slugify(e.target.value) })} placeholder="business" />
                      </div>
                      <div className="space-y-1">
                        <Label>Price (₹)</Label>
                        <Input type="number" min={0} step={1} value={tier.price} onChange={(e) => set({ price: e.target.value })} required />
                      </div>
                      <div className="space-y-1">
                        <Label>Compare-at (₹, optional)</Label>
                        <Input type="number" min={0} step={1} value={tier.compareAtPrice} onChange={(e) => set({ compareAtPrice: e.target.value })} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Short description</Label>
                        <Input value={tier.description} onChange={(e) => set({ description: e.target.value })} placeholder="For one institute, up to 500 students" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Included in this tier (one per line)</Label>
                        <Textarea rows={3} value={tier.includes} onChange={(e) => set({ includes: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <button type="button" onClick={() => update("tiers", form.tiers.filter((_, i) => i !== index))} className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline">
                          <Trash2 className="h-3.5 w-3.5" /> Remove tier
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Images & preview" description="Paste image links. Starter products use built-in covers when this is empty.">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cover">Cover image URL</Label>
                <Input id="cover" type="url" placeholder="https://…" value={form.coverImageUrl} onChange={(e) => update("coverImageUrl", e.target.value)} />
                {form.coverImageUrl ? <img src={form.coverImageUrl} alt="Cover preview" className="mt-2 aspect-[3/2] w-full max-w-sm rounded-lg border border-border object-cover" /> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery">Gallery image URLs (one per line)</Label>
                <Textarea id="gallery" rows={3} value={form.galleryUrls} onChange={(e) => update("galleryUrls", e.target.value)} />
              </div>
              {isNotion ? (
                <div className="space-y-2">
                  <Label htmlFor="preview">Public preview link (optional)</Label>
                  <Input id="preview" type="url" placeholder="https://notion.site/…" value={form.previewUrl} onChange={(e) => update("previewUrl", e.target.value)} />
                </div>
              ) : null}
            </div>
          </PanelCard>

          {!isNotion && !isExternal ? (
            <PanelCard
              title="Release notes"
              actions={
                <button type="button" onClick={() => update("changelog", [{ version: form.version || "", date: new Date().toISOString().slice(0, 10), notes: "" }, ...form.changelog])} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                  <Plus className="h-3.5 w-3.5" /> Add release
                </button>
              }
            >
              {form.changelog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No release notes yet. Buyers trust products that show recent updates.</p>
              ) : (
                <div className="space-y-3">
                  {form.changelog.map((entry, index) => {
                    const set = (patch: Partial<ChangelogForm>) => update("changelog", form.changelog.map((c, i) => (i === index ? { ...c, ...patch } : c)));
                    return (
                      <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[120px_150px_1fr_auto]">
                        <Input placeholder="Version" value={entry.version} onChange={(e) => set({ version: e.target.value })} />
                        <Input placeholder="Date" value={entry.date} onChange={(e) => set({ date: e.target.value })} />
                        <Textarea rows={2} placeholder="Notes, one per line" value={entry.notes} onChange={(e) => set({ notes: e.target.value })} />
                        <button type="button" aria-label="Remove release" onClick={() => update("changelog", form.changelog.filter((_, i) => i !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </PanelCard>
          ) : null}

          <PanelCard
            title="Questions & answers"
            actions={
              <button type="button" onClick={() => update("faq", [...form.faq, { q: "", a: "" }])} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                <Plus className="h-3.5 w-3.5" /> Add question
              </button>
            }
          >
            {form.faq.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet. Buyers convert better with 2-3 quick answers.</p>
            ) : (
              <div className="space-y-4">
                {form.faq.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Input placeholder="Question" value={item.q} onChange={(e) => update("faq", form.faq.map((f, i) => (i === index ? { ...f, q: e.target.value } : f)))} />
                    <Input placeholder="Answer" value={item.a} onChange={(e) => update("faq", form.faq.map((f, i) => (i === index ? { ...f, a: e.target.value } : f)))} />
                    <button type="button" aria-label="Remove question" onClick={() => update("faq", form.faq.filter((_, i) => i !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          {isExternal ? (
            <PanelCard title="External product link" description="Paste the page where people buy it — Gumroad, Amazon, Fiverr, Udemy, Play Store, your own site…">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">Product page link (https://)</Label>
                  <Input
                    id="externalUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://yourname.gumroad.com/l/product"
                    value={form.externalUrl}
                    onChange={(e) => {
                      const url = e.target.value;
                      setForm((c) => ({ ...c, externalUrl: url, externalPlatform: c.externalPlatform && c.externalPlatform !== detectPlatform(c.externalUrl).id ? c.externalPlatform : detectPlatform(url).id }));
                    }}
                    required
                  />
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ExternalLink className="h-3.5 w-3.5" /> Detected: <span className="font-medium text-foreground">{detectedPlatform.label}</span>
                    {form.externalUrl.trim() && !/^https:\/\//i.test(form.externalUrl.trim()) ? <span className="text-destructive"> · must start with https://</span> : null}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalPlatform">Platform shown on the button</Label>
                  <select id="externalPlatform" value={form.externalPlatform || detectedPlatform.id} onChange={(e) => update("externalPlatform", e.target.value)} className={selectClass}>
                    {EXTERNAL_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Button text: “{platformById(form.externalPlatform || detectedPlatform.id).cta}”</p>
                </div>
                <p className="rounded-xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
                  Nothing is sold or delivered here for this product — the store card and product page send buyers to this link. Refunds and support follow that platform's rules.
                </p>
              </div>
            </PanelCard>
          ) : (
          <PanelCard title="Delivery (private)" description="Unlocked for buyers only after payment is confirmed — never before.">
            <div className="grid gap-4">
              <div className="rounded-xl border border-dashed border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Product file (private storage, up to 50 MB)</p>
                    <p className="text-xs text-muted-foreground">
                      {form.downloadPath ? (
                        <span className="font-mono">{form.downloadPath.split("/").pop()}</span>
                      ) : (
                        "ZIP / APK / installer. Buyers get a 1-hour signed link each time they download."
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInput}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadFile(file);
                      }}
                    />
                    <button type="button" disabled={uploading || isNew} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                      {uploading ? "Uploading…" : form.downloadPath ? "Replace file" : "Upload file"}
                    </button>
                    {form.downloadPath ? (
                      <button type="button" onClick={removeFile} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/5">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                {isNew ? <p className="mt-2 text-xs text-muted-foreground">Create the product first to enable uploads.</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dlurl" className="flex items-center gap-1.5">
                  <FileUp className="h-3.5 w-3.5" /> External download link (Drive, Dropbox, GitHub release) — for larger files
                </Label>
                <Input id="dlurl" placeholder="https://…" value={form.downloadUrl} onChange={(e) => update("downloadUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dup">Notion duplicate link</Label>
                <Input id="dup" placeholder="https://www.notion.so/…?duplicate=true" value={form.duplicateUrl} onChange={(e) => update("duplicateUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access">Hosted access link (for SaaS / hosted products)</Label>
                <Input id="access" placeholder="https://app.example.com/signup?code=…" value={form.accessUrl} onChange={(e) => update("accessUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide">Setup guide link (video or doc)</Label>
                <Input id="guide" placeholder="https://…" value={form.guideUrl} onChange={(e) => update("guideUrl", e.target.value)} />
              </div>
              <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
                  <span>
                    <span className="block font-medium text-foreground">Issue a licence key on payment</span>
                    <span className="block text-xs text-muted-foreground">Format WWD-XXXX-XXXX-XXXX-XXXX. Verify from your software via /api/public/license/verify.</span>
                  </span>
                  <Switch checked={form.issueLicense} onCheckedChange={(v) => update("issueLicense", v)} />
                </label>
                {form.issueLicense ? (
                  <div className="space-y-2">
                    <Label htmlFor="maxact">Max activations per key (0 = unlimited)</Label>
                    <Input id="maxact" type="number" min={0} max={1000} value={form.licenseMaxActivations} onChange={(e) => update("licenseMaxActivations", e.target.value)} />
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the buyer (shown after payment)</Label>
                <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Install steps, default login, support contact…" />
              </div>
            </div>
          </PanelCard>
          )}
        </div>

        <div className="space-y-6">
          <PanelCard title="Pricing" description={isExternal ? "Shown for information only; the buyer pays on the external platform. Leave 0 to show “See price on …”." : undefined}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹){form.tiers.length > 0 ? " — ignored while tiers exist" : ""}</Label>
                <Input id="price" type="number" min={0} step={1} value={form.price} onChange={(e) => update("price", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare">Compare-at price (₹, optional)</Label>
                <Input id="compare" type="number" min={0} step={1} value={form.compareAtPrice} onChange={(e) => update("compareAtPrice", e.target.value)} />
                <p className="text-xs text-muted-foreground">Shown struck through to display a discount.</p>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Visibility">
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="block font-medium text-foreground">Published</span>
                  <span className="block text-xs text-muted-foreground">Visible in the store</span>
                </span>
                <Switch checked={form.isPublished} onCheckedChange={(v) => update("isPublished", v)} />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="block font-medium text-foreground">Featured</span>
                  <span className="block text-xs text-muted-foreground">"Best seller" badge, shown first</span>
                </span>
                <Switch checked={form.isFeatured} onCheckedChange={(v) => update("isFeatured", v)} />
              </label>
              <div className="space-y-2">
                <Label htmlFor="sort">Sort order (lower first)</Label>
                <Input id="sort" type="number" min={0} value={form.sortOrder} onChange={(e) => update("sortOrder", e.target.value)} />
              </div>
            </div>
          </PanelCard>

          {isExternal ? (
            <PanelCard title="Listing checklist">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className={/^https:\/\//i.test(form.externalUrl.trim()) ? "text-foreground" : ""}>{/^https:\/\//i.test(form.externalUrl.trim()) ? "✓" : "○"} External https:// link</li>
                <li className={form.coverImageUrl || !isNew ? "text-foreground" : ""}>{form.coverImageUrl ? "✓" : "○"} Cover image</li>
                <li className={form.tagline.trim() ? "text-foreground" : ""}>{form.tagline.trim() ? "✓" : "○"} One-line tagline</li>
                <li className={form.description.trim() ? "text-foreground" : ""}>{form.description.trim() ? "✓" : "○"} Description</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">No checkout, order or delivery happens on this site for this product.</p>
            </PanelCard>
          ) : (
            <PanelCard title="Delivery checklist">
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className={form.downloadPath || form.downloadUrl || form.duplicateUrl || form.accessUrl ? "text-foreground" : ""}>
                  {form.downloadPath || form.downloadUrl || form.duplicateUrl || form.accessUrl ? "✓" : "○"} Something to deliver (file, link or access)
                </li>
                <li className={form.guideUrl ? "text-foreground" : ""}>{form.guideUrl ? "✓" : "○"} Setup guide link</li>
                <li className={form.coverImageUrl || !isNew ? "text-foreground" : ""}>{form.coverImageUrl ? "✓" : "○"} Cover image</li>
                <li className={form.faq.length > 0 ? "text-foreground" : ""}>{form.faq.length > 0 ? "✓" : "○"} At least one FAQ</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Orders are auto-delivered on payment only when there's something to deliver; otherwise they wait as "Paid" for you.</p>
            </PanelCard>
          )}
        </div>
      </div>
    </form>
  );
}
