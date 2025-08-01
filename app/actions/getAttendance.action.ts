import { format, isValid, parseISO } from 'date-fns';

export type AttendanceRecord = {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  branch: string;
  date: string;
  firstCheckIn: string;
  lastCheckIn: string;
  firstCheckInDateTime: Date;
  lastCheckInDateTime: Date;
  terminalSn: string | null;
  checkInCount: number;
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
    if (tx.emp_id === null) return;
    
    // Convert punch_time to Date if it's a string
    const punchTime = typeof tx.punch_time === 'string' 
      ? new Date(tx.punch_time) 
      : tx.punch_time;
    
    if (!isValid(punchTime)) return;
    
    const dateKey = format(punchTime, 'yyyy-MM-dd');
    const empKey = tx.emp_id.toString();
    
    if (!grouped[empKey]) {
      grouped[empKey] = {};
    }
    
    if (!grouped[empKey][dateKey]) {
      grouped[empKey][dateKey] = [];
    }
    
    grouped[empKey][dateKey].push({
      ...tx,
      punch_time: punchTime // Now definitely a Date
    });
  });

  const attendanceRecords: AttendanceRecord[] = [];

  Object.entries(grouped).forEach(([empId, dates]) => {
    Object.entries(dates).forEach(([dateKey, txs]) => {
      const sorted = [...txs].sort((a, b) => 
        a.punch_time.getTime() - b.punch_time.getTime() // Safe now
      );

      const firstCheckIn = sorted[0];
      const lastCheckIn = sorted[sorted.length - 1];

      attendanceRecords.push({
        id: firstCheckIn.id,
        employeeId: firstCheckIn.emp_id as number,
        employeeCode: firstCheckIn.emp_code,
        employeeName: firstCheckIn.name || `Employee ${firstCheckIn.emp_code}`,
        branch: firstCheckIn.area_alias || 'Unknown',
        date: format(new Date(dateKey), 'MMM dd, yyyy'),
        firstCheckIn: format(firstCheckIn.punch_time, 'hh:mm a'),
        lastCheckIn: format(lastCheckIn.punch_time, 'hh:mm a'),
        firstCheckInDateTime: new Date(firstCheckIn.punch_time),
        lastCheckInDateTime: new Date(lastCheckIn.punch_time),
        terminalSn: firstCheckIn.terminal_sn || null,
        checkInCount: sorted.length
      });
    });
  });

  return attendanceRecords;
}