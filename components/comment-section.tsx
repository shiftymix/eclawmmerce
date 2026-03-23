"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface CommentSectionProps {
  toolId: string;
}

export default function CommentSection({ toolId }: CommentSectionProps) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolId]);

  const loadComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("tool_id", toolId)
      .order("created_at", { ascending: false });

    if (data) setComments(data);
    setLoading(false);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      tool_id: toolId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      loadComments();
    }
    setPosting(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-pixel-sm text-text-primary">COMMENTS</h3>

      {/* New comment form */}
      {user ? (
        <form onSubmit={handlePost} className="flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your experience with this tool..."
            className="bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
              focus:outline-none focus:border-crab-red resize-none h-20"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            className="btn-primary text-xs self-end disabled:opacity-50"
          >
            {posting ? <span className="spinner" /> : "POST COMMENT"}
          </button>
        </form>
      ) : (
        <p className="text-xs font-mono text-text-secondary pixel-border bg-surface p-3">
          Sign in to leave a comment.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <span className="spinner" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs font-mono text-text-secondary py-4">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-surface pixel-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-text-secondary">
                  {comment.user_id.slice(0, 8)}...
                </span>
                <span className="text-[10px] font-mono text-text-secondary">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-mono text-text-primary">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
