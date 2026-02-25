import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Video, MessagesSquare, Users, RadioTower } from "lucide-react";

export default function DashboardHome() {
    const [stats, setStats] = useState({
        videos: 0,
        comments: 0,
        communityResults: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const { count: videosCount } = await supabase.from('episodes').select('*', { count: 'exact', head: true });
        const { count: commentsCount } = await supabase.from('comments').select('*', { count: 'exact', head: true });
        const { count: communityCount } = await supabase.from('community_posts').select('*', { count: 'exact', head: true });

        setStats({
            videos: videosCount || 0,
            comments: commentsCount || 0,
            communityResults: communityCount || 0,
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Stats */}
                <div className="p-6 bg-white rounded-xl shadow-sm border flex flex-col justify-between">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium text-slate-500">Total Videos</h3>
                        <Video className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.videos}</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border flex flex-col justify-between">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium text-slate-500">Total Comments</h3>
                        <MessagesSquare className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.comments}</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border flex flex-col justify-between">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium text-slate-500">Community Posts</h3>
                        <RadioTower className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold">{stats.communityResults}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-xl shadow-sm border dashed border-slate-300 flex flex-col justify-between opacity-70">
                    <div className="flex items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium text-slate-500">Active Users</h3>
                        <Users className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm italic">Data unavailable</p>
                </div>
            </div>
        </div>
    );
}
