'use client';

import { useEffect, useState } from 'react';
import { getAllBranchLocations } from '@/app/actions/locations.actions';
import { X } from 'lucide-react';

type Location = { id: number; area_name: string };

export default function LocationModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (areaId: number | null, areaName: string) => void;
}) {
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        const result = await getAllBranchLocations();
        setLocations(result);
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-xl">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={onClose}>
          <X />
        </button>
        <h2 className="text-lg font-bold mb-4">Select Branch</h2>
        <ul className="space-y-2">
          <li
            onClick={() => {
              onSelect(null, 'All Branches');
              onClose();
            }}
            className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            All Branches
          </li>
          {locations.map((loc) => (
            <li
              key={loc.id}
              onClick={() => {
                onSelect(loc.id, loc.area_name);
                onClose();
              }}
              className="cursor-pointer px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              {loc.area_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
