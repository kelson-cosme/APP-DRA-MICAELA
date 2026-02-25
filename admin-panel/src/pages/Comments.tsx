import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface Comment {
    id: string;
    text: string;
    created_at: string;
    episode_id: string;
    user_id: string;
    parent_id?: string | null;
    episodes?: {
        title: string;
    };
    profiles?: {
        full_name: string;
        avatar_url: string;
    };
    replies?: Comment[];
}


// Helper component for rendering rows recursively
const CommentRow = ({
    comment,
    level = 0,
    onReply,
    onDelete
}: {
    comment: Comment,
    level?: number,
    onReply: (comment: Comment) => void,
    onDelete: (id: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
        <>
            <TableRow key={comment.id} className={level > 0 ? "bg-slate-50" : ""}>
                <TableCell style={{ paddingLeft: `${level * 2.5 + 1}rem` }}>
                    <div className="flex items-center gap-2">
                        {level > 0 && <div className="text-slate-300 mr-1">↳</div>}

                        {/* Expand/Collapse Toggle */}
                        {hasReplies && level === 0 && (
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="mr-1 p-0.5 hover:bg-slate-200 rounded text-slate-500"
                            >
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        )}
                        {!hasReplies && level === 0 && <span className="w-5 mr-1" />}

                        <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.profiles?.avatar_url} />
                            <AvatarFallback>{comment.profiles?.full_name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium text-sm">
                                {comment.profiles?.full_name || "Unknown"}
                                {level > 0 && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Reply</span>}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {comment.user_id.slice(0, 6)}...
                            </span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="max-w-xs truncate" title={comment.text}>
                    {comment.text}
                </TableCell>
                <TableCell className="text-slate-500 font-medium">
                    {comment.episodes?.title || "Unknown Video"}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {/* Reply only allowed on parent comments (level 0) */}
                        {level === 0 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onReply(comment)}
                                title="Reply"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onDelete(comment.id)}
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {isOpen && comment.replies && comment.replies.map(reply => (
                <CommentRow
                    key={reply.id}
                    comment={reply}
                    level={level + 1}
                    onReply={onReply}
                    onDelete={onDelete}
                />
            ))}
        </>
    );
};

export default function Comments() {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

    useEffect(() => {
        fetchComments();
    }, []);

    const fetchComments = async () => {
        setLoading(true);
        // Attempt fetch with profiles join
        const { data, error } = await supabase
            .from("comments")
            .select("*, episodes(title), profiles(full_name, avatar_url)")
            .order("created_at", { ascending: true }); // Ascending to keep threads chronological usually

        let allComments: Comment[] = [];

        if (error) {
            console.error("Error fetching comments:", error);
            // Fallback: Fetch comments then profiles manually
            const { data: commentsData } = await supabase
                .from("comments")
                .select("*, episodes(title)")
                .order("created_at", { ascending: true });

            if (commentsData) {
                const userIds = Array.from(new Set(commentsData.map(c => c.user_id)));
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                const commentsWithProfiles = commentsData.map(c => ({
                    ...c,
                    profiles: profilesData?.find(p => p.id === c.user_id)
                }));
                allComments = commentsWithProfiles as Comment[] || [];
            }
        } else {
            allComments = data as Comment[] || [];
        }

        // Organize into threads
        const threads: Comment[] = [];
        const commentMap = new Map<string, Comment>();

        // Init map
        allComments.forEach(c => {
            c.replies = [];
            commentMap.set(c.id, c);
        });

        // Build tree
        allComments.forEach(c => {
            if (c.parent_id) {
                const parent = commentMap.get(c.parent_id);
                if (parent) {
                    parent.replies?.push(c);
                }
            } else {
                threads.push(c);
            }
        });

        // Sort threads by date desc (newest threads first)
        threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setComments(threads);
        setLoading(false);
    };
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;

        const { error } = await supabase.from("comments").delete().eq("id", id);
        if (error) {
            console.error("Error deleting comment:", error);
            alert("Error deleting comment: " + error.message);
        } else {
            fetchComments();
        }
    };

    const handleReply = async () => {
        if (!replyText.trim() || !selectedComment) return;

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert("You must be logged in to reply.");
            return;
        }

        console.log("Replying to:", selectedComment);
        console.log("Payload:", {
            episode_id: selectedComment.episode_id,
            text: replyText,
            user_id: user.id,
            parent_id: selectedComment.id
        });

        const { error } = await supabase.from("comments").insert({
            episode_id: selectedComment.episode_id,
            text: replyText,
            user_id: user.id,
            parent_id: selectedComment.id // Link reply to parent
        });

        if (error) {
            console.error("Error replying:", error);
            alert("Error replying: " + error.message);
        } else {
            setReplyText("");
            setSelectedComment(null);
            fetchComments();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Video Comments</h1>
                <Button onClick={fetchComments} variant="outline" size="sm">Refresh</Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Video</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading comments...
                                </TableCell>
                            </TableRow>
                        ) : comments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No comments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            comments.map((comment) => (
                                <CommentRow
                                    key={comment.id}
                                    comment={comment}
                                    onReply={setSelectedComment}
                                    onDelete={handleDelete}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Global Reply Dialog */}
            <Dialog open={!!selectedComment} onOpenChange={(open) => !open && setSelectedComment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reply to Comment</DialogTitle>
                        <DialogDescription>
                            Replying to {selectedComment?.profiles?.full_name || "User"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg text-sm border">
                            <p className="font-semibold text-slate-700 mb-1">
                                {selectedComment?.profiles?.full_name}:
                            </p>
                            <p className="text-slate-600 italic">"{selectedComment?.text}"</p>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Write your reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                            />
                            <Button onClick={handleReply} size="icon">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
