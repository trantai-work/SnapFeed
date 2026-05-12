import React, { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import ConversationAvatar from './ConversationAvatar';

export default function VideoCallModal() {
  const {
    callState,
    remoteUser,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    endCall,
    isMuted,
    isVideoOff,
    remoteIsMuted,
    remoteIsVideoOff,
    toggleAudio,
    toggleVideo
  } = useVideoCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Draggable logic for local video
  const [pos, setPos] = useState({ x: 32, y: 112 }); // Initial position (bottom-28 right-8)
  const draggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    startPosRef.current = {
      x: e.clientX + pos.x,
      y: e.clientY + pos.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingRef.current) return;

      const newX = startPosRef.current.x - e.clientX;
      const newY = startPosRef.current.y - e.clientY;

      // Boundary constraints
      const maxX = window.innerWidth - 208; // 208px is w-52
      const maxY = window.innerHeight - 117; // aspect-video of 208px

      setPos({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };
    const handleMouseUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pos.x, pos.y]);

  useEffect(() => {
    if (localVideoRef.current && localStream && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && !remoteIsVideoOff) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState, remoteIsVideoOff]);

  if (callState === 'idle') return null;

  // Request higher resolution (e.g. 400px) instead of default s96-c
  const rawAvatarUrl = remoteUser?.avatar_url || remoteUser?.avatarUrl;
  const avatarUrl = rawAvatarUrl?.replace('=s96-c', '=s400-c');

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505] overflow-hidden font-sans select-none">

      {/* Remote Video / Background Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Always keep video mounted for audio, but hide if video is off or call not active */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain ${(callState === 'active' && !remoteIsVideoOff) ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}
          onLoadedMetadata={(e) => { e.target.volume = 1; }}
        />

        {/* Show Avatar when calling or when remote video is off */}
        {(callState !== 'active' || remoteIsVideoOff) && (
          <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full scale-[2.5]"></div>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-32 h-32 rounded-full border-4 border-white/5 shadow-2xl relative z-10 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-white/5 shadow-2xl relative z-10 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">{(remoteUser?.firstName || remoteUser?.first_name)?.[0]}</span>
                </div>
              )}
            </div>
            <div className="text-center z-10">
              <h2 className="text-white text-2xl font-bold tracking-tight">
                {remoteUser?.firstName || remoteUser?.first_name} {remoteUser?.lastName || remoteUser?.last_name}
              </h2>
              <p className={`mt-2 text-sm font-semibold tracking-widest uppercase opacity-70 ${callState === 'no_answer' ? 'text-red-500' : 'text-blue-400'}`}>
                {callState === 'outgoing' ? `Đang gọi cho ${remoteUser?.firstName || remoteUser?.first_name}...` :
                  callState === 'incoming' ? `${remoteUser?.firstName || remoteUser?.first_name} đang gọi cho bạn...` :
                    callState === 'no_answer' ? 'Người dùng không bắt máy' :
                      remoteIsVideoOff ? 'Đối phương đã tắt camera' : 'Cuộc gọi đang diễn ra'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top Left Info (When Active) */}
      {callState === 'active' && (
        <div className="absolute top-8 left-8 flex items-center gap-3 z-30 bg-black/40 backdrop-blur-xl p-2 pr-5 rounded-full border border-white/10">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs">
              {(remoteUser?.firstName || remoteUser?.first_name)?.[0]}
            </div>
          )}
          <div className="text-white font-bold tracking-wide flex items-center gap-2">
            {remoteUser?.firstName || remoteUser?.first_name} {remoteUser?.lastName || remoteUser?.last_name}
            {remoteIsMuted && <MicOff className="w-4 h-4 text-red-500" />}
          </div>
        </div>
      )}

      {/* Local Video (Draggable) */}
      {localStream && (
        <div
          onMouseDown={handleMouseDown}
          style={{
            right: `${pos.x}px`,
            bottom: `${pos.y}px`
          }}
          className={`absolute w-52 aspect-video bg-black/60 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-[60] group cursor-move ${callState === 'active' ? 'scale-100' : 'scale-105'}`}
        >
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <VideoOff className="w-10 h-10 text-gray-600" />
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 pointer-events-none">
            <span className="text-white text-xs font-bold flex items-center gap-1.5">
              Bạn {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
            </span>
          </div>
        </div>
      )}

      {/* Control Bar (Bottom Center) - Shrinked */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#121212]/90 backdrop-blur-3xl rounded-[30px] border border-white/10 z-50 shadow-2xl">
        {callState === 'incoming' ? (
          <>
            <button
              onClick={acceptCall}
              className="w-12 h-12 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-full transition-all hover:scale-110 active:scale-90 shadow-lg shadow-green-500/30 cursor-pointer"
            >
              <Phone className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={rejectCall}
              className="w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-500/30 cursor-pointer"
            >
              <PhoneOff className="w-6 h-6 fill-current" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleVideo}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer group border border-white/5 ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-white/5 hover:bg-white/15 text-white'}`}
              title={isVideoOff ? "Bật Camera" : "Tắt Camera"}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 group-hover:scale-110 transition-transform" />}
            </button>
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer group border border-white/5 ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 hover:bg-white/15 text-white'}`}
              title={isMuted ? "Bật Mic" : "Tắt Mic"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />}
            </button>
            <button
              onClick={callState === 'outgoing' ? rejectCall : endCall}
              className="w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-500/30 cursor-pointer"
            >
              <PhoneOff className="w-6 h-6 fill-current" />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
