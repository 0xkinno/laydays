import { Footer } from "@/components/Footer";

export function Page({ tag, title, intro, children, wide = false }: { tag: string; title: string; intro?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <main className={`mx-auto px-4 pb-24 pt-28 sm:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
        <p className="tag text-ink-soft">{tag}</p>
        <h1 className="display mt-2 text-5xl leading-tight sm:text-6xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">{intro}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <Footer />
    </>
  );
}
