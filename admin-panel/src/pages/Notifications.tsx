import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Notifications() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            // Chamada para a Edge Function de broadcast
            const { data, error } = await supabase.functions.invoke('send-broadcast-notification', {
                body: { title, body }
            });

            if (error) throw error;

            setStatus({ type: 'success', message: `Notificação enviada com sucesso para ${data.totalSent} dispositivos!` });
            setTitle("");
            setBody("");
        } catch (err: any) {
            console.error("Erro ao enviar broadcast:", err);
            setStatus({ type: 'error', message: "Falha ao enviar notificação: " + (err.message || "Erro desconhecido") });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-slate-800" />
                            Enviar Mensagem Global
                        </CardTitle>
                        <CardDescription>
                            Esta mensagem será enviada instantaneamente para TODOS os usuários que possuem o aplicativo instalado e permissões de notificação ativas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendBroadcast} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título da Notificação</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Frase do Dia ✨"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="body">Mensagem</Label>
                                <Textarea
                                    id="body"
                                    placeholder="Digite sua mensagem motivacional ou aviso aqui..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={5}
                                    required
                                />
                            </div>

                            {status && (
                                <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
                                    status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                    {status.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    {status.message}
                                </div>
                            )}

                            <Button type="submit" className="w-full gap-2" disabled={loading}>
                                <Send className="h-4 w-4" />
                                {loading ? "Enviando..." : "Disparar para Todos"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-slate-600">Dicas e Boas Práticas</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-500 space-y-4">
                        <p>
                            • <strong>Seja Breve:</strong> Notificações curtas têm maior taxa de clique. O ideal é que o corpo não ultrapasse 150 caracteres.
                        </p>
                        <p>
                            • <strong>Horário Ideal:</strong> Evite enviar notificações tarde da noite ou muito cedo pela manhã, a menos que seja algo urgente.
                        </p>
                        <p>
                            • <strong>Emoji:</strong> Use emojis comedidamente para chamar a atenção, mas sem exagerar.
                        </p>
                        <p>
                            • <strong>Frequência:</strong> Enviar muitas notificações diárias pode fazer com que os usuários desativem as permissões do app.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
