import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookOpen, Pencil, FolderPlus } from "lucide-react";
import {
    Card,
    CardContent,
    CardFooter,
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
import { useNavigate } from "react-router-dom";

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    category_id: string;
}

interface Category {
    id: string;
    name: string;
}

export default function Courses() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [notifyUsers, setNotifyUsers] = useState(false);

    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: coursesData } = await supabase.from("contents").select("*").order("title");
        const { data: catsData } = await supabase.from("categories").select("*").order("name");

        setCourses(coursesData || []);
        setCategories(catsData || []);
        if (catsData && catsData.length > 0 && !categoryId) {
            setCategoryId(catsData[0].id);
        }
        setLoading(false);
    };

    const openCreateDialog = () => {
        setEditingCourse(null);
        setTitle("");
        setDescription("");
        setCategoryId(categories[0]?.id || "");
        setImageFile(null);
        setNotifyUsers(false);
        setOpen(true);
    };

    const openEditDialog = (course: Course) => {
        setEditingCourse(course);
        setTitle(course.title);
        setDescription(course.description || "");
        setCategoryId(course.category_id);
        setImageFile(null); // Reset file input, user might not want to change it
        setNotifyUsers(false);
        setOpen(true);
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!categoryId) {
            alert("Por favor, selecione ou crie uma categoria para o curso.");
            return;
        }

        setLoading(true);

        let thumbnailUrl = editingCourse?.thumbnail_url || "";

        if (imageFile) {
            const sanitizedName = sanitizeFilename(imageFile.name);
            const fileName = `course-cover-${Date.now()}-${sanitizedName}`;
            const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileName, imageFile);

            if (uploadError) {
                alert("Error uploading image: " + uploadError.message);
                setLoading(false);
                return;
            }

            const { data } = supabase.storage.from("images").getPublicUrl(fileName);
            thumbnailUrl = data.publicUrl;
        }

        const payload = {
            title,
            description,
            category_id: categoryId,
            thumbnail_url: thumbnailUrl
        };

        let result;
        if (editingCourse) {
            // Update
            result = await supabase.from("contents").update(payload).eq("id", editingCourse.id);
        } else {
            // Insert
            result = await supabase.from("contents").insert(payload);
        }

        if (result.error) {
            alert("Error saving course: " + result.error.message);
        } else {
            // Se for um novo curso e o usuário marcou para notificar
            if (!editingCourse && notifyUsers) {
                try {
                    await supabase.functions.invoke('send-broadcast-notification', {
                        body: { 
                            title: "Novo Curso Disponível! 📚", 
                            body: `Confira o novo curso: ${title}`,
                            data: { type: 'new_content', screen: 'Courses' }
                        }
                    });
                } catch (err) {
                    console.error("Falha ao enviar notificação automática:", err);
                }
            }

            setOpen(false);
            setTitle("");
            setDescription("");
            setImageFile(null);
            setEditingCourse(null);
            fetchData();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this course and all its modules/episodes?")) return;
        setLoading(true);

        // 1. Get all episode IDs
        const { data: episodes } = await supabase.from("episodes").select("id").eq("content_id", id);
        const episodeIds = episodes?.map(e => e.id) || [];

        // 2. Delete Likes, Comments, and Progress for these episodes
        if (episodeIds.length > 0) {
            await supabase.from("likes").delete().in("episode_id", episodeIds);
            await supabase.from("comments").delete().in("episode_id", episodeIds);
            await supabase.from("user_episode_progress").delete().in("episode_id", episodeIds);
        }

        // 3. Delete Episodes linked to this content
        const { error: epError } = await supabase.from("episodes").delete().eq("content_id", id);
        if (epError) console.error("Error deleting episodes:", epError);

        // 4. Delete Modules linked to this content
        const { error: modError } = await supabase.from("modules").delete().eq("content_id", id);
        if (modError) console.error("Error deleting modules:", modError);

        // 5. Delete Content
        const { error } = await supabase.from("contents").delete().eq("id", id);
        if (error) {
            alert("Error deleting course: " + error.message);
        } else {
            fetchData();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Course
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveCourse} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Course Title</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Category</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={async () => {
                                    const name = window.prompt("Nome da nova categoria:");
                                    if (!name?.trim()) return;
                                    setLoading(true);
                                    const { data, error } = await supabase.from("categories").insert({ name: name.trim() }).select().single();
                                    if (error) {
                                        alert("Erro ao criar categoria: " + error.message);
                                    } else if (data) {
                                        setCategories([...categories, data]);
                                        setCategoryId(data.id);
                                    }
                                    setLoading(false);
                                }} className="h-6 px-2 text-xs">
                                    <FolderPlus className="w-3 h-3 mr-1" /> Nova Categoria
                                </Button>
                            </div>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Selecione uma categoria</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Cover Image</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={e => setImageFile(e.target.files?.[0] || null)}
                            />
                            {editingCourse?.thumbnail_url && !imageFile && (
                                <p className="text-xs text-slate-500">Current: <a href={editingCourse.thumbnail_url} target="_blank" className="underline">View Image</a></p>
                            )}
                        </div>
                        {!editingCourse && (
                            <div className="flex items-center space-x-2 py-2">
                                <input 
                                    type="checkbox" 
                                    id="notify" 
                                    checked={notifyUsers} 
                                    onChange={(e) => setNotifyUsers(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <Label htmlFor="notify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                    Notificar todos os usuários sobre este novo curso
                                </Label>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : (editingCourse ? "Save Changes" : "Create Course")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {loading && !courses.length ? (
                <div className="text-center py-20 text-slate-500">Loading courses...</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                    {courses.map((course) => (
                        <Card
                            key={course.id}
                            className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer h-full border-slate-200"
                            onClick={() => navigate(`/courses/${course.id}`)}
                        >
                            <div className="aspect-video w-full bg-slate-100 relative flex-shrink-0 border-b overflow-hidden group">
                                {course.thumbnail_url ? (
                                    <img 
                                        src={course.thumbnail_url} 
                                        alt={course.title} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                        <BookOpen className="h-12 w-12" />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 p-4 pb-0">
                                <CardHeader className="p-0 mb-2">
                                    <CardTitle className="text-lg font-bold line-clamp-1 h-7">{course.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 flex-1">
                                    <p className="text-sm text-slate-500 line-clamp-2 h-10 italic">
                                        {course.description || "Sem descrição disponível"}
                                    </p>
                                </CardContent>
                            </div>
                            <CardFooter className="p-4 flex justify-between items-center mt-auto">
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" className="h-8">
                                        Editar Conteúdo
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEditDialog(course);
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(course.id);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
