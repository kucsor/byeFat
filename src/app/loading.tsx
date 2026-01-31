import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-card">
        <div className="container mx-auto flex h-16 max-w-3xl items-center px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="ml-2 h-6 w-24" />
        </div>
      </header>
      <main className="container mx-auto max-w-3xl flex-1 space-y-8 p-4 md:p-8">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Daily Log</h2>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </main>
    </div>
  );
}
