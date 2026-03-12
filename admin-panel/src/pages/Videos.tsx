import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Video {
    id: string;
    title: string;
    description: string;
    video_url: string;
    created_at: string;
}

export default function Videos() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        video_url: "",
    });
    const [notifyUsers, setNotifyUsers] = useState(false);

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("episodes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching videos:", error);
        } else {
            setVideos(data || []);
        }
        setLoading(false);
    };

    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from("episodes").insert([formData]);

        if (error) {
            console.error("Error adding video:", error);
            alert("Error adding video: " + error.message);
        } else {
            // Enviar notificação se marcado
            if (notifyUsers) {
                try {
                    await supabase.functions.invoke('send-broadcast-notification', {
                        body: { 
                            title: "Novo Vídeo Disponível! 🎥", 
                            body: `Acabamos de postar: ${formData.title}`,
                            data: { type: 'new_video', screen: 'Videos' }
                        }
                    });
                } catch (err) {
                    console.error("Falha ao enviar notificação automática:", err);
                }
            }
            setFormData({ title: "", description: "", video_url: "" });
            setNotifyUsers(false);
            setOpen(false);
            fetchVideos();
        }
        setLoading(false);
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm("Are you sure you want to delete this video?")) return;

        const { error } = await supabase.from("episodes").delete().eq("id", id);
        if (error) {
            console.error("Error deleting video:", error);
            alert("Error deleting video: " + error.message);
        } else {
            fetchVideos();
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Video
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Video</DialogTitle>
                            <DialogDescription>
                                Post a new video to the platform.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddVideo} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="Video Title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Video Description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="video_url">Video URL</Label>
                                <Input
                                    id="video_url"
                                    placeholder="https://example.com/video.mp4"
                                    value={formData.video_url}
                                    onChange={(e) =>
                                        setFormData({ ...formData, video_url: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2 py-2">
                                <input 
                                    type="checkbox" 
                                    id="notifyVideo" 
                                    checked={notifyUsers} 
                                    onChange={(e) => setNotifyUsers(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="notifyVideo" className="text-sm font-medium leading-none cursor-pointer">
                                    Notificar todos os usuários sobre este vídeo
                                </Label>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Adding..." : "Add Video"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {videos.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No videos found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            videos.map((video) => (
                                <TableRow key={video.id}>
                                    <TableCell className="font-medium">{video.title}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {video.description}
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-blue-500 underline">
                                        <a href={video.video_url} target="_blank" rel="noreferrer">
                                            View
                                        </a>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteVideo(video.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
