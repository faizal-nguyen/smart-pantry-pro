import PageWrapper from "@/components/navigation/PageWrapper";
import Inventory from "./Inventory";

const InventoryPage = () => {
  return (
    <PageWrapper requireAuth={true}>
      <Inventory />
    </PageWrapper>
  );
};

export default InventoryPage;