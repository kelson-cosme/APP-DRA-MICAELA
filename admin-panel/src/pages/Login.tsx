import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            navigate("/");
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen w-full">
            {/* Left side - Image */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative">
                <img
                    src="https://brilhar.dramicaelavargas.com.br/wp-content/plugins/lp-dra-micaela/dist/assets/dra-BdY02ihm.webp"
                    alt="Medical Office"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <div className="relative z-10 p-12 flex flex-col justify-end h-full text-white">
                    <h1 className="text-4xl font-bold mb-4">Dra. Micaela Vargas</h1>
                    <p className="text-lg text-slate-300">Admin Panel & Constant Learning Platform</p>
                </div>
            </div>

            {/* Right side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-2 text-center">
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-slate-500">Enter your credentials to access the admin panel</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-slate-500">
                        <p>This area is restricted to administrators.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
