"use client";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { portalSignedUrl } from "./actions";

export function DownloadButton({ id }: { id: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const r = await portalSignedUrl(id);
        if (!r.ok) return toast.error(r.error);
        window.open(r.url, "_blank", "noopener");
      }}
    >
      <Download size={18} aria-hidden /> Descargar
    </Button>
  );
}
