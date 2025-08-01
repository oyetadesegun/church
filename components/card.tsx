type CardProps = {
  title: string;
  count: string | number;
  period: string;
  icon: React.ReactNode;
  menu?: React.ReactNode;
};

export default function InfoCard({ title, count, period, icon, menu }: CardProps) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-xl w-full">
      <div className="flex justify-between items-center mb-3 text-sm text-gray-700 font-medium">
        <span>{title}</span>
        <span>{icon}</span>
      </div>
      <div className="font-bold text-3xl flex justify-between items-center mb-3">
        <span>{count}</span>
        {menu}
      </div>
      <div className="font-light text-sm text-gray-500">{period}</div>
    </div>
  );
}
