// PRP-238 PR2 — PageWrapper retire. L'auth check + AppNavigation
// sont gerees par AuthenticatedLayout (cf. App.tsx). Cette page n'a
// plus qu'a rendre le composant Inventory.
import Inventory from "./Inventory";

const InventoryPage = () => <Inventory />;

export default InventoryPage;
