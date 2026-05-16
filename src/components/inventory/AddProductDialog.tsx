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
// PRP-225 PR6 — Product Intelligence UI components.
import { ProductBadge } from "@/components/products/ProductBadge";
import { NutritionMiniPanel, type NutritionPer100g } from "@/components/products/NutritionMiniPanel";
import { EnrichmentStatus } from "@/components/products/EnrichmentStatus";

const CATEGORIES = [
  "Fruits et légumes",
  "Viandes et poissons", 
  "Produits laitiers",
  "Pain et viennoiseries",
  "Pâtes, riz et féculents",
  "Épices et condiments",
  "Sauces et huiles",
  "Conserves",
  "Épicerie sucrée",
  "Café, thé et infusions",
  "Gâteaux et biscuits",
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

/**
 * PRP-225 PR6 — adapt the legacy `useBarcodeAPI` ProductInfo nutrition
 * shape (energy_100g / proteins_100g / etc.) to the unified
 * `NutritionMiniPanel` projection (energyKcal / proteinG / …). Keeps
 * the modal forward-compatible with future barcode response shapes
 * without breaking the existing form state.
 */
function apiNutritionToProjection(n: ProductInfo['nutrition']): NutritionPer100g {
  if (!n) return {};
  return {
    energyKcal: n.energy_100g,
    proteinG: n.proteins_100g,
    carbsG: n.carbohydrates_100g,
    fatG: n.fat_100g,
  };
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
  const [categoryAutoFilled, setCategoryAutoFilled] = useState(false);
  
  const { products, addProduct, addToInventory } = useInventory();
  const { fetchProductInfo, loading: apiLoading, error: apiError } = useBarcodeAPI();

  const resetForm = () => {
    console.log('🔄 Resetting form...');
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
    setCategoryAutoFilled(false);
    setStep('product');
    console.log('✅ Form reset complete');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !category || !unitType) return;

    setLoading(true);
    try {
      let productToUse = selectedProduct;
      
      // Si on a un produit existant sélectionné, on l'utilise directement
      // Sinon on crée un nouveau produit
      if (!selectedProduct) {
        const newProduct = await addProduct({
          name: productName,
          category,
          unit_type: unitType,
          barcode: barcode || undefined,
          image_url: imageUrl
        });
        productToUse = newProduct;
        setSelectedProduct(newProduct);
      }
      
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
      // Pré-remplir les champs avec le produit existant mais rester sur l'étape produit
      setProductName(product.name);
      setCategory(product.category);
      setUnitType(product.unit_type);
      setBarcode(product.barcode || "");
      if (product.image_url) {
        setImageUrl(product.image_url);
      }
      setSelectedProduct(product);
      toast({
        title: "Produit sélectionné !",
        description: `${product.name} - Vérifiez les informations avant de continuer`,
      });
    }
  };

  const handleBarcodeScanned = async (scannedBarcode: string) => {
    console.log('📱 Barcode scanned:', scannedBarcode);
    console.log('🔍 Current form state before scan:', { productName, category, unitType, imageUrl });
    setBarcode(scannedBarcode);
    
    // Check if a product with this barcode already exists
    const existingProduct = products.find(p => p.barcode === scannedBarcode);
    if (existingProduct) {
      console.log('✅ Existing product found:', existingProduct);
      // Pré-remplir les champs avec le produit existant mais rester sur l'étape produit
      setProductName(existingProduct.name);
      setCategory(existingProduct.category);
      setUnitType(existingProduct.unit_type);
      if (existingProduct.image_url) {
        setImageUrl(existingProduct.image_url);
      }
      setSelectedProduct(existingProduct);
      toast({
        title: "Produit existant trouvé !",
        description: `${existingProduct.name} - Vous pouvez modifier les informations si nécessaire`,
      });
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
        console.log('🔄 Attempting to fill form with:', {
          name: result.product.name,
          category: result.product.category,
          categoryIncluded: result.product.category ? CATEGORIES.includes(result.product.category) : false,
          suggested_unit: result.product.suggested_unit,
          unitIncluded: result.product.suggested_unit ? UNIT_TYPES.includes(result.product.suggested_unit) : false,
          image_url: result.product.image_url
        });
        
        setProductName(result.product.name);
        console.log('✅ Product name set to:', result.product.name);
        
        if (result.product.category) {
          if (CATEGORIES.includes(result.product.category)) {
            setCategory(result.product.category);
            setCategoryAutoFilled(true);
            console.log('✅ Category set to:', result.product.category);
          } else {
            // Si la catégorie API n'est pas dans notre liste, on l'affiche quand même pour debug
            console.log('❌ Category not in our list but setting for debug. Available categories:', CATEGORIES);
            console.log('❌ API category was:', result.product.category);
            // Pour le debug, on peut essayer de la définir quand même temporairement
            console.log('🧪 TEMPORARY: Setting API category anyway for debug');
            setCategory(result.product.category);
            setCategoryAutoFilled(true);
          }
        } else {
          console.log('❌ No category returned from API');
        }
        
        if (result.product.image_url) {
          setImageUrl(result.product.image_url);
          console.log('✅ Image URL set to:', result.product.image_url);
        }
        
        if (result.product.suggested_unit && UNIT_TYPES.includes(result.product.suggested_unit)) {
          setUnitType(result.product.suggested_unit);
          console.log('✅ Unit type set to:', result.product.suggested_unit);
        } else {
          console.log('❌ Unit type not set. Available units:', UNIT_TYPES);
          console.log('❌ API suggested unit was:', result.product.suggested_unit);
        }
        
        console.log('🔍 Form state after scan:', { 
          productName: result.product.name, 
          category: result.product.category, 
          unitType: result.product.suggested_unit, 
          imageUrl: result.product.image_url 
        });
        
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
                  <Label htmlFor="category">
                    Catégorie * 
                    {categoryAutoFilled && (
                      <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        ✓ Auto-détectée
                      </span>
                    )}
                  </Label>
                  <Select 
                    value={category} 
                    onValueChange={(value) => {
                      setCategory(value);
                      setCategoryAutoFilled(false); // Reset auto-filled status when manually changed
                    }} 
                    required
                  >
                    <SelectTrigger className={categoryAutoFilled ? "border-green-300 bg-green-50" : ""}>
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
                  {categoryAutoFilled && (
                    <p className="text-xs text-green-600">
                      💡 Cette catégorie a été détectée automatiquement. Vous pouvez la modifier si nécessaire.
                    </p>
                  )}
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
                      console.log('🧪 Test button clicked in dialog - simulating barcode scan');
                      console.log('🔍 Form state BEFORE test scan:', { productName, category, unitType, imageUrl });
                      handleBarcodeScanned('3017620422003');
                    }}
                    className="shrink-0"
                    disabled={apiLoading}
                    title="Test avec Nutella (3017620422003)"
                  >
                    🧪
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      console.log('🔧 Direct form fill test - no API');
                      setProductName("Test Pain de Mie");
                      setCategory("Pain et viennoiseries");
                      setUnitType("unité(s)");
                      setCategoryAutoFilled(true);
                      console.log('✅ Direct form fill complete');
                    }}
                    className="shrink-0"
                    title="Test direct form fill"
                  >
                    🔧
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
                              setCategoryAutoFilled(true);
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

              {/* PRP-225 PR6 — informations API : tokens PRP-237
                  (surface-muted + accent-ai badge OFF) + NutritionMiniPanel +
                  EnrichmentStatus pour re-sync manuel. */}
              {apiProductInfo && (
                <div className="p-4 bg-surface-muted border rounded-md space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <ProductBadge status="enriched" source="openfoodfacts" />
                    {/* `EnrichmentStatus` n'apparaît qu'après création produit
                        (besoin de l'id). On expose un placeholder ici si
                        `selectedProduct` existe déjà, sinon le bouton
                        apparaîtra dans la `inventory` step. */}
                    {selectedProduct && (
                      <EnrichmentStatus
                        productId={selectedProduct.id}
                        status="enriched"
                        force
                        refreshLabel="Re-sync OFF"
                      />
                    )}
                  </div>

                  <div className="flex gap-3">
                    {apiProductInfo.image_url && (
                      <img
                        src={apiProductInfo.image_url}
                        alt={apiProductInfo.name}
                        className="w-16 h-16 rounded-md object-cover border"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm text-foreground">{apiProductInfo.name}</p>
                      {apiProductInfo.brand && (
                        <p className="text-xs text-muted-foreground">Marque : {apiProductInfo.brand}</p>
                      )}
                      {apiProductInfo.category && (
                        <p className="text-xs text-muted-foreground">Catégorie : {apiProductInfo.category}</p>
                      )}
                    </div>
                  </div>

                  {apiProductInfo.nutrition && (
                    <NutritionMiniPanel
                      per100g={apiNutritionToProjection(apiProductInfo.nutrition)}
                      sourceLabel="OpenFoodFacts"
                    />
                  )}

                  {apiProductInfo.ingredients && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-accent-ai">
                        Voir les ingrédients
                      </summary>
                      <p className="mt-2 text-muted-foreground">{apiProductInfo.ingredients}</p>
                    </details>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                {loading ? (
                  selectedProduct ? "Validation..." : "Création..."
                ) : (
                  selectedProduct ? "Continuer vers l'inventaire" : "Créer le produit"
                )}
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