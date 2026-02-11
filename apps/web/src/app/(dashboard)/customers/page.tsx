import { requireAuth } from "@/lib/require-auth";
import { CustomerListView } from "./_components/customer-list-view";

export default async function CustomersPage() {
  await requireAuth();

  return <CustomerListView />;
}
