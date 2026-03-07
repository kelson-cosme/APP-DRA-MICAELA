import { useEffect, useState } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Send, Heart } from "lucide-react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Post {
    id: string;
    content_text: string;
    image_url: string;
    created_at: string;
    user_id: string;
    community_likes: [{ count: number }];
    community_comments: [{ count: number }];
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
}

interface Comment {
    id: string;
    text: string;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        avatar_url: string;
    }
}

export default function Community() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, []);

    useEffect(() => {
        if (selectedPostId) {
            fetchComments(selectedPostId);
        }
    }, [selectedPostId]);

    const fetchPosts = async () => {
        setLoading(true);
        // Try to join with profiles. If it fails (no FK), we might need fallback or just show empty.
        // Assuming the user ran the SQL script, we might have profiles.
        // However, community_posts.user_id might not have a formal FK to profiles.id unless one was added.
        // BUT, supabase-js joins usually work if the relationship exists.
        // If not, we can fetch manually.
        // Let's try select with profiles. If that fails, we'll need to do manual fetch.

        // Attempt 1: Join
        const { data, error } = await supabase
            .from("community_posts")
            .select("*, community_likes(count), community_comments(count), profiles(full_name, avatar_url)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            // Fallback: Fetch posts without profiles if relation doesn't exist
            // Then fetch profiles manually
            const { data: postsData } = await supabase
                .from("community_posts")
                .select("*, community_likes(count), community_comments(count)")
                .order("created_at", { ascending: false });

            if (postsData) {
                // Manual fetch of profiles
                const userIds = Array.from(new Set(postsData.map(p => p.user_id)));
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                const postsWithProfiles = postsData.map(p => ({
                    ...p,
                    profiles: profilesData?.find(prof => prof.id === p.user_id)
                }));
                setPosts(postsWithProfiles || []);
            }
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    };

    const fetchComments = async (postId: string) => {
        setLoadingComments(true);
        const { data, error } = await supabase
            .from("community_comments")
            .select("*, profiles(full_name, avatar_url)")
            .eq("post_id", postId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching comments", error);
            // Fallback similar to posts
            const { data: commentsData } = await supabase
                .from("community_comments")
                .select("*")
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (commentsData) {
                const userIds = Array.from(new Set(commentsData.map(c => c.user_id)));
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                const commentsWithProfiles = commentsData.map(c => ({
                    ...c,
                    profiles: profilesData?.find(prof => prof.id === c.user_id)
                }));
                setComments(commentsWithProfiles || []);
            }
        } else {
            setComments(data || []);
        }
        setLoadingComments(false);
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        const clientToUse = supabaseAdmin || supabase;

        // First delete any likes/comments if necessary due to foreign key constraints,
        // although if they have ON DELETE CASCADE they will handle themselves.
        // Assuming we need to delete comments and likes manually to be safe, like with events.
        await clientToUse.from("community_likes").delete().eq("post_id", id);
        await clientToUse.from("community_comments").delete().eq("post_id", id);

        const { error } = await clientToUse.from("community_posts").delete().eq("id", id);
        if (error) {
            console.error("Error deleting post:", error);
            alert("Error deleting post: " + error.message);
        } else {
            fetchPosts();
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPostId || !newComment.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();

        const payload: any = {
            post_id: selectedPostId,
            text: newComment,
        };

        if (user) {
            payload.user_id = user.id;
        } else {
            alert("You must be logged in to comment.");
            return;
        }

        const { error } = await supabase.from("community_comments").insert(payload);

        if (error) {
            console.error("Error sending comment:", error);
            alert("Error sending comment: " + error.message);
        } else {
            setNewComment("");
            fetchComments(selectedPostId);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Community Feed</h1>
                <Button onClick={fetchPosts} variant="outline" size="sm">Refresh</Button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-500">Loading community feed...</div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No posts found.</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <Card key={post.id} className="overflow-hidden flex flex-col">
                            <CardHeader className="flex-row items-center gap-3 p-4 pb-2 space-y-0">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={post.profiles?.avatar_url} />
                                    <AvatarFallback>{post.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">
                                        {post.profiles?.full_name || "Unknown Member"}
                                    </p>
                                    <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeletePost(post.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 flex-1">
                                <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{post.content_text}</p>
                                {post.image_url && (
                                    <div className="rounded-md overflow-hidden bg-slate-100 border aspect-video relative">
                                        <img src={post.image_url} alt="Post content" className="object-cover w-full h-full" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-slate-500 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Heart className="h-4 w-4" />
                                        <span>{post.community_likes?.[0]?.count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>{post.community_comments?.[0]?.count || 0}</span>
                                    </div>
                                </div>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedPostId(post.id)}>
                                            View Comments
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md h-[80vh] flex flex-col">
                                        <DialogHeader>
                                            <DialogTitle>Comments</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                                            {loadingComments ? (
                                                <p className="text-center text-sm text-slate-500">Loading comments...</p>
                                            ) : comments.length === 0 ? (
                                                <p className="text-center text-sm text-slate-500">No comments yet.</p>
                                            ) : (
                                                comments.map(comment => (
                                                    <div key={comment.id} className="bg-slate-50 p-3 rounded-lg text-sm flex gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={comment.profiles?.avatar_url} />
                                                            <AvatarFallback>{comment.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-semibold text-slate-700 text-xs">
                                                                    {comment.profiles?.full_name || `User ${comment.user_id.slice(0, 4)}`}
                                                                </span>
                                                                <span className="text-slate-400 text-[10px]">{new Date(comment.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-slate-800">{comment.text}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <form onSubmit={handleSendComment} className="flex gap-2 pt-2 border-t mt-auto">
                                            <Input
                                                placeholder="Write a comment..."
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button type="submit" size="icon">
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
