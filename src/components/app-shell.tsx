import Link from "next/link";
import { signOutAction } from "@/app/sign-out-action";

const nav = ["Dashboard", "Bookings", "Customers", "Catalog", "Contracts", "Settings"] as const;

function NavigationIcon({ name }: Readonly<{ name: (typeof nav)[number] }>) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };
  const icons: Record<(typeof nav)[number], React.ReactNode> = {
    Dashboard: (
      <>
        <rect {...common} x="3" y="3" width="7" height="7" rx="1" />
        <rect {...common} x="14" y="3" width="7" height="7" rx="1" />
        <rect {...common} x="3" y="14" width="7" height="7" rx="1" />
        <rect {...common} x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    Bookings: (
      <>
        <rect {...common} x="3" y="5" width="18" height="16" rx="2" />
        <path {...common} d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    Customers: (
      <>
        <circle {...common} cx="12" cy="8" r="3" />
        <path {...common} d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
      </>
    ),
    Catalog: (
      <>
        <path {...common} d="M4 5.5 12 3l8 2.5v13L12 21l-8-2.5zM12 3v18M4 5.5l8 2.5 8-2.5" />
      </>
    ),
    Contracts: (
      <>
        <path {...common} d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h5" />
      </>
    ),
    Settings: (
      <>
        <circle {...common} cx="12" cy="12" r="3" />
        <path
          {...common}
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.5-1H5v-3.2h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.4 1Z"
        />
      </>
    ),
  };
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export function AppShell({
  children,
  activeItem,
}: Readonly<{ children: React.ReactNode; activeItem?: (typeof nav)[number] }>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        className="sr-only absolute left-4 top-4 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only"
        href="#main-content"
      >
        Skip to main content
      </a>
      <aside className="hidden min-h-screen w-60 flex-col border-r border-slate-200/90 bg-white p-4 md:fixed md:flex">
        <Link className="px-2 text-lg font-semibold tracking-tight text-slate-900" href="/">
          Rental Booking
        </Link>
        <form action="/search" className="mt-6 flex gap-2 px-2" method="get">
          <label className="sr-only" htmlFor="global-search">
            Search bookings, customers, products, and bundles
          </label>
          <input
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            id="global-search"
            name="q"
            placeholder="Search..."
            type="search"
          />
          <button
            aria-label="Search"
            className="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            type="submit"
          >
            →
          </button>
        </form>
        <nav aria-label="Main navigation" className="mt-10 space-y-1">
          {nav.map((item) => (
            <Link
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activeItem === item ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
              href={item === "Dashboard" ? "/" : `/${item.toLowerCase()}`}
              key={item}
            >
              <NavigationIcon name={item} />
              {item}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="mb-4 flex items-center gap-3 px-2 text-sm text-slate-600">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white"
            >
              A
            </span>
            <span>Administrator</span>
          </div>
          <form action={signOutAction}>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              type="submit"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="mx-auto max-w-7xl p-5 pb-24 md:ml-60 md:p-9" id="main-content">
        {children}
      </main>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-slate-200 bg-white/95 p-2 backdrop-blur md:hidden"
      >
        {nav.slice(0, 5).map((item) => (
          <Link
            className={`flex min-w-14 flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${activeItem === item ? "text-blue-700" : "text-slate-500"}`}
            href={item === "Dashboard" ? "/" : `/${item.toLowerCase()}`}
            key={item}
          >
            <NavigationIcon name={item} />
            {item}
          </Link>
        ))}
      </nav>
    </div>
  );
}
