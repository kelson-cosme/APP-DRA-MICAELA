import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CalendarDays, Pencil, Users } from "lucide-react";
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

interface EventItem {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    image_url: string;
}

interface RSVPUser {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface RSVP {
    user_id: string;
    event_id: string;
    status: string;
    created_at: string;
    profiles: RSVPUser; // Assuming relation to profiles/users table
}

export default function Events() {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [location, setLocation] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

    // RSVPs state
    const [rsvpsOpen, setRsvpsOpen] = useState(false);
    const [currentEventRsvps, setCurrentEventRsvps] = useState<RSVP[]>([]);
    const [loadingRsvps, setLoadingRsvps] = useState(false);
    const [selectedEventName, setSelectedEventName] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: eventsData, error } = await supabase.from("events").select("*").order("event_date");
        if (error) {
            console.error("Erro ao carregar eventos:", error);
        }
        setEvents(eventsData || []);
        setLoading(false);
    };

    const openCreateDialog = () => {
        setEditingEvent(null);
        setTitle("");
        setDescription("");
        setDate("");
        setLocation("");
        setImageFile(null);
        setOpen(true);
    };

    const openEditDialog = (event: EventItem) => {
        setEditingEvent(event);
        setTitle(event.title || "");
        setDescription(event.description || "");
        // Format datetime for datetime-local input
        const validDate = event.event_date ? new Date(event.event_date) : new Date();
        const formattedDate = new Date(validDate.getTime() - validDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setDate(event.event_date ? formattedDate : "");
        setLocation(event.location || "");
        setImageFile(null); // Reset file input
        setOpen(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        let imageUrl = editingEvent?.image_url || "";

        if (imageFile) {
            const fileName = `event-cover-${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from("images")
                .upload(fileName, imageFile);

            if (uploadError) {
                alert("Erro ao enviar imagem: " + uploadError.message);
                setLoading(false);
                return;
            }

            const { data } = supabase.storage.from("images").getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const payload = {
            title,
            description,
            event_date: date ? new Date(date).toISOString() : null, // Store as ISO 8601 string
            location,
            image_url: imageUrl
        };

        let result;
        if (editingEvent) {
            result = await supabase.from("events").update(payload).eq("id", editingEvent.id);
        } else {
            result = await supabase.from("events").insert(payload);
        }

        if (result.error) {
            alert("Erro ao salvar evento: " + result.error.message);
            console.error(result.error);
        } else {
            setOpen(false);
            setTitle("");
            setDescription("");
            setDate("");
            setLocation("");
            setImageFile(null);
            setEditingEvent(null);
            fetchData();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja deletar este evento?")) return;
        setLoading(true);

        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) {
            alert("Erro ao deletar evento: " + error.message);
        } else {
            fetchData();
        }
        setLoading(false);
    };

    const handleViewRsvps = async (event: EventItem) => {
        setSelectedEventName(event.title);
        setRsvpsOpen(true);
        setLoadingRsvps(true);

        const { data, error } = await supabase
            .from("event_rsvps")
            .select(`
                *,
                profiles (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .eq("event_id", event.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Erro ao puxar presenças:", error);
            alert("Erro ao puxar lista de presença.");
        } else {
            setCurrentEventRsvps(data as any || []);
        }

        setLoadingRsvps(false);
    };

    const formatEventDate = (dateString: string) => {
        if (!dateString) return "Sem data definida";
        try {
            return new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(dateString));
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" /> Criar Evento
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? "Editar Evento" : "Criar Novo Evento"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveEvent} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título do Evento</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data e Hora</Label>
                                <Input
                                    type="datetime-local"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Localização</Label>
                                <Input
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Imagem de Capa</Label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={e => setImageFile(e.target.files?.[0] || null)}
                            />
                            {editingEvent?.image_url && !imageFile && (
                                <p className="text-xs text-slate-500">
                                    Atual: <a href={editingEvent.image_url} target="_blank" rel="noopener noreferrer" className="underline">Ver Imagem</a>
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : (editingEvent ? "Salvar Alterações" : "Criar Evento")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal de Inscritos (RSVPs) */}
            <Dialog open={rsvpsOpen} onOpenChange={setRsvpsOpen}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Inscritos: {selectedEventName}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {loadingRsvps ? (
                            <div className="text-center py-10 text-slate-500">Carregando inscritos...</div>
                        ) : currentEventRsvps.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg">
                                Ninguém confirmou presença neste evento ainda.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-slate-500 mb-2">
                                    Total de confirmações: {currentEventRsvps.length}
                                </p>
                                {currentEventRsvps.map((rsvp) => (
                                    <div key={rsvp.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                                        <div className="h-10 w-10 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                                            {rsvp.profiles?.avatar_url ? (
                                                <img src={rsvp.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-200">
                                                    <Users className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">
                                                {rsvp.profiles?.full_name || "Usuário sem nome"}
                                            </p>
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(rsvp.created_at))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setRsvpsOpen(false)} variant="outline">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {loading && !events.length ? (
                <div className="text-center py-20 text-slate-500">Carregando eventos...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-20 text-slate-500 border border-dashed rounded-lg">
                    Nenhum evento adicionado ainda. Crie um novo para exibir aqui.
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <Card
                            key={event.id}
                            className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                        >
                            <div className="aspect-video w-full bg-slate-200 relative">
                                {event.image_url ? (
                                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                                        <CalendarDays className="h-10 w-10" />
                                    </div>
                                )}
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                                <p className="text-sm text-slate-500 font-medium">
                                    {formatEventDate(event.event_date)}
                                </p>
                                {event.location && (
                                    <p className="text-xs text-slate-400 truncate">
                                        📍 {event.location}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 pt-0 flex-1">
                                <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                            </CardContent>
                            <CardFooter className="p-4 pt-0 flex justify-between gap-2 items-center pb-4 border-t mt-auto">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => handleViewRsvps(event)}
                                >
                                    <Users className="h-4 w-4" /> Inscritos
                                </Button>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(event)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDelete(event.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
