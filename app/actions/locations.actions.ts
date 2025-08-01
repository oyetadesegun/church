'use server';

import { prisma } from "@/lib/prisma";

export async function getAllBranchLocations() {
  return await prisma.personnel_area.findMany({
    select: {
      id: true,
      area_name: true,
    },
    orderBy: {
      area_name: 'asc',
    },
  });
}
