// app/page.tsx
import { getTerminalStatsBySN, getAllBranchLocations, getTransactionsByFilters, getTodayClockIns} from "./actions/employee.action";
import DashboardClient from "@/components/dashboard-client";
import { parseISO } from "date-fns";

// 👇 Add this line to mark the page as dynamic
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: {
    location?: string;
    from?: string;
    to?: string;
    sortField?: string;
    sortOrder?: "asc" | "desc";
  };
}

export default async function Home(props: PageProps) {
  const searchParams = props.searchParams ?? {};
  const sn = searchParams.location ?? null;
  const from = searchParams.from ? parseISO(searchParams.from) : undefined;
  const to = searchParams.to ? parseISO(searchParams.to) : undefined;
  const sortField = searchParams.sortField ?? undefined;
  const sortOrder = searchParams.sortOrder ?? undefined;

  const [stats, locations, transactions,clockedInToday] = await Promise.all([
    getTerminalStatsBySN(sn),
    getAllBranchLocations(),
    getTransactionsByFilters({ sn, from, to, sortField, sortOrder }),
    getTodayClockIns(sn), // ✅ this line
  ]);

  return (
    <DashboardClient
      stats={stats}
      locations={locations}
      transactions={transactions}
      filters={{ sn, from, to, sortField, sortOrder }}
      clockedInToday={clockedInToday} // ✅ pass to client
      view={"transactions"}    />
  );
}
