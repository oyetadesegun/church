// utils/processAttendance.ts
import { format, parseISO, isValid, isSameDay } from 'date-fns';

export type AttendanceRecord = {
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

export function processTransactionsToAttendance(
  transactions: {
    id: number;
    emp_id: number | null;
    emp_code: string;
    name?: string;
    punch_time: Date | string;
    punch_state: string;
    area_alias?: string | null;
    terminal_sn?: string | null;
  }[]
): AttendanceRecord[] {
  // Group by employee and date
  const grouped: Record<string, Record<string, typeof transactions>> = {};

  transactions.forEach((tx) => {
    if (tx.emp_id === null) return; // Skip transactions without employee ID
    
    const date = new Date(tx.punch_time);
    if (!isValid(date)) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const empKey = tx.emp_id.toString();
    
    if (!grouped[empKey]) {
      grouped[empKey] = {};
    }
    
    if (!grouped[empKey][dateKey]) {
      grouped[empKey][dateKey] = [];
    }
    
    grouped[empKey][dateKey].push(tx);
  });

  // Process each employee's daily records
  const attendanceRecords: AttendanceRecord[] = [];

  Object.entries(grouped).forEach(([empId, dates]) => {
    Object.entries(dates).forEach(([dateKey, txs]) => {
      // Sort transactions by time
      const sorted = [...txs].sort((a, b) => 
        new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
      );

      // Find all check-ins (type "0") and check-outs (type "1")
      const checkIns = sorted.filter(tx => tx.punch_state === "0");
      const checkOuts = sorted.filter(tx => tx.punch_state === "1");

      const firstIn = checkIns[0];
      const lastOut = checkOuts.length > 0 
        ? checkOuts[checkOuts.length - 1] 
        : null;

      // Calculate working hours if both check-in and check-out exist
      let workHours = null;
      if (firstIn && lastOut) {
        const diffMs = new Date(lastOut.punch_time).getTime() - 
                       new Date(firstIn.punch_time).getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        workHours = `${diffHrs}h ${diffMins}m`;
      }

      if (firstIn) {
        attendanceRecords.push({
          id: firstIn.id,
          employeeId: firstIn.emp_id,
          employeeCode: firstIn.emp_code,
          employeeName: firstIn.name || `Employee ${firstIn.emp_code}`,
          branch: firstIn.area_alias || 'Unknown',
          date: format(new Date(dateKey), 'MMM dd, yyyy'),
          firstIn: format(new Date(firstIn.punch_time), 'hh:mm a'),
          lastOut: lastOut 
            ? format(new Date(lastOut.punch_time), 'hh:mm a') 
            : 'N/A',
          firstInDateTime: new Date(firstIn.punch_time),
          lastOutDateTime: lastOut ? new Date(lastOut.punch_time) : null,
          terminalSn: firstIn.terminal_sn || null,
          workHours
        });
      }
    });
  });

  return attendanceRecords;
}