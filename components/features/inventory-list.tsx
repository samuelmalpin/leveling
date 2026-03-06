import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InventoryItem = {
  id: string;
  item_name: string;
  rarity: string;
  quantity: number;
};

export function InventoryList({ items }: { items: InventoryItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-mutedForeground">No loot items yet. Complete workouts to drop loot.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{item.item_name}</p>
              <p className="text-xs uppercase text-mutedForeground">{item.rarity}</p>
              <p className="text-xs text-mutedForeground">Qty: {item.quantity}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
