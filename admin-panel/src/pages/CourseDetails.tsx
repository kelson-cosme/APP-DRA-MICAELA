// admin-panel/src/pages/CourseDetails.tsx
import { useEffect, useState } from "react";
import * as tus from "tus-js-client";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronLeft, FileVideo, GripVertical, Pencil, AlertCircle, CheckCircle2 } from "lucide-react";
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
    duration: number;
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
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadStage, setUploadStage] = useState<string>("");
    const [uploadError, setUploadError] = useState<string>("");
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        if (id) fetchCourseDetails();
    }, [id]);

    const fetchCourseDetails = async () => {
        setLoading(true);
        const { data: course } = await supabase.from("contents").select("title").eq("id", id).single();
        if (course) setCourseTitle(course.title);

        const { data: mods } = await supabase.from("modules").select("*").eq("content_id", id).order("order");
        setModules(mods || []);

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
        setUploadProgress(0);
        setUploadStage("");
        setUploadError("");
        setUploadSuccess(false);
        setEpisodeDialogOpen(true);
    };

    const openEditEpisode = (episode: Episode) => {
        setEditingEpisode(episode);
        setCurrentModuleId(episode.module_id);
        setEpisodeTitle(episode.title);
        setEpisodeDesc(episode.description || "");
        setVideoFile(null);
        setThumbnailFile(null);
        setUploadProgress(0);
        setUploadStage("");
        setUploadError("");
        setUploadSuccess(false);
        setEpisodeDialogOpen(true);
    };

    const handleSaveEpisode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !currentModuleId) return;

        setLoading(true);
        setUploadError("");
        setUploadSuccess(false);

        let videoUrl = editingEpisode?.video_url || "";
        let thumbUrl = editingEpisode?.thumbnail_url || "";

        // ── Upload de Vídeo via Cloudflare Stream (TUS) ──────────────────────
        if (videoFile) {
            setUploadStage("Solicitando URL de upload segura...");
            setUploadProgress(0);

            try {
                // Chama a Edge Function via supabase.functions.invoke
                // Isso inclui automaticamente o header Authorization da sessão atual
                const { data: edgeData, error: edgeError } = await supabase.functions.invoke('cloudflare-upload', {
                    body: {
                        uploadLength: videoFile.size,
                        uploadMetadata: `name ${btoa(encodeURIComponent(videoFile.name))}`,
                    },
                });

                if (edgeError) {
                    throw new Error(`Edge Function error: ${edgeError.message}`);
                }

                if (!edgeData?.uploadUrl) {
                    throw new Error(edgeData?.error || "Edge Function não retornou uploadUrl. Verifique os logs da função.");
                }

                const { uploadUrl, mediaId } = edgeData;

                if (!mediaId) {
                    throw new Error("Cloudflare não retornou o Media ID. Verifique as credenciais.");
                }

                setUploadStage("Enviando vídeo para o Cloudflare...");

                // Upload via TUS direto para o Cloudflare (sem passar pelo Supabase)
                await new Promise<void>((resolve, reject) => {
                    const upload = new tus.Upload(videoFile, {
                        uploadUrl: uploadUrl,          // URL já definida — não usa endpoint
                        endpoint: "https://api.cloudflare.com/client/v4/accounts/x/stream", // ignorado quando uploadUrl está definido
                        chunkSize: 50 * 1024 * 1024,   // chunks de 50MB
                        retryDelays: [0, 3000, 5000, 10000, 20000],
                        onError: (error) => {
                            console.error("TUS Upload error:", error);
                            reject(new Error("Falha no upload TUS: " + error.message));
                        },
                        onProgress: (bytesUploaded, bytesTotal) => {
                            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
                            setUploadProgress(pct);
                        },
                        onSuccess: () => {
                            resolve();
                        },
                    });

                    upload.start();
                });

                // O video_url no banco armazena apenas o UID (mediaId)
                videoUrl = mediaId;
                setUploadStage("Vídeo enviado com sucesso!");
                setUploadProgress(100);

            } catch (err: any) {
                const msg = err.message || "Erro desconhecido no upload";
                console.error("Upload error:", msg);
                setUploadError(msg);
                setUploadStage("");
                setLoading(false);
                return;
            }
        }

        // ── Upload de Thumbnail no Supabase Storage ───────────────────────────
        if (thumbnailFile) {
            setUploadStage("Enviando thumbnail...");
            const fileName = `thumb-${Date.now()}-${thumbnailFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileName, thumbnailFile);

            if (uploadError) {
                setUploadError("Erro no upload da thumbnail: " + uploadError.message);
                setLoading(false);
                return;
            }

            const { data } = supabase.storage.from("images").getPublicUrl(fileName);
            thumbUrl = data.publicUrl;
        }

        // ── Salvar Episode no banco ───────────────────────────────────────────
        setUploadStage("Salvando episódio...");

        const payload = {
            content_id: id,
            module_id: currentModuleId,
            title: episodeTitle,
            description: episodeDesc,
            video_url: videoUrl,
            thumbnail_url: thumbUrl,
            ...(editingEpisode ? {} : { order: episodes.filter(e => e.module_id === currentModuleId).length + 1 }),
        };

        let result;
        if (editingEpisode) {
            result = await supabase.from("episodes").update(payload).eq("id", editingEpisode.id);
        } else {
            result = await supabase.from("episodes").insert(payload);
        }

        if (result.error) {
            setUploadError("Erro ao salvar episódio: " + result.error.message);
        } else {
            setUploadSuccess(true);
            setUploadStage("Episódio salvo com sucesso!");
            setTimeout(() => {
                setEpisodeDialogOpen(false);
                resetEpisodeForm();
                fetchCourseDetails();
            }, 1500);
        }

        setLoading(false);
    };

    const resetEpisodeForm = () => {
        setEpisodeTitle("");
        setEpisodeDesc("");
        setVideoFile(null);
        setThumbnailFile(null);
        setEditingEpisode(null);
        setUploadProgress(0);
        setUploadStage("");
        setUploadError("");
        setUploadSuccess(false);
    };

    const handleDeleteEpisode = async (epId: string) => {
        if (!confirm("Delete this episode?")) return;

        await supabase.from("likes").delete().eq("episode_id", epId);
        await supabase.from("comments").delete().eq("episode_id", epId);
        await supabase.from("user_episode_progress").delete().eq("episode_id", epId);

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

                <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingModule ? "Edit Module" : "Add New Module"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveModule} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} required />
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
                                <Button variant="ghost" size="sm" className="h-8 text-red-500" onClick={() => handleDeleteModule(module.id)}>
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
                                                        <img src={ep.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileVideo className="h-6 w-6 text-slate-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{ep.title}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1">{ep.description}</p>
                                                    {ep.video_url && (
                                                        <p className="text-xs text-green-600 font-mono mt-0.5">
                                                            CF: {ep.video_url.slice(0, 12)}...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEpisode(ep)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteEpisode(ep.id)}>
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

            {/* Episode Dialog */}
            <Dialog open={episodeDialogOpen} onOpenChange={(open) => {
                if (!loading) {
                    setEpisodeDialogOpen(open);
                    if (!open) resetEpisodeForm();
                }
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingEpisode ? "Edit Episode" : "Add Episode"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEpisode} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Episode Title</Label>
                            <Input value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={episodeDesc} onChange={e => setEpisodeDesc(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Video File</Label>
                            <Input
                                type="file"
                                accept="video/*"
                                onChange={e => setVideoFile(e.target.files?.[0] || null)}
                                required={!editingEpisode}
                                disabled={loading}
                            />
                            {editingEpisode?.video_url && !videoFile && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Vídeo atual: {editingEpisode.video_url.slice(0, 16)}... — selecione novo arquivo para substituir
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Thumbnail Image</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
                                disabled={loading}
                            />
                            {editingEpisode?.thumbnail_url && !thumbnailFile && (
                                <p className="text-xs text-slate-500">
                                    Atual: <a href={editingEpisode.thumbnail_url} target="_blank" rel="noreferrer" className="underline">Ver Imagem</a>
                                </p>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {loading && uploadStage && !uploadError && (
                            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border">
                                <p className="text-sm font-medium text-slate-700">{uploadStage}</p>
                                {uploadProgress > 0 && (
                                    <>
                                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 text-right">{uploadProgress}%</p>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Success */}
                        {uploadSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 text-green-700">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm font-medium">{uploadStage}</p>
                            </div>
                        )}

                        {/* Error */}
                        {uploadError && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700">
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Erro no upload</p>
                                    <p className="text-xs mt-1 text-red-600">{uploadError}</p>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setEpisodeDialogOpen(false); resetEpisodeForm(); }}
                                disabled={loading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Save Episode"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}