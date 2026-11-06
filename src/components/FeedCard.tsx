import Link from "next/link";
import { BeforeAfter } from "@/components/BeforeAfter";
import { formatDate, placeLabel } from "@/lib/config";
import type { PublishedReport } from "@/lib/queries";

export function FeedCard({ item }: { item: PublishedReport }) {
  const place = placeLabel(item);
  return (
    <article className="overflow-hidden rounded-md bg-claro">
      <BeforeAfter before={item.before} after={item.after} alt={`bache en ${place}`} />
      <div className="p-4">
        <h3 className="text-2xl"><Link href={`/tapados/${item.id}`} className="hover:underline">{place}</Link></h3>
        <p className="hint mt-0.5">Tapado el {formatDate(item.resolved_at)}</p>
        {item.resolution_note && <p className="mt-2">{item.resolution_note}</p>}
      </div>
    </article>
  );
}
