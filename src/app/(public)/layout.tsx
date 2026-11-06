import { PublicNav } from "@/components/PublicNav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 has-[[data-fullscreen]]:pb-0">{children}</div>
    </>
  );
}
