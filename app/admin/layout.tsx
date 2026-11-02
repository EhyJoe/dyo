import { redirect } from "next/navigation";

/** Keep old bookmarks working while /private becomes the admin route. */
export default function LegacyAdminLayout() {
  redirect("/private");
}
