import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";

const Inventory = () => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventaire</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>
      
      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Package className="w-5 h-5 mr-2 text-primary" />
              Votre inventaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aucun produit en stock pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;