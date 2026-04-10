export const dynamic = "force-dynamic";

import { WatchlistPanel } from "@/components/watchlist-panel";
import { PageTitle } from "@/components/header";
import { STRATEGY_ONE_KEY } from "@/lib/strategy";

export default function WatchlistPage() {
  return (
    <div className="page-shell container">
      <PageTitle
        title="الاستراتيجية 1"
        subtitle=""
      />
      <WatchlistPanel strategyKey={STRATEGY_ONE_KEY} />
    </div>
  );
}