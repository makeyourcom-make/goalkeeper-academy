export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="rounded-full bg-orange/10 px-4 py-1 text-sm font-medium text-orange">
        Phase 0 — Setup
      </span>
      <h1 className="text-balance text-h1-hero">Goalkeeper Academy</h1>
      <p className="max-w-xl text-lg text-grey-500">
        Le projet est initialisé. Les pages, le routing bilingue et le design
        system arrivent dans les phases suivantes.
      </p>
    </main>
  );
}
