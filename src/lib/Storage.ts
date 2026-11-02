const slugifyFilename = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");

/** Uploads a file and hands back its public URL. */
export async function uploadPublicFile(
  bucket: "programme-media" | "product-images" | "member-photos",
  file: File,
  folder = "",
): Promise<string> {
  const form = new FormData();
  form.set("file", file, `${folder ? `${folder}-` : ""}${Date.now()}-${slugifyFilename(file.name)}`);
  const folderKind = folder.split("/")[0].toLowerCase();
  const section = folderKind === "pages" ? "pages"
    : folderKind === "leadership" ? "leadership"
      : folderKind === "announcements" ? "announcements"
        : folderKind === "carousel" ? "carousel"
          : folderKind === "gallery" ? "gallery"
            : folderKind === "archdeaconry" ? (folder.includes("/albums") ? "gallery" : "archdeaconries")
            : folderKind === "blog" ? "blog"
              : folderKind === "tournaments" ? "tournaments"
                : bucket === "product-images" ? "store" : "programmes";
  form.set("section", section);
  const response = await fetch("/api/media", { method: "POST", body: form });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.url !== "string") {
    throw new Error("We couldn't upload that file. Please try again.");
  }
  return result.url;
}

/** Turns a title into a URL slug, e.g. "Family Weekend 2026" → "family-weekend-2026". */
export const slugify = (text: string) =>
  text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
