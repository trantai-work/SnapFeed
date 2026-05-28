import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Video, RotateCcw, Volume2, VolumeX, SwitchCamera, Check, Radio, Music, Search, Mic } from "lucide-react";
import { useUploadDraft } from "../context/UploadDraftContext";
import { useMessageBox } from "./MessageBox";
import { musicApi } from "../api/music.api";
import fixWebmDuration from "fix-webm-duration";

export default function RecordVideoModal({ open, onClose }) {
  const navigate = useNavigate();
  const { show } = useMessageBox();
  const { setVideo, setSelectedMusic } = useUploadDraft();

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const musicAudioRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState("user"); // user or environment
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(9 / 16); // Dynamic aspect ratio from camera stream
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Audio Music States
  const [audioSource, setAudioSource] = useState("mic"); // mic or music
  const [musicList, setMusicList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMusicTrack, setSelectedMusicTrack] = useState(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Maximum recording time in seconds (e.g. 60 seconds)
  const MAX_DURATION = 60;

  // Active maximum duration depending on selected music length
  const activeMaxDuration = (audioSource === "music" && selectedMusicTrack)
    ? Math.min(MAX_DURATION, selectedMusicTrack.duration)
    : MAX_DURATION;

  // Fetch music list when open or searching
  useEffect(() => {
    if (!open || audioSource !== "music") return;

    const fetchMusic = async () => {
      try {
        setIsSearchingMusic(true);
        const data = await musicApi.list(searchQuery);
        setMusicList(data || []);
      } catch (err) {
        console.error("Failed to load music list:", err);
      } finally {
        setIsSearchingMusic(false);
      }
    };

    const timer = setTimeout(fetchMusic, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, audioSource, searchQuery]);

  // Load and manage Music audio element
  useEffect(() => {
    if (selectedMusicTrack) {
      setIsPreparing(true);
      let resolvedUrl = selectedMusicTrack.audioFile;
      if (resolvedUrl && !resolvedUrl.startsWith("http")) {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
        resolvedUrl = `${apiBase.replace(/\/$/, "")}/${resolvedUrl.replace(/^\//, "")}`;
      }
      const audio = new Audio(resolvedUrl);
      audio.loop = false;
      audio.preload = "auto";
      audio.volume = 1.0;
      audio.muted = false;

      const handleCanPlay = () => {
        setIsPreparing(false);
        console.log("Audio background music loaded and ready.");
      };

      const handleLoadError = (err) => {
        setIsPreparing(false);
        console.error("Audio background music load failed:", err);
      };

      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("error", handleLoadError);
      audio.load();
      musicAudioRef.current = audio;

      return () => {
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("error", handleLoadError);
        audio.pause();
      };
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
      musicAudioRef.current = null;
      setIsPreparing(false);
    }
  }, [selectedMusicTrack]);

  // Load media devices
  useEffect(() => {
    if (!open) return;

    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devList.filter(d => d.kind === "videoinput");
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Failed to get camera devices:", err);
      }
    };

    getDevices();
  }, [open]);

  // Start Camera Stream
  const startCamera = async () => {
    stopCamera();
    setLoading(true);
    try {
      const constraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 720 }, height: { ideal: 1280 } }
          : { facingMode: cameraMode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: audioSource === "mic" ? {
          echoCancellation: true,
          noiseSuppression: true,
        } : false // Disable mic audio track if music is selected as source
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings();
        if (settings.width && settings.height) {
          setAspectRatio(settings.width / settings.height);
        }
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      show({
        status: "error",
        title: "Không thể mở camera",
        message: "Vui lòng cấp quyền truy cập camera và microphone để tiếp tục.",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const forceWebMDuration = (videoEl, dur) => {
    if (!videoEl || !dur || dur <= 0) return;
    try {
      if (videoEl.duration !== dur) {
        Object.defineProperty(videoEl, 'duration', {
          get: () => dur,
          configurable: true
        });
        videoEl.dispatchEvent(new Event('durationchange'));
      }
    } catch (e) {
      console.warn("Failed to override duration:", e);
    }
  };

  useEffect(() => {
    if (open && !recordedBlob) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, selectedDeviceId, cameraMode, recordedBlob, audioSource]);

  // Pause all background videos when recording modal is opened
  useEffect(() => {
    if (open) {
      const backgroundVideos = document.querySelectorAll("video");
      backgroundVideos.forEach((vid) => {
        if (vid.getAttribute("data-keep-playing") !== "true") {
          vid.pause();
        }
      });
    }
  }, [open]);

  // Start recording
  const startRecording = () => {
    if (!streamRef.current || isPreparing) return;
    chunksRef.current = [];
    setDuration(0);
    const startTime = Date.now();

    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    let mediaRecorder;

    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      console.warn("VP9/Opus WebM not supported, trying default webm config", e);
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      } catch (err) {
        console.error("Failed to create MediaRecorder:", err);
        show({
          status: "error",
          message: "Trình duyệt của bạn không hỗ trợ ghi hình video.",
        });
        return;
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
      const rawBlob = new Blob(chunksRef.current, { type: "video/webm" });
      const durationMs = Date.now() - startTime;

      fixWebmDuration(rawBlob, durationMs, { logger: false }).then((fixedBlob) => {
        setRecordedBlob(fixedBlob);
        const url = URL.createObjectURL(fixedBlob);
        setPreviewUrl(url);
        setIsRecording(false);
        stopCamera();
      });
    };

    mediaRecorderRef.current = mediaRecorder;

    // Play music if source is music and track selected
    if (audioSource === "music" && selectedMusicTrack && musicAudioRef.current) {
      musicAudioRef.current.currentTime = 0;
      musicAudioRef.current.volume = 1.0;
      musicAudioRef.current.muted = false;
      musicAudioRef.current.play().catch(e => {
        console.error("Play failed during recording start:", e);
      });
    }

    mediaRecorder.start(1000); // chunk every second
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setDuration(prev => {
        if (prev >= activeMaxDuration - 1) {
          stopRecording();
          return activeMaxDuration;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const switchCamera = () => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setSelectedDeviceId(devices[nextIndex].deviceId);
    } else {
      setCameraMode(prev => (prev === "user" ? "environment" : "user"));
    }
  };

  const resetRecording = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
    setRecordedBlob(null);
    setPreviewUrl("");
    setDuration(0);
    setIsRecording(false);
  };

  const handleUseVideo = () => {
    if (!recordedBlob) return;

    // Pause and clean up music
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }

    // Create a file mimicking MP4 for frontend compatibility
    const file = new File([recordedBlob], "recorded-video.mp4", {
      type: "video/mp4",
      lastModified: Date.now()
    });

    // Attach custom duration because recorded webm blob lacks metadata duration in browser
    file.recordedDuration = duration;

    setVideo(file);
    if (audioSource === "music" && selectedMusicTrack) {
      setSelectedMusic(selectedMusicTrack);
    } else {
      setSelectedMusic(null);
    }

    // Reset recording states and close
    resetRecording();
    onClose();
    navigate("/upload/video");
  };

  const handleClose = () => {
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    resetRecording();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black md:bg-black/90 md:p-4 md:backdrop-blur-md">
      <div 
        style={{ aspectRatio: isMobile ? undefined : aspectRatio }}
        className="relative flex flex-col overflow-hidden bg-zinc-950 shadow-2xl transition-all duration-300 w-full h-[100dvh] md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-3xl md:border md:border-white/10"
      >
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider text-white uppercase">
              {recordedBlob ? "Xem lại video" : isRecording ? "Đang ghi hình" : "Quay video ngắn"}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Audio Mode Select */}
        {!recordedBlob && !isRecording && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg gap-1 transition-all">
            <button
              onClick={() => {
                setAudioSource("mic");
                setSelectedMusicTrack(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                audioSource === "mic"
                  ? "bg-white text-black shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Mic size={14} />
              Microphone
            </button>
            <button
              onClick={() => setAudioSource("music")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                audioSource === "music"
                  ? "bg-white text-black shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Music size={14} />
              Nhạc nền
            </button>
          </div>
        )}

        {/* Music Selector Trigger Button */}
        {!recordedBlob && !isRecording && audioSource === "music" && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
            {selectedMusicTrack ? (
              <div className="flex items-center bg-pink-500/20 backdrop-blur-md border border-pink-500/40 text-pink-400 pl-4 pr-2 py-1.5 rounded-full text-xs font-semibold gap-2 shadow-lg animate-fade-in">
                <Music size={12} className={isPreparing ? "animate-spin" : "animate-pulse"} />
                <span className="max-w-[150px] truncate">
                  {isPreparing ? "Đang chuẩn bị..." : selectedMusicTrack.title}
                </span>
                <button
                  onClick={() => setSelectedMusicTrack(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-pink-400 hover:text-white transition cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowMusicSelector(true)}
                className="flex items-center bg-black/60 backdrop-blur-md border border-white/10 hover:border-pink-500/50 hover:text-pink-400 text-white px-4 py-2 rounded-full text-xs font-bold gap-1.5 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Music size={14} />
                Chọn nhạc nền
              </button>
            )}
          </div>
        )}

        {/* Video viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-0">
          {!recordedBlob ? (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
                </div>
              )}
              {isPreparing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-30 gap-3 text-white text-center p-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
                  <span className="text-sm font-bold animate-pulse">Đang tải nhạc nền...</span>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                data-keep-playing="true"
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    const w = videoRef.current.videoWidth;
                    const h = videoRef.current.videoHeight;
                    if (w && h) setAspectRatio(w / h);
                  }
                }}
                className="h-full w-full object-cover scale-x-[-1]"
              />
            </>
          ) : (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              autoPlay
              controls
              loop
                  onLoadedMetadata={() => {
                if (previewVideoRef.current) {
                  const w = previewVideoRef.current.videoWidth;
                  const h = previewVideoRef.current.videoHeight;
                  if (w && h) setAspectRatio(w / h);
                }
                forceWebMDuration(previewVideoRef.current, duration);
              }}
              onLoadedData={() => forceWebMDuration(previewVideoRef.current, duration)}
              onCanPlay={() => forceWebMDuration(previewVideoRef.current, duration)}
              onPlay={() => {
                forceWebMDuration(previewVideoRef.current, duration);
                if (musicAudioRef.current && previewVideoRef.current) {
                  musicAudioRef.current.currentTime = previewVideoRef.current.currentTime;
                  musicAudioRef.current.play().catch(e => console.log("Music play failed:", e));
                }
              }}
              onPause={() => {
                if (musicAudioRef.current) {
                  musicAudioRef.current.pause();
                }
              }}
              onTimeUpdate={() => {
                forceWebMDuration(previewVideoRef.current, duration);
                if (musicAudioRef.current && previewVideoRef.current) {
                  const diff = Math.abs(musicAudioRef.current.currentTime - previewVideoRef.current.currentTime);
                  if (diff > 0.3) {
                    musicAudioRef.current.currentTime = previewVideoRef.current.currentTime;
                  }
                }
              }}
              onSeeking={() => {
                forceWebMDuration(previewVideoRef.current, duration);
                if (musicAudioRef.current && previewVideoRef.current) {
                  musicAudioRef.current.currentTime = previewVideoRef.current.currentTime;
                }
              }}
              className="h-full w-full object-cover"
            />
          )}

          {/* Overlay elements when recording */}
          {!recordedBlob && !loading && (
            <div className="absolute inset-x-0 bottom-8 md:bottom-24 flex flex-col items-center gap-4 z-10">
              {/* Duration count */}
              <div className="rounded-full bg-black/60 px-3.5 py-1 text-xs font-bold text-white tracking-widest backdrop-blur-sm">
                {String(Math.floor(duration / 60)).padStart(2, "0")}:{String(duration % 60).padStart(2, "0")} / {String(Math.floor(activeMaxDuration / 60)).padStart(2, "0")}:{String(activeMaxDuration % 60).padStart(2, "0")}
              </div>

              {/* Control panel */}
              <div className="flex items-center gap-8">
                {audioSource === "mic" ? (
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`rounded-full p-3.5 backdrop-blur-md transition cursor-pointer hover:scale-105 active:scale-95 ${
                      isMuted ? "bg-red-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
                    }`}
                    disabled={isRecording}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center">
                    {isRecording && (
                      <div className="flex items-center gap-0.5 h-6">
                        <div className="w-0.5 bg-pink-500 h-2 animate-[bounce_0.8s_infinite_100ms]" />
                        <div className="w-0.5 bg-pink-500 h-4 animate-[bounce_0.8s_infinite_200ms]" />
                        <div className="w-0.5 bg-pink-500 h-3 animate-[bounce_0.8s_infinite_300ms]" />
                        <div className="w-0.5 bg-pink-500 h-5 animate-[bounce_0.8s_infinite_400ms]" />
                        <div className="w-0.5 bg-pink-500 h-2 animate-[bounce_0.8s_infinite_500ms]" />
                      </div>
                    )}
                  </div>
                )}

                {/* Big Record Button */}
                <button
                  type="button"
                  disabled={isPreparing}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`group relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 p-1 cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                    isPreparing ? "opacity-40 cursor-not-allowed scale-95" : ""
                  }`}
                >
                  {isPreparing ? (
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
                  ) : (
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        isRecording
                          ? "h-10 w-10 bg-red-500 rounded-lg animate-pulse"
                          : "h-16 w-16 bg-red-600 group-hover:scale-95"
                      }`}
                    />
                  )}
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={switchCamera}
                  className="rounded-full bg-black/50 p-3.5 text-white backdrop-blur-md hover:bg-black/70 transition cursor-pointer hover:scale-105 active:scale-95"
                  disabled={isRecording}
                >
                  <SwitchCamera size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Footer buttons after recording */}
          {recordedBlob && (
            <div className="absolute inset-x-0 bottom-8 flex justify-center gap-4 px-6 z-10">
              <button
                type="button"
                onClick={resetRecording}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition cursor-pointer"
              >
                <RotateCcw size={16} />
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleUseVideo}
                className="flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-600 active:scale-95 transition cursor-pointer"
              >
                <Check size={16} />
                Sử dụng video
              </button>
            </div>
          )}

          {/* Music Selector Panel */}
          {showMusicSelector && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-lg z-30 flex flex-col transition-all duration-300">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                  <Music size={16} className="text-pink-500" /> Thư viện nhạc nền
                </span>
                <button
                  onClick={() => setShowMusicSelector(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài hát, ca sĩ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 hover:border-white/20 focus:border-pink-500 rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:ring-2 focus:ring-pink-500/20"
                  />
                </div>
              </div>

              {/* Music List */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 gap-2 flex flex-col">
                {isSearchingMusic ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                    <span className="text-xs">Đang tìm kiếm...</span>
                  </div>
                ) : musicList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    Không tìm thấy bài hát nào
                  </div>
                ) : (
                  musicList.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        setSelectedMusicTrack(track);
                        setShowMusicSelector(false);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-white/5 active:scale-[0.98] ${
                        selectedMusicTrack?.id === track.id ? "bg-white/10 border border-pink-500/30" : "border border-transparent"
                      }`}
                    >
                      {track.coverImage ? (
                        <img
                          src={track.coverImage}
                          alt={track.title}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20">
                          <Music size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{track.title}</div>
                        <div className="text-xs text-zinc-400 truncate">{track.artist || "Unknown"}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold bg-zinc-800 px-2 py-1 rounded-md">
                        {String(Math.floor(track.duration / 60))}:{String(track.duration % 60).padStart(2, "0")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
