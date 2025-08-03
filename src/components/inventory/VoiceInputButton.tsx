import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import VoiceInputDialog from "./VoiceInputDialog";

const VoiceInputButton = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-36 right-4 h-12 w-12 rounded-full shadow-lg z-10 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Mic className="h-5 w-5" />
      </Button>

      <VoiceInputDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  );
};

export default VoiceInputButton;