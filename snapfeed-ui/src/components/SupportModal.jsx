import { useState } from "react";
import { X, Send, Loader2, History, Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supportApi } from "../api";
import { useMessageBox } from "./MessageBox";

export default function SupportModal({ open, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { show } = useMessageBox();
  const navigate = useNavigate();

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return;
    }
    setSubmitting(true);
    try {
      await supportApi.createTicket({
        title: title.trim(),
        description: description.trim(),
      });
      show({
        status: "success",
        title: "Gửi hỗ trợ thành công",
        message: "Chúng tôi sẽ xem xét và phản hồi bạn sớm nhất có thể.",
      });
      setTitle("");
      setDescription("");
      onClose();
    } catch (err) {
      show({
        status: "error",
        title: "Lỗi gửi yêu cầu",
        message: err?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default bg-black/45 backdrop-blur-[1px] transition-opacity dark:bg-black/55"
        aria-label="Đóng form hỗ trợ"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[110] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-all dark:bg-[#121212] max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Headset className="h-5 w-5 text-pink-600" />
            Gửi yêu cầu hỗ trợ
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chủ đề
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vấn đề bạn đang gặp phải..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-pink-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-600 dark:border-white/10 dark:bg-black dark:text-white dark:focus:bg-black"
              maxLength={255}
              required
            />
          </div>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chi tiết yêu cầu
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề của bạn. (Nếu khiếu nại về video, vui lòng cung cấp ID của video)"
              className="h-40 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-pink-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-600 dark:border-white/10 dark:bg-black dark:text-white dark:focus:bg-black"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/support");
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
            >
              <History className="h-4 w-4" />
              Lịch sử hỗ trợ
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !description.trim()}
                className="cursor-pointer flex items-center gap-2 rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:bg-pink-700 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gửi
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
