'use client'

import { useState, useMemo } from "react";
import InfoCard from "@/components/card";
import Header from "../app/header";
import Dropdown from "@/components/dropdown";
import { Users, ArrowDownUp, Filter, Search, Download, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/date-range-picker";
import { format, parseISO, isValid } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";


// In your DashboardClient component
import {processTransactionsToAttendance} from '@/app/actions/getAttendance.action'
// Transform the raw transactions data
const processedAttendance = useMemo(() => {
  return processTransactionsToAttendance(
    transactions.map(tx => ({
      id: tx.id,
      emp_id: tx.emp_id,
      emp_code: tx.emp_code,
      name: tx.personnel_employee 
        ? `${tx.personnel_employee.first_name} ${tx.personnel_employee.last_name}`
        : undefined,
      punch_time: tx.punch_time,
      punch_state: tx.punch_state,
      area_alias: tx.iclock_terminal?.personnel_area?.area_name,
      terminal_sn: tx.terminal_sn
    }))
  );
}, [transactions]);

// Filter based on search
const filteredAttendance = useMemo(() => {
  return processedAttendance.filter(record =>
    record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [processedAttendance, searchTerm]);
// Define your types
type Transaction = {
  id: number;
  emp_code: string;
  name: string;
  branch: string;
  timestamp: string;
  type: string;
  punch_time: string;
};

type Attendance = {
  name: string;
  branch: string;
  date: string;
  firstIn: string;
  lastOut: string;
};

type TerminalLocation = {
  sn: string;
  name: string;
  last_activity?: string
};

interface DashboardProps {
  stats: { user_count: number; transaction_count: number };
  locations: TerminalLocation[];
  transactions: Transaction[];
  attendance?: Attendance[];
  filters: {
    sn: string | null;
    from?: Date;
    to?: Date;
    sortField?: string;
    sortOrder?: "asc" | "desc";
  };
  clockedInToday: number;
  view: 'transactions' | 'attendance';
}

export default function DashboardClient({
  stats,
  locations,
  transactions,
  attendance = [],
  filters,
  clockedInToday,
  view = 'transactions'
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'transactions';

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  } | null>(null);

  const activeLocation = filters.sn
    ? locations.find((l: TerminalLocation) => l.sn === filters.sn)?.name ?? "Unknown Branch"
    : "All Branches";

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(tx =>
    tx.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.emp_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter attendance based on search term
  const filteredAttendance = (attendance || []).filter(record =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting function
  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Apply sorting to transactions
  const sortedTransactions = useMemo(() => {
    if (!sortConfig) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      // Special handling for date fields
      if (sortConfig.key === 'punch_time') {
        const dateA = new Date(a.punch_time).getTime();
        const dateB = new Date(b.punch_time).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredTransactions, sortConfig]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  // Create formatters
  const dateFormatter = new Intl.DateTimeFormat("en-us", { dateStyle: "full" });
  const timeFormatter = new Intl.DateTimeFormat("en-us", {
    timeStyle: "medium",
    hour12: true
  });

  // Sort indicator component
  const SortIndicator = ({ sortKey }: { sortKey: keyof Transaction }) => {
    if (!sortConfig || sortConfig.key !== sortKey) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />;
  };

  return (
    <>
      <Header />
      <div className="p-3 mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          title="Total Employees"
          count={stats.user_count}
          period={activeLocation}
          icon={<Users />}
          menu={<Dropdown params={locations} />}
        />
        <InfoCard
          title="Total Employees Present"
          count={clockedInToday}
          period="Today"
          icon={<Users />}
        />
        <InfoCard
          title="Total Transactions done"
          count={stats.transaction_count}
          period={activeLocation}
          icon={<ArrowDownUp />}
        />
        <InfoCard title="Avg Hours Spent" count="3" period="Today" icon={<Users />} />
      </div>

      <div className="max-w-7xl mx-auto px-3 mt-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Employee Attendance Records</h2>
          
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Input
                placeholder="Search employees..."
                className="col-span-2"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when search changes
                }}
              />
              <DatePickerWithRange
                date={{ from: filters.from || new Date(), to: filters.to || new Date() }}
                setDate={() => { }}
              />
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <div className="flex gap-2">
            <Link href="?view=attendance">
              <Button variant={currentView === 'attendance' ? "default" : "outline"} size="sm">
                Attendance
              </Button>
            </Link>
            <Link href="?view=transactions">
              <Button variant={currentView === 'transactions' ? "default" : "outline"} size="sm">
                Transactions
              </Button>
            </Link>
          </div>
            </div>
          </CardContent>
        </Card>

        {currentView === 'transactions' ? (
          <Card>
            <CardHeader>
              <CardTitle>Employee Transactions</CardTitle>
              <CardDescription>
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedTransactions.length)} of {sortedTransactions.length} transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Rows per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded p-1 text-sm"
                    >
                      {[5, 10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>

                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th 
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => requestSort('id')}
                      >
                        <div className="flex items-center gap-1">
                          S/N
                          <SortIndicator sortKey="id" />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          <SortIndicator sortKey="name" />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => requestSort('branch')}
                      >
                        <div className="flex items-center gap-1">
                          Branch
                          <SortIndicator sortKey="branch" />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 cursor-pointer"
                        onClick={() => requestSort('punch_time')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          <SortIndicator sortKey="punch_time" />
                        </div>
                      </th>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTransactions.length > 0 ? (
                      currentTransactions.map((tx, index) => {
                        const date = new Date(tx.punch_time);
                        const isValidDate = !isNaN(date.getTime());

                        return (
                          <tr key={tx.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">{tx.id}</td>
                            <td className="px-4 py-2">{tx.name}</td>
                            <td className="px-4 py-2">{tx.branch}</td>
                            <td className="px-4 py-2">
                              {isValidDate ? dateFormatter.format(date) : 'Invalid date'}
                            </td>
                            <td className="px-4 py-2">
                              {isValidDate ? timeFormatter.format(date) : 'Invalid time'}
                            </td>
                            <td className="px-4 py-2">
                              {tx.type === '0' ? (
                                <span className="text-green-600">Check-in</span>
                              ) : (
                                <span className="text-red-600">Check-out</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Employee Attendance</CardTitle>
              <CardDescription>Showing {filteredAttendance.length} employee attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2">Employee Name</th>
                      <th className="px-4 py-2">Branch</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">First Check-in</th>
                      <th className="px-4 py-2">Last Check-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((record, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{record.name}</td>
                        <td className="px-4 py-2">{record.branch}</td>
                        <td className="px-4 py-2">{record.date}</td>
                        <td className="px-4 py-2">{record.firstIn}</td>
                        <td className="px-4 py-2">{record.lastOut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}