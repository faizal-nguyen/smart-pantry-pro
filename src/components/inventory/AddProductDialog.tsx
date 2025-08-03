import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Camera, Search, Loader2 } from "lucide-react";
import { useInventory, Product } from "@/hooks/useInventory";
import { useBarcodeAPI, ProductInfo } from "@/hooks/useBarcodeAPI";
import BarcodeScanner from "./BarcodeScanner";
import { ImageUploadSection } from "./ImageUploadSection";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Fruits et légumes",
  "Viandes et poissons", 
  "Produits laitiers",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Hygiène et beauté",
  "Entretien",
  "Autres"
];

const UNIT_TYPES = [
  "unité(s)",
  "kg", 
  "g",
  "L",
  "mL",
  "paquet(s)",
  "boîte(s)",
  "sachet(s)"
];

interface AddProductDialogProps {
  trigger?: React.ReactNode;
}

const AddProductDialog = ({ trigger }: AddProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'product' | 'inventory'>('product');
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Product form
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [unitType, setUnitType] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  
  // Inventory form
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState("");
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [apiProductInfo, setApiProductInfo] = useState<ProductInfo | null>(null);
  
  const { products, addProduct, addToInventory } = useInventory();
  const { fetchProductInfo, loading: apiLoading, error: apiError } = useBarcodeAPI();

  const resetForm = () => {
    setProductName("");
    setCategory("");
    setUnitType("");
    setBarcode("");
    setImageUrl(undefined);
    setQuantity("");
    setExpiryDate("");
    setLocation("");
    setSelectedProduct(null);
    setApiProductInfo(null);
    setStep('product');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !category || !unitType) return;

    setLoading(true);
    try {
      const newProduct = await addProduct({
        name: productName,
        category,
        unit_type: unitType,
        barcode: barcode || undefined,
        image_url: imageUrl
      });
      
      setSelectedProduct(newProduct);
      setStep('inventory');
    } catch (error) {
      console.error('Error creating product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) return;

    setLoading(true);
    try {
      await addToInventory({
        product_id: selectedProduct.id,
        quantity: parseFloat(quantity),
        expiry_date: expiryDate || undefined,
        location: location || undefined
      });
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding to inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExistingProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setStep('inventory');
    }
  };

  const handleBarcodeScanned = async (scannedBarcode: string) => {
    console.log('📱 Barcode scanned:', scannedBarcode);
    setBarcode(scannedBarcode);
    
    // Check if a product with this barcode already exists
    const existingProduct = products.find(p => p.barcode === scannedBarcode);
    if (existingProduct) {
      console.log('✅ Existing product found:', existingProduct);
      setSelectedProduct(existingProduct);
      setStep('inventory');
      return;
    }

    console.log('🔍 No existing product, fetching from API...');
    
    // Try to fetch product info from API
    try {
      const result = await fetchProductInfo(scannedBarcode);
      console.log('📦 API result:', result);
      
      if (result.status === 1 && result.product) {
        console.log('✅ Product found via API:', result.product);
        setApiProductInfo(result.product);
        
        // Auto-fill form with API data
        setProductName(result.product.name);
        if (result.product.category && CATEGORIES.includes(result.product.category)) {
          setCategory(result.product.category);
        }
        if (result.product.image_url) {
          setImageUrl(result.product.image_url);
        }
        if (result.product.suggested_unit && UNIT_TYPES.includes(result.product.suggested_unit)) {
          setUnitType(result.product.suggested_unit);
        }
        
        toast({
          title: "Produit trouvé !",
          description: `Informations récupérées pour ${result.product.name}`,
        });
      } else {
        console.log('❌ Product not found in API');
        toast({
          title: "Produit non trouvé",
          description: "Aucune information disponible pour ce code-barres",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error in handleBarcodeScanned:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations du produit",
        variant: "destructive",
      });
    }
  };

  const defaultTrigger = (
    <Button className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-10">
      <Plus className="h-6 w-6" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'product' ? 'Ajouter un produit' : 'Ajouter à l\'inventaire'}
          </DialogTitle>
        </DialogHeader>

        {step === 'product' && (
          <div className="space-y-6">
            {/* Option produit existant */}
            {products.length > 0 && (
              <div className="space-y-2">
                <Label>Produit existant</Label>
                <Select onValueChange={handleExistingProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un produit existant" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="text-center text-sm text-muted-foreground my-4">
                  ou créer un nouveau produit
                </div>
              </div>
            )}

            {/* Nouveau produit */}
            <form onSubmit={handleProductSubmit} className="space-y-6">
              {/* Nom du produit - EN PREMIER */}
              <div className="space-y-2">
                <Label htmlFor="productName">Nom du produit *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="ex: Tomates cerises"
                  required
                  className="text-lg font-medium"
                />
              </div>

              {/* Section photo - PROMINENTE */}
              <div className="space-y-2">
                <Label>Photo du produit</Label>
                <ImageUploadSection
                  value={imageUrl}
                  onChange={setImageUrl}
                  productName={productName}
                  disabled={loading}
                />
              </div>

              {/* Autres champs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitType">Unité *</Label>
                  <Select value={unitType} onValueChange={setUnitType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Code-barres (optionnel)</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="ex: 1234567890123"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setScannerOpen(true)}
                    className="shrink-0"
                    disabled={apiLoading}
                  >
                    {apiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      console.log('🧪 Test button clicked in dialog');
                      alert('Test bouton dans dialog - Vérifiez la console');
                      handleBarcodeScanned('3017620422003');
                    }}
                    className="shrink-0"
                    disabled={apiLoading}
                    title="Test avec Nutella"
                  >
                    🧪
                  </Button>
                  {barcode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        try {
                          const result = await fetchProductInfo(barcode);
                          if (result.status === 1 && result.product) {
                            setApiProductInfo(result.product);
                            setProductName(result.product.name);
                            if (result.product.category && CATEGORIES.includes(result.product.category)) {
                              setCategory(result.product.category);
                            }
                            if (result.product.image_url) {
                              setImageUrl(result.product.image_url);
                            }
                            if (result.product.suggested_unit && UNIT_TYPES.includes(result.product.suggested_unit)) {
                              setUnitType(result.product.suggested_unit);
                            }
                            toast({
                              title: "Produit trouvé !",
                              description: `Informations récupérées pour ${result.product.name}`,
                            });
                          } else {
                            toast({
                              title: "Produit non trouvé",
                              description: "Aucune information disponible pour ce code-barres",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Erreur",
                            description: "Impossible de récupérer les informations du produit",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={apiLoading}
                    >
                      {apiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Affichage des informations API */}
              {apiProductInfo && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">
                      Informations récupérées automatiquement
                    </span>
                  </div>
                  
                  <div className="flex gap-3">
                    {apiProductInfo.image_url && (
                      <img 
                        src={apiProductInfo.image_url} 
                        alt={apiProductInfo.name}
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">{apiProductInfo.name}</p>
                      {apiProductInfo.brand && (
                        <p className="text-xs text-muted-foreground">Marque: {apiProductInfo.brand}</p>
                      )}
                      {apiProductInfo.category && (
                        <p className="text-xs text-muted-foreground">Catégorie: {apiProductInfo.category}</p>
                      )}
                      {apiProductInfo.nutrition && (
                        <p className="text-xs text-muted-foreground">
                          {apiProductInfo.nutrition.energy_100g && 
                            `${Math.round(apiProductInfo.nutrition.energy_100g)} kcal/100g`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {apiProductInfo.ingredients && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-green-700 font-medium">
                        Voir les ingrédients
                      </summary>
                      <p className="mt-2 text-green-600">{apiProductInfo.ingredients}</p>
                    </details>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                {loading ? "Création..." : "Créer le produit"}
              </Button>
            </form>
          </div>
        )}

        {step === 'inventory' && selectedProduct && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
              {selectedProduct.image_url && (
                <img 
                  src={selectedProduct.image_url} 
                  alt={selectedProduct.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.category} • {selectedProduct.unit_type}
                </p>
              </div>
            </div>

            <form onSubmit={handleInventorySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`ex: 2 ${selectedProduct.unit_type}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Date d'expiration (optionnel)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localisation (optionnel)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ex: Frigo, Placard cuisine..."
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep('product')}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Ajout..." : "Ajouter à l'inventaire"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
      
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </Dialog>
  );
};

export default AddProductDialog;