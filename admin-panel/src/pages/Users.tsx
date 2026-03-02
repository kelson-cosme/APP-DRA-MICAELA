import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    created_at?: string;
}

export default function Users() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Profile[]>([]);

    // User creation/edit form state
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

    // Fetch existing profiles to list them
    const fetchProfiles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("full_name", { ascending: true });

        if (error) {
            console.error("Error fetching profiles:", error);
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    };

    // Load profiles on mount
    useEffect(() => {
        fetchProfiles();
    }, []);

    const openCreateDialog = () => {
        setEditingProfile(null);
        setFormData({ email: "", password: "", full_name: "" });
        setAvatarFile(null);
        setOpen(true);
    };

    const openEditDialog = (profile: Profile) => {
        setEditingProfile(profile);
        setFormData({
            email: profile.email || "",
            password: "", // Leave blank for edit (we don't update auth password here)
            full_name: profile.full_name || ""
        });
        setAvatarFile(null);
        setOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (editingProfile) {
            // EDIT EXISTING PROFILE
            let avatarUrl = editingProfile.avatar_url || "";

            if (avatarFile) {
                const fileName = `avatar-${editingProfile.id}-${Date.now()}`;
                const { error: uploadError } = await supabase.storage
                    .from("images")
                    .upload(fileName, avatarFile);

                if (!uploadError) {
                    const { data } = supabase.storage.from("images").getPublicUrl(fileName);
                    avatarUrl = data.publicUrl;
                }
            }

            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    username: formData.full_name,
                    avatar_url: avatarUrl || null,
                })
                .eq("id", editingProfile.id);

            if (updateError) {
                alert("Erro ao atualizar perfil: " + updateError.message);
            } else {
                alert("Usuário atualizado com sucesso!");
                setOpen(false);
                fetchProfiles();
            }
        } else {
            // CREATE NEW USER
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
            });

            if (authError) {
                console.error("Error creating user auth:", authError);
                alert("Error creating user: " + authError.message);
                setLoading(false);
                return;
            }

            const userId = authData.user?.id;

            if (userId) {
                let avatarUrl = "";

                if (avatarFile) {
                    const fileName = `avatar-${userId}-${Date.now()}`;
                    const { error: uploadError } = await supabase.storage
                        .from("images")
                        .upload(fileName, avatarFile);

                    if (!uploadError) {
                        const { data } = supabase.storage.from("images").getPublicUrl(fileName);
                        avatarUrl = data.publicUrl;
                    }
                }

                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: formData.full_name,
                        username: formData.full_name,
                        avatar_url: avatarUrl || null,
                    })
                    .eq("id", userId);

                if (profileError) {
                    alert("Auth criado, mas erro ao salvar perfil: " + profileError.message);
                }
            }

            alert("Usuário criado com sucesso!");
            setFormData({ email: "", password: "", full_name: "" });
            setAvatarFile(null);
            setOpen(false);
            fetchProfiles();
        }

        setLoading(false);
    };

    const handleDeleteUser = async (profileId: string) => {
        if (!confirm("Tem certeza que deseja excluir completamente este usuário (Perfil e Auth)?")) return;

        setLoading(true);

        const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
            alert("Atenção: A chave VITE_SUPABASE_SERVICE_ROLE_KEY não foi encontrada no seu arquivo .env. Não é possível excluir o login Auth sem ela.");
            setLoading(false);
            return;
        }

        // Primeiro apagamos o auth.users, que via de regra vai apagar o profile junto (se houver restrict CASCADE no supabase)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(profileId);

        if (authError) {
            alert("Erro ao deletar autenticação: " + authError.message);
        } else {
            // Se não houver CASCADE automático para Profiles na deleção do Auth, a gente força a exclusão aqui:
            await supabase.from("profiles").delete().eq("id", profileId);
            alert("Usuário excluído completamente do sistema!");
            fetchProfiles();
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                <Dialog open={open} onOpenChange={setOpen}>
                    <Button onClick={openCreateDialog} className="gap-2">
                        <Plus className="h-4 w-4" /> Registrar Usuário
                    </Button>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProfile ? "Editar Usuário" : "Registrar Novo Usuário"}</DialogTitle>
                            <DialogDescription>
                                {editingProfile ? "Atualize as informações do perfil." : "Crie uma nova conta de usuário."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <Input
                                    id="full_name"
                                    type="text"
                                    placeholder="João da Silva"
                                    value={formData.full_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, full_name: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            {!editingProfile && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="user@example.com"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Senha</Label>
                                        <Input
                                            id="password"
                                            type="text" // changed from password to let admin see what they type for initial setup
                                            placeholder="Senha inicial"
                                            value={formData.password}
                                            onChange={(e) =>
                                                setFormData({ ...formData, password: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="avatar">Foto de Perfil</Label>
                                <Input
                                    id="avatar"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setAvatarFile(e.target.files?.[0] || null)
                                    }
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Salvando..." : (editingProfile ? "Salvar Alterações" : "Criar Usuário")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Usuários Cadastrados</h2>
                    <p className="text-sm text-slate-500">
                        Lista de perfis cadastrados no sistema. (Nota: E-mails não são exibidos por padrão pelo Supabase na tabela de perfis públicos).
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-500">Carregando usuários...</div>
                ) : profiles.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg">
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {profiles.map((profile) => (
                            <Card key={profile.id} className="overflow-hidden">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="h-16 w-16 bg-slate-100 rounded-full overflow-hidden shrink-0 border">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-200 text-2xl font-semibold">
                                                {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900 truncate">
                                            {profile.full_name || "Sem nome"}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate" title={profile.id}>
                                            ID: {profile.id.substring(0, 8)}...
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(profile)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteUser(profile.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
