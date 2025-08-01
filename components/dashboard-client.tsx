'use client';

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

// Define your types
type Transaction = {
  emp_id: string | null;
  id: number;
  emp_code: string;
  name: string;
  branch: string;
  punch_time: string;
  punch_state: string;
  personnel_employee?: {
    first_name: string;
    last_name: string;
  };
  iclock_terminal?: {
    personnel_area?: {
      area_name: string;
    };
  };
  terminal_sn?: string;
};

type AttendanceRecord = {
  id: number;
  employeeId: number | null;
  employeeCode: string;
  employeeName: string;
  branch: string;
  date: string;
  firstIn: string;
  lastOut: string;
  firstInDateTime: Date;
  lastOutDateTime: Date | null;
  terminalSn: string | null;
  workHours?: string;
};

type TerminalLocation = {
  sn: string;
  name: string;
  last_activity?: string;
};

interface DashboardProps {
  stats: { user_count: number; transaction_count: number };
  locations: TerminalLocation[];
  transactions: Transaction[];
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

function processTransactionsToAttendance(transactions: Transaction[]): AttendanceRecord[] {
  const grouped: Record<string, Record<string, Transaction[]>> = {};

  transactions.forEach((tx) => {
    // Skip transactions without employee ID or invalid punch time
    if (tx.emp_id === null || tx.emp_id === undefined) return;
    
    try {
      const date = new Date(tx.punch_time);
      if (!isValid(date)) return;
      
      const dateKey = format(date, 'yyyy-MM-dd');
      const empKey = tx.emp_id; // Now safe because we checked emp_id
      
      if (!grouped[empKey]) grouped[empKey] = {};
      if (!grouped[empKey][dateKey]) grouped[empKey][dateKey] = [];
      
      grouped[empKey][dateKey].push(tx);
    } catch (error) {
      console.error('Error processing transaction:', tx.id, error);
      return;
    }
  });

  const attendanceRecords: AttendanceRecord[] = [];

  Object.entries(grouped).forEach(([empId, dates]) => {
    Object.entries(dates).forEach(([dateKey, txs]) => {
      try {
        const sorted = [...txs].sort((a, b) => 
          new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
        );

        const checkIns = sorted.filter(tx => tx.punch_state === "0");
        const checkOuts = sorted.filter(tx => tx.punch_state === "1");

        const firstIn = checkIns[0];
        if (!firstIn) return; // Skip if no check-in found

        const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1] : null;

        attendanceRecords.push({
          id: firstIn.id,
          employeeId: firstIn.emp_id,
          employeeCode: firstIn.emp_code,
          employeeName: firstIn.personnel_employee 
            ? `${firstIn.personnel_employee.first_name} ${firstIn.personnel_employee.last_name}`
            : `Employee ${firstIn.emp_code}`,
          branch: firstIn.iclock_terminal?.personnel_area?.area_name || 'Unknown',
          date: format(new Date(dateKey), 'MMM dd, yyyy'),
          firstIn: format(new Date(firstIn.punch_time), 'hh:mm a'),
          lastOut: lastOut ? format(new Date(lastOut.punch_time), 'hh:mm a') : 'N/A',
          firstInDateTime: new Date(firstIn.punch_time),
          lastOutDateTime: lastOut ? new Date(lastOut.punch_time) : null,
          terminalSn: firstIn.terminal_sn || null
        });
      } catch (error) {
        console.error('Error creating attendance record for employee:', empId, 'date:', dateKey, error);
      }
    });
  });

  return attendanceRecords;
}

export default function DashboardClient({
  stats,
  locations,
  transactions = [],
  filters,
  clockedInToday,
  view = 'transactions'
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || view;

  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Process attendance data
  const processedAttendance = useMemo(() => {
    return processTransactionsToAttendance(transactions);
  }, [transactions]);

  // Filter and sort data
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx =>
      tx.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.emp_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const filteredAttendance = useMemo(() => {
    return processedAttendance.filter(record =>
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [processedAttendance, searchTerm]);

  const sortedTransactions = useMemo(() => {
    if (!sortConfig) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      if (sortConfig.key === 'punch_time') {
        const dateA = new Date(a.punch_time).getTime();
        const dateB = new Date(b.punch_time).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, sortConfig]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const activeLocation = filters.sn
    ? locations.find((l) => l.sn === filters.sn)?.name ?? "Unknown Branch"
    : "All Branches";

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const SortIndicator = ({ sortKey }: { sortKey: keyof Transaction }) => {
    if (!sortConfig || sortConfig.key !== sortKey) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4 inline" /> 
      : <ChevronDown className="w-4 h-4 inline" />;
  };

  const dateFormatter = new Intl.DateTimeFormat("en-us", { dateStyle: "full" });
  const timeFormatter = new Intl.DateTimeFormat("en-us", {
    timeStyle: "medium",
    hour12: true
  });

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
                  setCurrentPage(1);
                }}
              />
              <DatePickerWithRange
                date={{ from: filters.from || new Date(), to: filters.to || new Date() }}
                setDate={() => {}}
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
          <TransactionsView
            transactions={currentTransactions}
            totalItems={sortedTransactions.length}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            onPageChange={setCurrentPage}
            sortConfig={sortConfig}
            onRequestSort={requestSort}
            SortIndicator={SortIndicator}
          />
        ) : (
          <AttendanceView attendance={filteredAttendance} />
        )}
      </div>
    </>
  );
}

function TransactionsView({
  transactions,
  totalItems,
  indexOfFirstItem,
  indexOfLastItem,
  currentPage,
  totalPages,
  itemsPerPage,
  onItemsPerPageChange,
  onPageChange,
  sortConfig,
  onRequestSort,
  SortIndicator
}: {
  transactions: Transaction[];
  totalItems: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onPageChange: (page: number) => void;
  sortConfig: { key: keyof Transaction; direction: 'asc' | 'desc' } | null;
  onRequestSort: (key: keyof Transaction) => void;
  SortIndicator: ({ sortKey }: { sortKey: keyof Transaction }) => JSX.Element | null;
}) {
  const dateFormatter = new Intl.DateTimeFormat("en-us", { dateStyle: "full" });
  const timeFormatter = new Intl.DateTimeFormat("en-us", {
    timeStyle: "medium",
    hour12: true
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Transactions</CardTitle>
        <CardDescription>
          Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} of {totalItems} transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
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
                onClick={() => onPageChange(currentPage - 1)}
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
                onClick={() => onPageChange(currentPage + 1)}
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
                  onClick={() => onRequestSort('id')}
                >
                  <div className="flex items-center gap-1">
                    S/N
                    <SortIndicator sortKey="id" />
                  </div>
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => onRequestSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <SortIndicator sortKey="name" />
                  </div>
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => onRequestSort('branch')}
                >
                  <div className="flex items-center gap-1">
                    Branch
                    <SortIndicator sortKey="branch" />
                  </div>
                </th>
                <th 
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => onRequestSort('punch_time')}
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
              {transactions.length > 0 ? (
                transactions.map((tx) => {
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
                        {tx.punch_state === '0' ? (
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
  );
}

function AttendanceView({ attendance }: { attendance: AttendanceRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Check-ins</CardTitle>
        <CardDescription>
          Showing {attendance.length} employee check-in records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">First Check-in</th>
                <th className="px-4 py-2">Last Check-in</th>
                <th className="px-4 py-2">Total Check-ins</th>
                <th className="px-4 py-2">Terminal</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length > 0 ? (
                attendance.map((record) => (
                  <tr 
                    key={`${record.employeeId}-${record.date}`} 
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">{record.employeeName}</td>
                    <td className="px-4 py-2">{record.employeeCode}</td>
                    <td className="px-4 py-2">{record.branch}</td>
                    <td className="px-4 py-2">{record.date}</td>
                    <td className="px-4 py-2">{record.firstCheckIn}</td>
                    <td className="px-4 py-2">{record.lastCheckIn}</td>
                    <td className="px-4 py-2">{record.checkInCount}</td>
                    <td className="px-4 py-2">{record.terminalSn || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                    No check-in records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}