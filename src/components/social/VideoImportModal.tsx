/**
 * Video Import Modal Component
 * Modal wrapper for video import functionality
 */

import React from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoImportCard } from './VideoImportCard';
import { Recipe } from '@/types/recipe';

interface VideoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (recipe: Recipe) => void;
}

export function VideoImportModal({ isOpen, onClose, onImport }: VideoImportModalProps) {
  console.log('VideoImportModal: Rendered with isOpen:', isOpen);
  
  const handleImport = (recipe: Recipe) => {
    console.log('VideoImportModal: handleImport called with recipe:', recipe);
    if (onImport) {
      onImport(recipe);
    }
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    console.log('VideoImportModal: onOpenChange called with:', open);
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Import Vidéo Intelligent</DialogTitle>
        </DialogHeader>
        <VideoImportCard 
          onImport={handleImport}
          className="border-0 shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}