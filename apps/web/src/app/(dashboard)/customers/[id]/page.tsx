import { requireAuth } from "@/lib/require-auth";
import { CustomerProfileView } from "./_components/customer-profile-view";

interface Props {
  params: { id: string };
}

export default async function CustomerProfilePage({ params }: Props) {
  await requireAuth();

  return <CustomerProfileView customerId={params.id} />;
}
