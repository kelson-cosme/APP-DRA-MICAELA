import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronLeft, FileVideo, GripVertical, Pencil } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Module {
    id: string;
    title: string;
    order: number;
}

interface Episode {
    id: string;
    title: string;
    description: string;
    video_url: string;
    thumbnail_url: string;
    module_id: string;
    order: number;
    duration: number; // in seconds, optional
}

export default function CourseDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [courseTitle, setCourseTitle] = useState("");

    const [modules, setModules] = useState<Module[]>([]);
    const [episodes, setEpisodes] = useState<Episode[]>([]);

    // Module Dialog
    const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
    const [moduleTitle, setModuleTitle] = useState("");
    const [editingModule, setEditingModule] = useState<Module | null>(null);

    // Episode Dialog
    const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [episodeTitle, setEpisodeTitle] = useState("");
    const [episodeDesc, setEpisodeDesc] = useState("");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);


    useEffect(() => {
        if (id) fetchCourseDetails();
    }, [id]);

    const fetchCourseDetails = async () => {
        setLoading(true);
        // Fetch Course Info
        const { data: course } = await supabase.from("contents").select("title").eq("id", id).single();
        if (course) setCourseTitle(course.title);

        // Fetch Modules
        const { data: mods } = await supabase.from("modules").select("*").eq("content_id", id).order("order");
        setModules(mods || []);

        // Fetch Episodes (for this content) -- wait, episodes are linked to contents directly in current schema? 
        // No, current schema has `content_id`. The new schema adds `module_id`.
        // We should fetch all episodes for this content, then group by module in UI.
        const { data: eps } = await supabase.from("episodes").select("*").eq("content_id", id).order("order");
        setEpisodes(eps || []);

        setLoading(false);
    };

    const openCreateModule = () => {
        setEditingModule(null);
        setModuleTitle("");
        setModuleDialogOpen(true);
    };

    const openEditModule = (module: Module) => {
        setEditingModule(module);
        setModuleTitle(module.title);
        setModuleDialogOpen(true);
    };

    const handleSaveModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        let error;
        if (editingModule) {
            const { error: err } = await supabase.from("modules").update({ title: moduleTitle }).eq("id", editingModule.id);
            error = err;
        } else {
            const { error: err } = await supabase.from("modules").insert({
                content_id: id,
                title: moduleTitle,
                order: modules.length + 1
            });
            error = err;
        }

        if (error) {
            alert("Error saving module: " + error.message);
        } else {
            setModuleDialogOpen(false);
            setModuleTitle("");
            setEditingModule(null);
            fetchCourseDetails();
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm("Delete this module? Episodes will be unassigned or deleted.")) return;
        const { error } = await supabase.from("modules").delete().eq("id", moduleId);
        if (error) {
            alert("Error deleting module: " + error.message);
        } else {
            fetchCourseDetails();
        }
    };

    const openCreateEpisode = (moduleId: string) => {
        setEditingEpisode(null);
        setCurrentModuleId(moduleId);
        setEpisodeTitle("");
        setEpisodeDesc("");
        setVideoFile(null);
        setThumbnailFile(null);
        setEpisodeDialogOpen(true);
    };

    const openEditEpisode = (episode: Episode) => {
        setEditingEpisode(episode);
        setCurrentModuleId(episode.module_id);
        setEpisodeTitle(episode.title);
        setEpisodeDesc(episode.description || "");
        setVideoFile(null);
        setThumbnailFile(null);
        setEpisodeDialogOpen(true);
    };

    const handleSaveEpisode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !currentModuleId) return;
        setLoading(true);

        let videoUrl = editingEpisode?.video_url || "";
        let thumbUrl = editingEpisode?.thumbnail_url || "";

        // Upload Video
        if (videoFile) {
            const fileExt = videoFile.name.split('.').pop();
            const fileName = `video-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from("videos")
                .upload(fileName, videoFile);

            if (uploadError) {
                alert("Error uploading video: " + uploadError.message);
                setLoading(false);
                return;
            }

            const { data } = supabase.storage.from("videos").getPublicUrl(fileName);
            videoUrl = data.publicUrl;
        }

        // Upload Thumbnail
        if (thumbnailFile) {
            const fileName = `thumb-${Date.now()}-${thumbnailFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileName, thumbnailFile);

            if (uploadError) {
                alert("Error uploading thumbnail: " + uploadError.message);
            } else {
                const { data } = supabase.storage.from("images").getPublicUrl(fileName);
                thumbUrl = data.publicUrl;
            }
        }

        const payload = {
            content_id: id,
            module_id: currentModuleId,
            title: episodeTitle,
            description: episodeDesc,
            video_url: videoUrl,
            thumbnail_url: thumbUrl,
            // Only set order on create to avoid resetting it on edit, logic could be improved but simple for now
            ...(editingEpisode ? {} : { order: episodes.filter(e => e.module_id === currentModuleId).length + 1 })
        };

        let result;
        if (editingEpisode) {
            result = await supabase.from("episodes").update(payload).eq("id", editingEpisode.id);
        } else {
            result = await supabase.from("episodes").insert(payload);
        }

        if (result.error) {
            alert("Error saving episode: " + result.error.message);
        } else {
            setEpisodeDialogOpen(false);
            setEpisodeTitle("");
            setEpisodeDesc("");
            setVideoFile(null);
            setThumbnailFile(null);
            setEditingEpisode(null);
            fetchCourseDetails();
        }
        setLoading(false);
    };

    const handleDeleteEpisode = async (epId: string) => {
        if (!confirm("Delete this episode?")) return;
        const { error } = await supabase.from("episodes").delete().eq("id", epId);
        if (error) {
            alert("Error deleting episode: " + error.message);
        } else {
            fetchCourseDetails();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">{courseTitle || "Course Details"}</h1>
            </div>

            <div className="flex justify-end">
                <Button className="gap-2" variant="outline" onClick={openCreateModule}>
                    <Plus className="h-4 w-4" /> Add Module
                </Button>

                {/* Module Dialog */}
                <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingModule ? "Edit Module" : "Add New Module"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveModule} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={moduleTitle}
                                    onChange={e => setModuleTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Module</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
                {modules.length === 0 && (
                    <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-dashed">
                        No modules yet. Create one to add episodes.
                    </div>
                )}

                {modules.map(module => (
                    <Card key={module.id} className="overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b py-3 flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-slate-400 cursor-move" />
                                <CardTitle className="text-lg">{module.title}</CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditModule(module)}>
                                    <Pencil className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-red-500"
                                    onClick={() => handleDeleteModule(module.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" className="gap-2" onClick={() => openCreateEpisode(module.id)}>
                                    <Plus className="h-3 w-3" /> Add Episode
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {episodes.filter(e => e.module_id === module.id).length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-400">
                                    No episodes in this module.
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {episodes.filter(e => e.module_id === module.id).map(ep => (
                                        <div key={ep.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-20 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                                    {ep.thumbnail_url ? (
                                                        <img src={ep.thumbnail_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileVideo className="h-6 w-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{ep.title}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{ep.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEditEpisode(ep)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500"
                                                    onClick={() => handleDeleteEpisode(ep.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Unassigned Episodes Section */}
            {episodes.filter(e => !e.module_id).length > 0 && (
                <Card className="overflow-hidden border-orange-200">
                    <CardHeader className="bg-orange-50 border-b border-orange-100 py-3 flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg text-orange-800">Unassigned Episodes</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Create Episode in 'null' module? Or maybe force user to create module first? 
                                 For now, just listing them. Creating new episodes usually requires a module context in this UI.
                                 Let's allow adding to 'no module' by passing null or empty string if supported by logic.
                                 Actually openCreateEpisode expects a string ID. Let's just allow Management of existing ones.
                             */}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-orange-100">
                            {episodes.filter(e => !e.module_id).map(ep => (
                                <div key={ep.id} className="p-4 flex items-center justify-between hover:bg-orange-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-20 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                            {ep.thumbnail_url ? (
                                                <img src={ep.thumbnail_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <FileVideo className="h-6 w-6 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{ep.title}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{ep.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEditEpisode(ep)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => handleDeleteEpisode(ep.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reusable Episode Dialog */}
            <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEpisode ? "Edit Episode" : "Add Episode"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEpisode} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Episode Title</Label>
                            <Input
                                value={episodeTitle}
                                onChange={e => setEpisodeTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={episodeDesc}
                                onChange={e => setEpisodeDesc(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Video File</Label>
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="file"
                                    accept="video/*"
                                    onChange={e => setVideoFile(e.target.files?.[0] || null)}
                                    // Required only on create
                                    required={!editingEpisode}
                                />
                                {editingEpisode?.video_url && !videoFile && (
                                    <p className="text-xs text-green-600">Current video loaded. Upload new file to replace.</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Thumbnail Image</Label>
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
                                />
                                {editingEpisode?.thumbnail_url && !thumbnailFile && (
                                    <p className="text-xs text-slate-500">Current: <a href={editingEpisode.thumbnail_url} target="_blank" className="underline">View Image</a></p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Uploading..." : "Save Episode"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
