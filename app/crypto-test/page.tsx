export const dynamic = "force-dynamic";

import { PageTitle } from "@/components/header";
import { CryptoTestPanel } from "@/components/crypto-test-panel";
import { getCryptoTestPayload } from "@/lib/crypto-test";

export default async function CryptoTestPage() {
  const payload = await getCryptoTestPayload();

  return (
    <div className="page-shell container">
      <PageTitle
        title="تجربة الكريبتو"
        subtitle="صفحة مستقلة لـ BTC/USD و ETH/USD تعمل خارج دورة الفوركس، ويمكنك من الواجهة تحديد دقيقة الجلب من كل ساعة لتجربة التحديث بسهولة."
      />
      <CryptoTestPanel initialPayload={payload} />
    </div>
  );
}