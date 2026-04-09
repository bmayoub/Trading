export const dynamic = "force-dynamic";

import { MarketChart } from "@/components/market-chart";
import { getHomeChartData } from "@/lib/queries";

export default async function HomePage() {
  const chartData = await getHomeChartData();

  return <MarketChart {...chartData} />;
}
