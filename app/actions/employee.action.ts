'use server';

import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, format, parseISO } from "date-fns";

interface FilterArgs {
  sn?: string | null
  from?: Date
  to?: Date
  sortField?: string
  sortOrder?: "asc" | "desc"
}
export type TransactionRow = { id: number; timestamp: Date; employee_name: string; branch: string }
export type AttendanceRow = { emp_id: number; employee_name: string; branch: string; first_in: Date; last_in: Date }

// Get total users and transactions from terminal matching sn
export async function getTerminalStatsBySN(sn?: string | null) {
  if (!sn) {
    const result = await prisma.iclock_terminal.aggregate({
      _sum: {
        user_count: true,
        transaction_count: true,
      },
    });

    return {
      user_count: result._sum.user_count ?? 0,
      transaction_count: result._sum.transaction_count ?? 0,
    };
  }

  const terminal = await prisma.iclock_terminal.findUnique({
    where: { sn },
    select: {
      user_count: true,
      transaction_count: true,
    },
  });

  return {
    user_count: terminal?.user_count ?? 0,
    transaction_count: terminal?.transaction_count ?? 0,
  };
}

// For dropdown/modal: fetch sn + area_name
export async function getAllBranchLocations() {
  const terminals = await prisma.iclock_terminal.findMany({
    where: { personnel_area: { is_default: false } },
    select: {
      sn: true,
      personnel_area: {
        select: {
          area_name: true,
        },
      },
    },
  });

  return terminals.map((t) => ({
    sn: t.sn,
    name: t.personnel_area?.area_name || t.sn,
  }));
}

export async function getTransactionsByFilters({ sn, from, to }: FilterArgs) {
  const filters: any = {};

  if (sn) {
    filters.terminal_sn = sn;
  }

  if (from || to) {
    filters.check_datetime = {  // Changed from punch_time to check_datetime
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const transactions = await prisma.ep_eptransaction.findMany({
    where: filters,
    include: {
      personnel_employee: { select: { first_name: true } },
      iclock_terminal: {
        include: { personnel_area: true },
      },
    },
    orderBy: {
      check_datetime: "desc",  // Changed from punch_time to check_datetime
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    emp_code: tx.emp_code,
    name: tx.personnel_employee?.first_name || "Unknown",
    branch: tx.iclock_terminal?.personnel_area?.area_name || "Unknown",
    timestamp: format(tx.check_datetime, "PPpp"),  // Changed from punch_time
    type: tx.punch_state === '0' ? 'Check-in' : 'Check-out',
    punch_time: tx.check_datetime!.toString()  // Changed from punch_time
  }));
}

export async function getAttendanceByFilters({ sn, from, to }: FilterArgs) {
  const filters: any = {};

  if (sn) {
    filters.terminal_sn = sn;
  }

  if (from || to) {
    filters.check_datetime = {  // Changed from punch_time
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const allTx = await prisma.ep_eptransaction.findMany({
    where: filters,
    include: {
      personnel_employee: { select: { first_name: true } },
      iclock_terminal: {
        include: { personnel_area: true },
      },
    },
    orderBy: {
      punch_time: "desc",  // Changed from punch_time
    },
  });

  // Group by employee and date
  const grouped = new Map<string, {
    name: string;
    branch: string;
    date: string;
    firstIn: Date;
    lastOut: Date;
  }>();

  for (const tx of allTx) {
    if (!tx.emp_id || !tx.check_datetime) continue;  // Changed from punch_time
    
    const dateKey = `${tx.emp_id}-${format(tx.check_datetime, 'yyyy-MM-dd')}`;
    const name = tx.personnel_employee?.first_name || "Unknown";
    const branch = tx.iclock_terminal?.personnel_area?.area_name || "Unknown";
    const date = format(tx.check_datetime, 'yyyy-MM-dd');
    const punchTime = tx.check_datetime;
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        name,
        branch,
        date,
        firstIn: punchTime,
        lastOut: punchTime
      });
    } else {
      const record = grouped.get(dateKey)!;
      if (punchTime < record.firstIn) record.firstIn = punchTime;
      if (punchTime > record.lastOut) record.lastOut = punchTime;
    }
  }

  return Array.from(grouped.values()).map(record => ({
    name: record.name,
    branch: record.branch,
    date: format(record.date, 'PP'),
    firstIn: format(record.firstIn, 'pp'),
    lastOut: format(record.lastOut, 'pp')
  }));
}

export async function getTransactionsPaginated({
  sn, from, to, sortField = 'check_datetime', sortOrder = 'desc', page = 1, pageSize = 10
}: {
  sn?: string; from?: Date; to?: Date; sortField?: 'check_datetime' | 'id'; sortOrder?: 'asc' | 'desc'; page?: number; pageSize?: number
}) {
  const where: any = {}
  if (sn) where.terminal_sn = sn
  if (from || to) where.check_datetime = { ...(from && { gte: from }), ...(to && { lte: to }) }

  const [rows, count] = await prisma.$transaction([
    prisma.ep_eptransaction.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        personnel_employee: { select: { first_name: true } },
        iclock_terminal: { include: { personnel_area: { select: { area_name: true } } } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ep_eptransaction.count({ where }),
  ])

  return {
    entries: rows.map(r => ({
      id: r.id,
      emp_code: r.emp_code,
      timestamp: r.check_datetime!,
      name: r.personnel_employee?.first_name || 'Unknown',
      branch: r.iclock_terminal?.personnel_area?.area_name || 'Unknown',
      type: r.punch_state === '0' ? 'Check-in' : 'Check-out'
    })),
    total: count,
  }
}

export async function getTodayClockIns(sn?: string | null) {
  const today = new Date();
  const from = startOfDay(today);
  const to = endOfDay(today);

  const terminalIds = sn
    ? (
        await prisma.iclock_terminal.findMany({
          where: { sn },
          select: { id: true },
        })
      ).map((t) => t.id)
    : undefined;

  const employees = await prisma.ep_eptransaction.findMany({
    where: {
      ...(terminalIds ? { terminal_id: { in: terminalIds } } : {}),
      check_datetime: { gte: from, lte: to },
      emp_id: { not: null },
    },
    distinct: ['emp_id'],
    select: { emp_id: true }, // reduce payload
  });

  return employees.length;
}