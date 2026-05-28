import { useEffect, useState, useRef } from "react";
import { Plus, Edit, Trash2, Play, Pause, Search, Music, UploadCloud, X, Check } from "lucide-react";
import { musicApi } from "../../api/music.api";
import { useMessageBox } from "../MessageBox";

export default function MusicManagement() {
  const { show } = useMessageBox();
  const [musicList, setMusicList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioPlayerRef = useRef(new Audio());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [editingTrackId, setEditingTrackId] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [duration, setDuration] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all music
  const loadMusic = async () => {
    try {
      setLoading(true);
      const data = await musicApi.list(searchQuery);
      setMusicList(data || []);
    } catch (err) {
      show({
        status: "error",
        title: "Lỗi tải danh sách",
        message: err?.message || "Không thể tải danh sách bài hát.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadMusic, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Audio player synchronization
  useEffect(() => {
    const player = audioPlayerRef.current;
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayProgress(0);
      setCurrentTime(0);
    };
    const handleTimeUpdate = () => {
      if (player.duration) {
        setPlayProgress((player.currentTime / player.duration) * 100);
        setCurrentTime(player.currentTime);
      }
    };
    player.addEventListener("ended", handleEnded);
    player.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      player.removeEventListener("ended", handleEnded);
      player.removeEventListener("timeupdate", handleTimeUpdate);
      player.pause();
    };
  }, []);

  const handlePlayToggle = (track) => {
    const player = audioPlayerRef.current;
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play().catch((err) => {
          show({
            status: "error",
            title: "Không thể phát âm thanh",
            message: "Đường dẫn file nhạc bị lỗi hoặc không thể kết nối.",
          });
        });
        setIsPlaying(true);
      }
    } else {
      setPlayProgress(0);
      setCurrentTime(0);
      setCurrentTrack(track);
      player.src = track.audioFile;
      player.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          show({
            status: "error",
            title: "Không thể phát âm thanh",
            message: "Đường dẫn file nhạc bị lỗi hoặc không thể kết nối.",
          });
          setIsPlaying(false);
          setCurrentTrack(null);
        });
    }
  };

  const handleSeek = (e) => {
    const player = audioPlayerRef.current;
    if (!player || !player.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    player.currentTime = percentage * player.duration;
    setPlayProgress(percentage * 100);
    setCurrentTime(player.currentTime);
  };

  // Open create/edit modal
  const openCreateModal = () => {
    setModalMode("create");
    setEditingTrackId(null);
    setTitle("");
    setArtist("");
    setAudioFile(null);
    setCoverImage(null);
    setDuration("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (track) => {
    setModalMode("edit");
    setEditingTrackId(track.id);
    setTitle(track.title);
    setArtist(track.artist || "");
    setAudioFile(null);
    setCoverImage(null);
    setDuration(String(track.duration || ""));
    setIsActive(track.isActive);
    setIsModalOpen(true);
  };

  // Handle file selections and automatically compute audio duration
  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);

    // Auto-detect duration
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener("loadedmetadata", () => {
      setDuration(String(Math.round(audio.duration)));
    });
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      show({ status: "warning", message: "Vui lòng nhập tiêu đề bài hát." });
      return;
    }
    if (modalMode === "create" && !audioFile) {
      show({ status: "warning", message: "Vui lòng tải lên file âm thanh." });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("artist", artist);
    formData.append("is_active", String(isActive));
    if (duration) formData.append("duration", duration);
    if (audioFile) formData.append("audio_file", audioFile);
    if (coverImage) formData.append("cover_image", coverImage);

    try {
      setIsSubmitting(true);
      if (modalMode === "create") {
        await musicApi.create(formData);
        show({ status: "success", title: "Thành công", message: "Đã thêm nhạc nền mới." });
      } else {
        await musicApi.update(editingTrackId, formData);
        show({ status: "success", title: "Thành công", message: "Đã cập nhật bài hát." });
      }
      setIsModalOpen(false);
      loadMusic();
    } catch (err) {
      show({
        status: "error",
        title: "Thao tác thất bại",
        message: err?.message || "Đã xảy ra lỗi, vui lòng thử lại.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (track) => {
    const ok = window.confirm(`Bạn có chắc chắn muốn xóa bài hát "${track.title}"?`);
    if (!ok) return;

    try {
      if (playingTrackId === track.id) {
        audioPlayerRef.current.pause();
        setPlayingTrackId(null);
      }
      await musicApi.delete(track.id);
      show({ status: "success", title: "Đã xóa", message: "Bài hát đã được xóa khỏi hệ thống." });
      loadMusic();
    } catch (err) {
      show({
        status: "error",
        title: "Xóa thất bại",
        message: err?.message || "Không thể xóa bài hát này.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f0efed] text-[#292524]">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0c0a09]">Quản lý nhạc nền</h2>
            <p className="text-xs text-[#777169]">Tải lên và điều chỉnh nhạc nền cho các video ngắn</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 bg-[#292524] text-white px-4 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 transition cursor-pointer"
        >
          <Plus size={16} />
          Thêm nhạc mới
        </button>
      </div>

      {/* Search Panel */}
      <div className="p-4 border-b border-[#e7e5e4] bg-[#fdfdfd]">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc ca sĩ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f5f5f5] border border-[#e7e5e4] hover:border-zinc-300 focus:border-[#292524] rounded-full pl-10 pr-4 py-2 text-sm text-[#0c0a09] placeholder-zinc-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Music Table View */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#292524] border-t-transparent" />
            <span className="text-xs font-medium">Đang tải danh sách bài hát...</span>
          </div>
        ) : musicList.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 text-sm">
            Chưa có bài hát nào được đăng tải.
          </div>
        ) : (
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-[#e7e5e4]">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#777169] uppercase tracking-wider"></th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#777169] uppercase tracking-wider">Thông tin bài hát</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#777169] uppercase tracking-wider">Thời lượng</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-[#777169] uppercase tracking-wider">Trạng thái</th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-[#777169] uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#e7e5e4]">
                  {musicList.map((track) => (
                    <tr key={track.id} className="hover:bg-zinc-50/55 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap w-16">
                        <button
                          onClick={() => handlePlayToggle(track)}
                          className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all ${
                            currentTrack?.id === track.id && isPlaying
                              ? "bg-pink-500 text-white shadow-md shadow-pink-500/20"
                              : currentTrack?.id === track.id
                              ? "bg-pink-100 text-pink-600 border border-pink-200"
                              : "bg-[#f5f5f5] text-[#292524] hover:bg-zinc-200"
                          }`}
                        >
                          {currentTrack?.id === track.id && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {track.coverImage ? (
                            <img
                              src={track.coverImage}
                              alt={track.title}
                              className="w-12 h-12 rounded-xl object-cover border border-[#e7e5e4]"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                              <Music size={18} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-[#0c0a09] truncate">{track.title}</div>
                            <div className="text-xs text-[#777169] truncate">{track.artist || "Unknown"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0c0a09]">
                        {String(Math.floor(track.duration / 60))}:{String(track.duration % 60).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            track.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${track.isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                          {track.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(track)}
                            className="p-2 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-full transition cursor-pointer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(track)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Modal for Create & Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#e7e5e4] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[#e7e5e4]">
              <h3 className="text-base font-bold text-[#0c0a09]">
                {modalMode === "create" ? "Thêm nhạc nền mới" : "Chỉnh sửa bài hát"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#f0efed] text-zinc-400 hover:text-black transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title input */}
              <div>
                <label className="block text-xs font-bold text-[#777169] uppercase mb-1">Tiêu đề bài hát *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Lạc Trôi, Mood..."
                  className="w-full bg-[#f5f5f5] border border-[#e7e5e4] hover:border-zinc-300 focus:border-[#292524] rounded-xl px-4 py-2.5 text-sm text-[#0c0a09] outline-none transition-all"
                />
              </div>

              {/* Artist input */}
              <div>
                <label className="block text-xs font-bold text-[#777169] uppercase mb-1">Ca sĩ / Nghệ sĩ</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ví dụ: Sơn Tùng M-TP, 24kGoldn..."
                  className="w-full bg-[#f5f5f5] border border-[#e7e5e4] hover:border-zinc-300 focus:border-[#292524] rounded-xl px-4 py-2.5 text-sm text-[#0c0a09] outline-none transition-all"
                />
              </div>

              {/* Audio file picker */}
              <div>
                <label className="block text-xs font-bold text-[#777169] uppercase mb-1">
                  File âm thanh (Audio) {modalMode === "create" ? "*" : "(tùy chọn thay thế)"}
                </label>
                <div className="relative flex items-center justify-center border-2 border-dashed border-[#e7e5e4] hover:border-zinc-300 rounded-xl p-4 bg-zinc-50/50 cursor-pointer transition">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1.5 text-center text-zinc-500">
                    <UploadCloud size={24} className="text-zinc-400 animate-pulse" />
                    <span className="text-xs font-semibold">
                      {audioFile ? audioFile.name : "Kéo thả hoặc nhấp để chọn file nhạc (.mp3, .wav, .m4a)"}
                    </span>
                  </div>
                {duration && (
                  <div className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Check size={12} /> Thời lượng phát hiện: {duration} giây
                  </div>
                )}
              </div>
            </div>

              {/* Cover image picker */}
              <div>
                <label className="block text-xs font-bold text-[#777169] uppercase mb-1">Ảnh bìa (tùy chọn)</label>
                <div className="relative flex items-center justify-center border border-[#e7e5e4] hover:border-zinc-300 rounded-xl p-3 bg-zinc-50/50 cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImage(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-500 truncate font-semibold">
                    {coverImage ? coverImage.name : "Chọn ảnh bìa (.png, .jpg)"}
                  </span>
                </div>
              </div>

              {/* Active flag toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-[#777169] uppercase cursor-pointer selection:bg-transparent">
                  Kích hoạt (Active)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e7e5e4]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full border border-[#d6d3d1] hover:bg-[#f0efed] text-sm font-medium text-[#292524] transition cursor-pointer disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 bg-[#292524] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check size={16} />
                  )}
                  Lưu bài hát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Music Player */}
      {currentTrack && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[550px] bg-white/95 backdrop-blur-xl border border-zinc-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-4 flex flex-col gap-2.5 transition-all duration-300 ease-out transform translate-y-0 opacity-100">
          <div className="flex items-center gap-3">
            {/* Cover photo */}
            {currentTrack.coverImage ? (
              <img
                src={currentTrack.coverImage}
                alt={currentTrack.title}
                className={`w-12 h-12 rounded-xl object-cover shadow-md ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20 shadow-md">
                <Music size={18} />
              </div>
            )}
            
            {/* Metadata */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-zinc-900 truncate">{currentTrack.title}</h4>
              <p className="text-xs text-zinc-500 font-medium truncate">{currentTrack.artist || "Unknown"}</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayToggle(currentTrack)}
                className="w-10 h-10 flex items-center justify-center bg-pink-500 text-white rounded-full hover:bg-pink-600 transition active:scale-95 shadow-md shadow-pink-500/20 cursor-pointer"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  audioPlayerRef.current.pause();
                  setCurrentTrack(null);
                  setIsPlaying(false);
                  setPlayProgress(0);
                }}
                className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Progress Slider */}
          <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
            <span className="w-8 text-left">
              {String(Math.floor(currentTime / 60))}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
            </span>
            <div 
              onClick={handleSeek}
              className="flex-1 h-1.5 bg-zinc-200 hover:h-2 rounded-full overflow-hidden cursor-pointer relative group transition-all"
            >
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
                style={{ width: `${playProgress}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                style={{ left: `calc(${playProgress}% - 6px)` }}
              />
            </div>
            <span className="w-8 text-right">
              {String(Math.floor(currentTrack.duration / 60))}:{String(Math.floor(currentTrack.duration % 60)).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
