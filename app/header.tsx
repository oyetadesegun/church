import { Download, LogOut, Users } from "lucide-react";

export default function Header(){
    return <div className="flex w-screen border-b border-gray-200 h-[100px] justify-between p-3 items-center bg-white">
<div className="flex flex-col">
    <div className="font-bold text-3xl ">Time Clock Admin</div>
    <div className="hidden md:block">Employee attendance management system</div>
</div>
<div className="flex gap-3">
    <div className="border-gray-200 border rounded-full p-2 gap-2  text-sm items-center hidden md:flex">
        <Users/>
        Admin Access</div>
    <div className="border-gray-200 border rounded-xl gap-2 p-2 flex text-sm items-center">
        <Download/>
        Logout</div>
</div>
    </div>
}