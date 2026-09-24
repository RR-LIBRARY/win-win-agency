import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
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
import { TEMPLATE_CATEGORIES, parseFaq, type TemplateFaq } from "@/lib/db-types";
import { adminDeleteTemplate, adminGetTemplate, adminSaveTemplate, type TemplateInput } from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/admin/templates/$id")({
  component: TemplateEditorPage,
});

type FormState = {
  title: string;
  slug: string;
  slugTouched: boolean;
  tagline: string;
  category: string;
  price: string;
  compareAtPrice: string;
  coverImageUrl: string;
  galleryUrls: string;
  description: string;
  highlights: string;
  includes: string;
  previewUrl: string;
  faq: TemplateFaq[];
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
  duplicateUrl: string;
  guideUrl: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  slugTouched: false,
  tagline: "",
  category: "productivity",
  price: "",
  compareAtPrice: "",
  coverImageUrl: "",
  galleryUrls: "",
  description: "",
  highlights: "",
  includes: "",
  previewUrl: "",
  faq: [],
  isPublished: false,
  isFeatured: false,
  sortOrder: "0",
  duplicateUrl: "",
  guideUrl: "",
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

function lines(value: string) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function TemplateEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

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
      price: String(template.price),
      compareAtPrice: template.compare_at_price == null ? "" : String(template.compare_at_price),
      coverImageUrl: template.cover_image_url ?? "",
      galleryUrls: template.gallery_urls.join("\n"),
      description: template.description,
      highlights: template.highlights.join("\n"),
      includes: template.includes.join("\n"),
      previewUrl: template.preview_url ?? "",
      faq: parseFaq(template.faq),
      isPublished: template.is_published,
      isFeatured: template.is_featured,
      sortOrder: String(template.sort_order),
      duplicateUrl: deliverable?.duplicate_url ?? "",
      guideUrl: deliverable?.guide_url ?? "",
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
        price: Number(form.price) || 0,
        compare_at_price: form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null,
        cover_image_url: form.coverImageUrl.trim() || null,
        gallery_urls: lines(form.galleryUrls),
        includes: lines(form.includes),
        highlights: lines(form.highlights),
        preview_url: form.previewUrl.trim() || null,
        faq: form.faq.filter((f) => f.q.trim() && f.a.trim()),
        is_published: form.isPublished,
        is_featured: form.isFeatured,
        sort_order: Number(form.sortOrder) || 0,
        deliverable: {
          duplicate_url: form.duplicateUrl.trim(),
          guide_url: form.guideUrl.trim(),
          notes: form.notes.trim(),
        },
      };
      return adminSaveTemplate({ data: payload });
    },
    onSuccess: async (result) => {
      toast.success(isNew ? "Template created" : "Template saved");
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
      toast.success(result.deleted ? "Template deleted" : "Template unpublished (it has orders, so it was kept)");
      await queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      await navigate({ to: "/admin/templates" });
    },
    onError: (error) => toast.error("Could not delete", { description: error.message }),
  });

  if (!isNew && existing.isLoading) return <PanelLoading rows={5} />;
  if (!isNew && existing.error) return <PanelError error={existing.error} />;
  if (!isNew && existing.data === null) {
    return (
      <PanelCard>
        <p className="text-sm text-muted-foreground">Template not found.</p>
        <Link to="/admin/templates" className="mt-3 inline-flex text-sm text-primary hover:underline">
          Back to templates
        </Link>
      </PanelCard>
    );
  }

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
          <ArrowLeft className="h-4 w-4" /> Templates
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
                  <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    If customers have ordered it, it will be unpublished instead so their orders stay intact.
                  </AlertDialogDescription>
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
            {isNew ? "Create template" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                <p className="text-xs text-muted-foreground">/templates/{form.slug || "…"}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tagline">Tagline (one line under the title)</Label>
                <Input id="tagline" value={form.tagline} onChange={(e) => update("tagline", e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={6} value={form.description} onChange={(e) => update("description", e.target.value)} />
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

          <PanelCard title="Images & preview" description="Paste image links (e.g. from Notion, Imgur or your drive). Starter templates use built-in covers when this is empty.">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cover">Cover image URL</Label>
                <Input id="cover" type="url" placeholder="https://…" value={form.coverImageUrl} onChange={(e) => update("coverImageUrl", e.target.value)} />
                {form.coverImageUrl ? (
                  <img src={form.coverImageUrl} alt="Cover preview" className="mt-2 aspect-[3/2] w-full max-w-sm rounded-lg border border-border object-cover" />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery">Gallery image URLs (one per line)</Label>
                <Textarea id="gallery" rows={3} value={form.galleryUrls} onChange={(e) => update("galleryUrls", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview">Public preview link (optional)</Label>
                <Input id="preview" type="url" placeholder="https://notion.site/…" value={form.previewUrl} onChange={(e) => update("previewUrl", e.target.value)} />
              </div>
            </div>
          </PanelCard>

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
                    <Input
                      placeholder="Question"
                      value={item.q}
                      onChange={(e) => update("faq", form.faq.map((f, i) => (i === index ? { ...f, q: e.target.value } : f)))}
                    />
                    <Input
                      placeholder="Answer"
                      value={item.a}
                      onChange={(e) => update("faq", form.faq.map((f, i) => (i === index ? { ...f, a: e.target.value } : f)))}
                    />
                    <button type="button" aria-label="Remove question" onClick={() => update("faq", form.faq.filter((_, i) => i !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Delivery (private)" description="Only shown to buyers after you mark their order as delivered.">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="dup">Notion duplicate link</Label>
                <Input id="dup" placeholder="https://www.notion.so/…?duplicate=true" value={form.duplicateUrl} onChange={(e) => update("duplicateUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guide">Setup guide link (video or doc)</Label>
                <Input id="guide" placeholder="https://…" value={form.guideUrl} onChange={(e) => update("guideUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the buyer</Label>
                <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="How to duplicate, support contact…" />
              </div>
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard title="Pricing">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
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
        </div>
      </div>
    </form>
  );
}
