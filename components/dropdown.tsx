'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { MoreVertical } from 'lucide-react';

type DropdownProps = {
  params: { sn: string; name: string }[];
};

export default function Dropdown({ params }: DropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function handleSelect(sn: string | null) {
    const url = sn ? `${pathname}?location=${sn}` : pathname;
    router.push(url);
    setOpen(false);
  }

  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen((prev) => !prev)}>
        <MoreVertical className="cursor-pointer text-gray-600" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border shadow-lg rounded z-50">
          <button
            onClick={() => handleSelect(null)}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            All Branches
          </button>
          {params.map((param) => (
            <button
              key={param.sn}
              onClick={() => handleSelect(param.sn)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              {param.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
