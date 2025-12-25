"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDeleteDialog({ article, onClose, onConfirm }) {

    if (!article) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <p>Êtes-vous sûr de vouloir supprimer l'article <strong>{article.name}</strong> (SKU: {article.sku}) ?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button variant="destructive" onClick={onConfirm}>Supprimer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
