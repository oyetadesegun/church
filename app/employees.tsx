import { getEmployeeCountByArea } from "@/app/actions/getEmployeeCountByLocation";
import { getAllBranchLocations } from "@/app/actions/locations.actions";
import {Card} from '@/components/card'
import Link from "next/link";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams?: { location?: string };
}) {
  const allLocations = await getAllBranchLocations();
  const areaId = searchParams?.location ? parseInt(searchParams.location) : null;

  const count = await getEmployeeCountByArea(areaId);

  return (
    <main className="p-4">
      <form method="get" className="mb-4 flex gap-2 items-center">
        <label htmlFor="location">Branch:</label>
        <select
          name="location"
          id="location"
          className="border px-2 py-1 rounded"
          defaultValue={searchParams?.location ?? ""}
        >
          <option value="">All Branches</option>
          {allLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.area_name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Filter
        </button>
        {searchParams?.location && (
          <Link
            href="/employees"
            className="text-sm text-gray-600 underline ml-2"
          >
            Clear
          </Link>
        )}
      </form>

      <Card
        title="Total Employees"
        count={count}
        period="Today"
        icon={<></>}
      />
    </main>
  );
}
