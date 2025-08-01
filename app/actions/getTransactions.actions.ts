'use server';

import { prisma } from '@/lib/prisma';

export type TransactionRow = {
  id: number;
  timestamp: Date | null;
  employee_name: string;
  branch: string;
};

export type TransactionFilters = {
  sn?: string | null;
  from?: Date;
  to?: Date;
  sortField?: 'check_datetime' | 'id';
  sortOrder?: 'asc' | 'desc';
};

export async function getTransactionsByFilters(filters: TransactionFilters): Promise<TransactionRow[]> {
  const {
    sn,
    from,
    to,
    sortField = 'check_datetime',
    sortOrder = 'desc',
  } = filters;

  // Build the where clause
  const where: any = {};
  if (sn) where.terminal_sn = sn;
  if (from || to) {
    where.check_datetime = {};
    if (from) where.check_datetime.gte = from;
    if (to)   where.check_datetime.lte = to;
  }

  // Fetch with dynamic order
  const rows = await prisma.ep_eptransaction.findMany({
    where,
    orderBy: { [sortField]: sortOrder },
    select: {
      id: true,
      check_datetime: true,
      personnel_employee: {
        select: { first_name: true, last_name: true },
      },
      iclock_terminal: {
        select: {
          personnel_area: {
            select: { area_name: true },
          },
        },
      },
    },
  });

  return rows.map(r => ({
    id: r.id,
    timestamp: r.check_datetime,
    employee_name: r.personnel_employee
      ? `${r.personnel_employee.first_name} ${r.personnel_employee.last_name}`
      : 'Unknown',
    branch: r.iclock_terminal?.personnel_area?.area_name || 'Unknown',
  }));
}
