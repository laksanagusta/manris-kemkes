import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompositionChart, Heatmap, TrendChart } from "./widgets";
import { CategoriesChart } from "./categories-chart";

export function Fokus() {
  return (
    <Tabs defaultValue="profil" className="min-w-0 gap-4 border-t border-border pt-6 lg:pt-8">
      <TabsList aria-label="Tampilan dashboard" className="w-full sm:w-fit">
        <TabsTrigger value="profil" className="px-3 motion-reduce:transition-none">Profil risiko</TabsTrigger>
        <TabsTrigger value="tingkat" className="px-3 motion-reduce:transition-none">Tingkat risiko</TabsTrigger>
      </TabsList>
      <TabsContent value="profil" className="grid gap-4 xl:grid-cols-2">
        <TrendChart />
        <CategoriesChart />
      </TabsContent>
      <TabsContent value="tingkat" className="grid gap-4 xl:grid-cols-2">
        <CompositionChart />
        <Heatmap />
      </TabsContent>
    </Tabs>
  );
}
