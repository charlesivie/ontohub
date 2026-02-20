import Link from "next/link";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          Ontohub
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse
          </Link>
          <Link
            href="/repos"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            My Repos
          </Link>
          <Link
            href="/register"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
