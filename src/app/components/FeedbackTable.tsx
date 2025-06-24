"use client";
import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { Eye } from "lucide-react";

interface Feedback {
  id: string;
  userId: string;
  feedback: string;
  createdAt?: Timestamp;
  email?: string;
}

export default function FeedbackTable() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    async function fetchFeedbacks() {
      setLoading(true);
      setError("");
      try {
        const { collection, getDocs, doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const feedbackCol = collection(db, "feedback");
        const feedbackSnap = await getDocs(feedbackCol);
        const feedbackData: Feedback[] = await Promise.all(
          feedbackSnap.docs.map(async (fbDoc: QueryDocumentSnapshot<DocumentData>) => {
            const data = fbDoc.data();
            let email = "-";
            if (data.userId) {
              const userDoc = await getDoc(doc(db, "users", data.userId));
              if (userDoc.exists()) {
                email = userDoc.data().email || "-";
              }
            }
            return {
              id: fbDoc.id,
              userId: data.userId,
              feedback: data.feedback,
              createdAt: data.createdAt,
              email,
            };
          })
        );
        setFeedbacks(feedbackData);
      } catch {
        setError("Failed to fetch feedback");
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  function formatDate(date: Date): string {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const time = date.toLocaleTimeString([], { hour12: false });
    if (isToday) return `Today, at ${time}`;
    if (isYesterday) return `Yesterday, at ${time}`;
    return `${date.getDate().toString().padStart(2, '0')} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}, ${time}`;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Feedback</h2>
      <div className="bg-white p-6 rounded-lg shadow w-full">
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full border text-sm w-full">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="px-4 py-2 border">No.</th>
                  <th className="px-4 py-2 border">User Email</th>
                  <th className="px-4 py-2 border">Message</th>
                  <th className="px-4 py-2 border">Created At</th>
                  <th className="px-4 py-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">No feedback found.</td>
                  </tr>
                ) : (
                  feedbacks.map((fb, idx) => (
                    <tr key={fb.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50" + " hover:bg-blue-50 transition-colors"}>
                      <td className="px-4 py-2 border">{idx + 1}</td>
                      <td className="px-4 py-2 border">{fb.email || '-'}</td>
                      <td className="px-4 py-2 border">{fb.feedback}</td>
                      <td className="px-4 py-2 border">
                        {fb.createdAt && typeof fb.createdAt === 'object' && fb.createdAt !== null && 'toDate' in fb.createdAt && typeof fb.createdAt.toDate === 'function'
                          ? formatDate(fb.createdAt.toDate())
                          : '-'}
                      </td>
                      <td className="px-4 py-2 border text-center">
                        <button className="p-2 rounded hover:bg-blue-100 transition-colors" title="View Details" onClick={() => setSelectedFeedback(fb)}>
                          <Eye size={18} className="text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal for feedback detail */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl font-bold"
              onClick={() => setSelectedFeedback(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded mb-4 max-h-64 overflow-y-auto">
                <div className="text-lg font-semibold text-blue-800 mb-2">Feedback</div>
                <div className="text-xl text-blue-900 font-bold break-words whitespace-pre-line">{selectedFeedback.feedback}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">User Email</div>
                  <div className="text-base font-semibold">{selectedFeedback.email || '-'}</div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Created At</div>
                  <div className="text-base">
                    {selectedFeedback.createdAt && typeof selectedFeedback.createdAt === 'object' && selectedFeedback.createdAt !== null && 'toDate' in selectedFeedback.createdAt && typeof selectedFeedback.createdAt.toDate === 'function'
                      ? formatDate(selectedFeedback.createdAt.toDate())
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 