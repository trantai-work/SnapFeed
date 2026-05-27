import React, { useEffect, useRef, useState } from 'react';
import { useVideoCall } from '../../context/VideoCallContext';
import { useAuth } from '../../context/AuthContext';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import ConversationAvatar from './ConversationAvatar';

function GroupVideoCard({ videoItem }) {
  const videoRef = useRef(null);
  const { id, stream, user, isLocal, isMuted, isVideoOff } = videoItem;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOff]);

  const displayName = isLocal ? 'Bạn' : `${user?.firstName || user?.first_name || ''} ${user?.lastName || user?.last_name || ''}`.trim() || user?.username || 'Thành viên';
  const rawAvatarUrl = user?.avatar_url || user?.avatarUrl;
  const avatarUrl = rawAvatarUrl?.replace('=s96-c', '=s200-c');

  return (
    <div className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center aspect-[4/3] sm:aspect-video w-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${(!stream || isVideoOff) ? 'hidden' : ''}`}
      />

      {(!stream || isVideoOff) && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" alt="" />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-700 flex items-center justify-center text-white text-xl font-bold">
                {(user?.firstName || user?.first_name || displayName)?.[0]}
              </div>
            )}
            {isMuted && (
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1.5 border-2 border-[#1a1a1a]">
                <MicOff className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
          <span className="text-white/60 text-xs sm:text-sm font-medium">{displayName}</span>
        </div>
      )}

      {stream && !isVideoOff && (
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 border border-white/5">
          {displayName}
          {isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
        </div>
      )}
    </div>
  );
}

export default function VideoCallModal() {
  const { user: me } = useAuth();
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
    toggleVideo,
    isGroupCall,
    groupCallState,
    groupStreams,
    groupConversation,
    groupActiveMembers,
    groupParticipantStates
  } = useVideoCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Draggable logic for local video
  const [pos, setPos] = useState({ x: 32, y: 112 }); // Initial position (bottom-28 right-8)
  const draggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [localAspect, setLocalAspect] = useState(16 / 9); // fallback 16:9

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    startPosRef.current = {
      x: e.clientX + pos.x,
      y: e.clientY + pos.y
    };
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    draggingRef.current = true;
    startPosRef.current = {
      x: touch.clientX + pos.x,
      y: touch.clientY + pos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingRef.current) return;
      const newX = startPosRef.current.x - e.clientX;
      const newY = startPosRef.current.y - e.clientY;
      const maxX = window.innerWidth - 208;
      const maxY = window.innerHeight - 117;
      setPos({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };
    const handleTouchMove = (e) => {
      if (!draggingRef.current) return;
      const touch = e.touches[0];
      const newX = startPosRef.current.x - touch.clientX;
      const newY = startPosRef.current.y - touch.clientY;
      const maxX = window.innerWidth - 208;
      const maxY = window.innerHeight - 117;
      setPos({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };
    const handleEnd = () => {
      draggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

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

  const activeState = isGroupCall ? groupCallState : callState;
  if (activeState === 'idle') return null;

  if (isGroupCall) {
    if (groupCallState === 'incoming') {
      const groupTitle = groupConversation?.title || "Nhóm trò chuyện";
      const rawGroupAvatarUrl = remoteUser?.avatar_url || remoteUser?.avatarUrl;
      const groupAvatarUrl = rawGroupAvatarUrl?.replace('=s96-c', '=s400-c');

      return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#050505] overflow-hidden font-sans select-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full scale-[2.5]"></div>
                {groupAvatarUrl ? (
                  <img
                    src={groupAvatarUrl}
                    alt=""
                    className="w-32 h-32 rounded-full border-4 border-white/5 shadow-2xl relative z-10 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-white/5 shadow-2xl relative z-10 flex items-center justify-center text-white text-3xl font-bold">
                    {groupTitle?.[0]}
                  </div>
                )}
              </div>
              <div className="text-center z-10">
                <h2 className="text-white text-2xl font-bold tracking-tight">{groupTitle}</h2>
                <p className="mt-2 text-sm font-semibold tracking-widest uppercase opacity-70 text-blue-400">
                  Cuộc gọi nhóm đang đến từ {remoteUser?.firstName || remoteUser?.first_name || remoteUser?.username}...
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#121212]/90 backdrop-blur-3xl rounded-[30px] border border-white/10 z-50 shadow-2xl">
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
          </div>
        </div>
      );
    }

    const activeRemoteUsers = Object.keys(groupStreams).map(uId => {
      const numId = Number(uId);
      const userObj = groupActiveMembers.find(m => m.id === numId) || 
                      groupConversation?.participants?.find(p => Number(p.id || p.user?.id) === numId) || 
                      { id: numId, first_name: 'Thành viên' };
      const pState = groupParticipantStates[numId] || {};
      return {
        id: numId,
        stream: groupStreams[uId],
        user: userObj,
        isLocal: false,
        isMuted: pState.isMuted || false,
        isVideoOff: pState.isVideoOff || false
      };
    });

    const localVideoItem = {
      id: 'local',
      stream: localStream,
      user: me,
      isLocal: true,
      isMuted,
      isVideoOff
    };

    const allVideos = [localVideoItem, ...activeRemoteUsers];

    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#050505] overflow-hidden font-sans select-none p-6">
        <div className="absolute top-8 left-8 z-30 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
          <span className="text-white font-semibold text-sm">
            Cuộc gọi nhóm: {groupConversation?.title || 'Đang kết nối...'}
          </span>
        </div>

        <div className="w-full max-w-6xl max-h-[75vh] overflow-y-auto grid gap-4 p-2 items-center justify-center grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in zoom-in duration-350">
          {allVideos.map((video) => (
            <GroupVideoCard key={video.id} videoItem={video} />
          ))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#121212]/90 backdrop-blur-3xl rounded-[30px] border border-white/10 z-50 shadow-2xl">
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
            onClick={endCall}
            className="w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-500/30 cursor-pointer"
          >
            <PhoneOff className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>
    );
  }

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
          onTouchStart={handleTouchStart}
          style={{
            right: `${pos.x}px`,
            bottom: `${pos.y}px`,
            width: 'clamp(120px, 28vw, 208px)',
            aspectRatio: localAspect
          }}
          className={`absolute bg-black/60 backdrop-blur-2xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-[60] group cursor-move ${callState === 'active' ? 'scale-100' : 'scale-105'}`}
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
              onLoadedMetadata={(e) => {
                const v = e.target;
                if (v.videoWidth && v.videoHeight) {
                  setLocalAspect(v.videoWidth / v.videoHeight);
                }
              }}
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
