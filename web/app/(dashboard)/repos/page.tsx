import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Repositories",
};

export default function ReposPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">My Repositories</h1>
      {/* TODO: RepoList with webhook status indicators */}
    </main>
  );
}
