import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRealtimeSocket } from './RealtimeSocketContext';
import { useAuth } from './AuthContext';
import { messagesApi } from '../api';
import { useMessageBox } from '../components/MessageBox';

const VideoCallContext = createContext(null);

const _dependencies = (() => {
  const servers = [
    {
      urls: [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  if (turnUrl && turnUrl.trim()) {
    servers.push({
      urls: [turnUrl],
      username: import.meta.env.VITE_TURN_USER || "",
      credential: import.meta.env.VITE_TURN_PASS || "",
    });
    console.log("[WebRTC] TURN server configured:", turnUrl);
  } else {
    console.warn("[WebRTC] No TURN server configured — only STUN will be used.");
  }
  return servers;
})();

const ICE_SERVERS = { iceServers: _dependencies };

const safeGetUserMedia = async (constraints, retries = 1) => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new TypeError("Trình duyệt không hỗ trợ thiết bị đa phương tiện hoặc đã chặn quyền truy cập Camera/Mic do trang web không được chạy dưới giao thức bảo mật HTTPS.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (err.name === 'AbortError' && retries > 0) {
      console.warn(`[VideoCall] getUserMedia aborted, retrying in 1s... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return safeGetUserMedia(constraints, retries - 1);
    }
    throw err;
  }
};

export function VideoCallProvider({ children }) {
  const { subscribe, send, isConnected } = useRealtimeSocket();
  const { user: me } = useAuth();
  const { show: showMessage } = useMessageBox();

  const handleCallError = useCallback((err, defaultPrefix = "Lỗi kết nối cuộc gọi") => {
    console.log("[VideoCall] handleCallError:", err);
    if (err.message && (err.message.includes("máy chủ") || err.message.includes("kết nối") || err.message.includes("socket") || err.message.includes("mạng"))) {
      showMessage({
        status: "error",
        title: "Lỗi kết nối mạng",
        message: err.message,
        duration: 8000
      });
      return;
    }

    let msg = "Không thể truy cập Máy ảnh (Camera) hoặc Mic của bạn.";
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      msg = "Bạn đã từ chối quyền truy cập Camera/Microphone. Vui lòng bật quyền truy cập camera/micro trong cài đặt trình duyệt để thực hiện cuộc gọi.";
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      msg = "Không tìm thấy thiết bị Camera hoặc Microphone trên máy tính/điện thoại của bạn.";
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      msg = "Camera hoặc Microphone đang bị sử dụng bởi một ứng dụng khác (ví dụ: Zoom, Teams, Skype, hoặc tab trình duyệt khác). Vui lòng tắt ứng dụng đó và thử lại.";
    } else if (err.name === 'AbortError') {
      msg = "Không thể khởi động camera/mic do hết thời gian chờ (Timeout starting video source). Vui lòng thử lại hoặc khởi động lại thiết bị.";
    } else {
      msg += ` (Chi tiết: ${err.message || err.name || err})`;
    }
    showMessage({
      status: "error",
      title: defaultPrefix,
      message: msg,
      duration: 10000
    });
  }, [showMessage]);

  const [callState, setCallState] = useState('idle'); // idle, outgoing, incoming, active, no_answer
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteIsMuted, setRemoteIsMuted] = useState(false);
  const [remoteIsVideoOff, setRemoteIsVideoOff] = useState(false);

  // --- Group Call State ---
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [groupCallState, setGroupCallState] = useState('idle'); // idle, incoming, active
  const [groupStreams, setGroupStreams] = useState({}); // { [userId]: MediaStream }
  const [groupConversation, setGroupConversation] = useState(null);
  const [groupActiveMembers, setGroupActiveMembers] = useState([]); // [ { id, username, ... } ]
  const [groupParticipantStates, setGroupParticipantStates] = useState({}); // { [userId]: { isMuted, isVideoOff } }
  const [activeGroupCalls, setActiveGroupCalls] = useState({}); // { [conversationId]: [userId1, userId2, ...] }


  const activeConversationIdRef = useRef(null);
  const groupConversationRef = useRef(null);
  const startTimeRef = useRef(null);
  const groupStartTimeRef = useRef(null);
  const ringingStartTimeRef = useRef(null);
  const isCallerRef = useRef(false);

  const pcRef = useRef(null);
  const groupPCsRef = useRef({}); // { [userId]: RTCPeerConnection }
  const pendingGroupCandidates = useRef({}); // { [userId]: [RTCIceCandidate] }
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const timeoutRef = useRef(null);

  // Audio refs - Using the correct ringtone for both sides
  const callingAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'));
  const ringingAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'));

  useEffect(() => {
    callingAudio.current.loop = true;
    ringingAudio.current.loop = true;
  }, []);

  useEffect(() => {
    groupConversationRef.current = groupConversation;
  }, [groupConversation]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    Object.values(groupPCsRef.current).forEach(pc => {
      if (pc) pc.close();
    });
    groupPCsRef.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    callingAudio.current.pause();
    callingAudio.current.currentTime = 0;
    ringingAudio.current.pause();
    ringingAudio.current.currentTime = 0;

    setLocalStream(null);
    setRemoteStream(null);
    setRemoteUser(null);
    setCallState('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    setRemoteIsMuted(false);
    setRemoteIsVideoOff(false);

    // Remove ourselves from activeGroupCalls locally when leaving
    const convId = activeConversationIdRef.current;
    const myId = Number(me?.id);
    if (convId && myId) {
      setActiveGroupCalls(prev => {
        const currentList = prev[convId] || [];
        const nextList = currentList.filter(id => Number(id) !== myId);
        const nextState = { ...prev };
        if (nextList.length === 0) {
          delete nextState[convId];
        } else {
          nextState[convId] = nextList;
        }
        return nextState;
      });
    }

    activeConversationIdRef.current = null;
    startTimeRef.current = null;
    groupStartTimeRef.current = null;
    isCallerRef.current = false;
    pendingCandidates.current = [];

    // Reset group states
    setIsGroupCall(false);
    setGroupCallState('idle');
    setGroupStreams({});
    setGroupConversation(null);
    setGroupActiveMembers([]);
    setGroupParticipantStates({});
    pendingGroupCandidates.current = {};
  }, [me]);

  const createPeerConnection = useCallback((recipientId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[VideoCall] Local ICE Candidate:", event.candidate.candidate);
        send('call.signaling', {
          recipientId,
          data: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[VideoCall] ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        pc.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'transport') {
              const pair = stats.get(report.selectedCandidatePairId);
              if (pair) {
                const local = stats.get(pair.localCandidateId);
                const type = local?.candidateType;
                const ip = local?.address || local?.ip;
                console.warn(`[WebRTC] KẾT NỐI THÀNH CÔNG!`);
                console.warn(`[WebRTC] Loại đường truyền: ${type?.toUpperCase()}`);
                console.warn(`[WebRTC] IP đang dùng: ${ip}`);

                if (type === 'relay') {
                  console.warn("[WebRTC] Đang sử dụng TURN SERVER để chuyển tiếp dữ liệu (Khác mạng + Tường lửa gắt).");
                } else if (type === 'srflx') {
                  console.warn("[WebRTC] Đang kết nối P2P trực tiếp qua IP Public (STUN).");
                } else if (type === 'prflx') {
                  console.warn("[WebRTC] Đang kết nối P2P trực tiếp qua IP Public động (Peer-Reflexive).");
                } else if (type === 'host') {
                  console.warn("[WebRTC] Đang kết nối nội bộ (Mạng LAN/WiFi).");
                } else {
                  console.warn(`[WebRTC] Kết nối qua đường truyền khác: ${type?.toUpperCase()}`);
                }
              }
            }
          });
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      console.log("[VideoCall] Peer Connection State:", pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        console.log("[VideoCall] Peer disconnected suddenly");
        cleanup();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [send, cleanup]);

  const createGroupPeerConnection = useCallback((targetUserId, conversationId) => {
    console.log("[GroupCall] Creating RTCPeerConnection for user:", targetUserId);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send('call.signaling', {
          recipientId: targetUserId,
          data: {
            type: 'group-candidate',
            candidate: event.candidate,
            senderId: me.id,
            conversationId
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("[GroupCall] Got remote track from user:", targetUserId, event.streams[0]);
      setGroupStreams(prev => ({
        ...prev,
        [targetUserId]: event.streams[0]
      }));
    };

    pc.onconnectionstatechange = () => {
      console.log(`[GroupCall] PC State with User ${targetUserId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        console.log(`[GroupCall] PC with User ${targetUserId} closed/failed`);
        setGroupStreams(prev => {
          const next = { ...prev };
          delete next[targetUserId];
          return next;
        });
        setGroupActiveMembers(prev => prev.filter(m => Number(m?.id) !== Number(targetUserId)));
        if (groupPCsRef.current[targetUserId]) {
          try {
            groupPCsRef.current[targetUserId].close();
          } catch(e) {}
          delete groupPCsRef.current[targetUserId];
        }
      }
    };

    groupPCsRef.current[targetUserId] = pc;
    return pc;
  }, [send, me]);

  // Helper to increase audio bitrate in SDP
  const setAudioBitrate = (sdp) => {
    // Ensure there's a space after 111 and append our high-quality parameters
    return sdp.replace(/a=fmtp:111 (.*)/, "a=fmtp:111 $1;maxaveragebitrate=128000;stereo=1;sprop-stereo=1;");
  };

  const saveCallLog = useCallback(async (type, duration = 0, force = false) => {
    const cid = activeConversationIdRef.current;
    const caller = isCallerRef.current;

    console.log("[VideoCall] Attempting to save log:", { type, cid, caller, duration, force });

    if (!force && (!caller || !cid)) {
      console.warn("[VideoCall] Skip logging: criteria not met", { caller, cid });
      return;
    }

    try {
      let content = "";
      if (type === 'missed') content = `[CALL_MISSED] ${duration}`;
      else if (type === 'ended') content = `[CALL_ENDED] ${duration}`;

      if (content) {
        console.log("[VideoCall] Calling messagesApi.create...", { cid, content });
        const response = await messagesApi.create({ conversationId: cid, content });
        console.log("[VideoCall] Log saved successfully:", response);
      }
    } catch (err) {
      console.error("[VideoCall] Failed to save call log API error:", err);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (callState !== 'idle' && remoteUser) {
        send('call.signaling', {
          recipientId: remoteUser.id,
          data: { type: 'hangup' }
        });

        // Also save log before the page is gone
        if (startTimeRef.current) {
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          saveCallLog('ended', duration);
        } else {
          const ringDuration = ringingStartTimeRef.current
            ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
            : 0;
          saveCallLog('missed', ringDuration);
        }
      } else if (isGroupCall) {
        const convId = activeConversationIdRef.current;
        const participants = groupConversation?.participants || [];
        const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
        
        otherParticipants.forEach(p => {
          const pId = Number(p.id || p.user?.id);
          if (pId) {
            send('call.signaling', {
              recipientId: pId,
              data: {
                type: 'group-call-leave',
                conversationId: convId,
                senderId: me?.id
              }
            });
          }
        });

        if (groupActiveMembers.length === 0 && groupStartTimeRef.current) {
          const duration = Math.floor((Date.now() - groupStartTimeRef.current) / 1000);
          saveCallLog('ended', duration, true);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callState, remoteUser, send, isGroupCall, groupConversation, me, saveCallLog, groupActiveMembers]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);

        if (isGroupCall) {
          const participants = groupConversation?.participants || [];
          const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
          otherParticipants.forEach(p => {
            const pId = Number(p.id || p.user?.id);
            if (pId) {
              send('call.signaling', {
                recipientId: pId,
                data: {
                  type: 'group-toggle-audio',
                  isMuted: newMuted,
                  senderId: me?.id
                }
              });
            }
          });
        } else if (remoteUser) {
          send('call.signaling', {
            recipientId: remoteUser.id,
            data: { type: 'toggle-audio', isMuted: newMuted }
          });
        }
      }
    }
  }, [isGroupCall, groupConversation, remoteUser, send, me]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOff = !videoTrack.enabled;
        setIsVideoOff(newVideoOff);

        if (isGroupCall) {
          const participants = groupConversation?.participants || [];
          const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
          otherParticipants.forEach(p => {
            const pId = Number(p.id || p.user?.id);
            if (pId) {
              send('call.signaling', {
                recipientId: pId,
                data: {
                  type: 'group-toggle-video',
                  isVideoOff: newVideoOff,
                  senderId: me?.id
                }
              });
            }
          });
        } else if (remoteUser) {
          send('call.signaling', {
            recipientId: remoteUser.id,
            data: { type: 'toggle-video', isVideoOff: newVideoOff }
          });
        }
      }
    }
  }, [isGroupCall, groupConversation, remoteUser, send, me]);

  const queryGroupCallStatus = useCallback((conversationId, conversationData) => {
    if (!conversationData) return;
    const participants = conversationData.participants || [];
    const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
    
    otherParticipants.forEach(p => {
      const pId = Number(p.id || p.user?.id);
      if (pId) {
        send('call.signaling', {
          recipientId: pId,
          data: {
            type: 'group-call-query',
            conversationId
          }
        });
      }
    });
  }, [send, me]);

  const joinGroupCall = useCallback(async (conversationId, conversationData) => {
    if (!conversationData) return;
    if (!isConnected()) {
      showMessage({
        status: "error",
        title: "Lỗi kết nối",
        message: "Không thể tham gia cuộc gọi nhóm do không có kết nối với máy chủ thời gian thực. Vui lòng kiểm tra lại kết nối mạng.",
        duration: 5000
      });
      return;
    }
    try {
      setActiveGroupCalls(prev => {
        const currentList = prev[conversationId] || [];
        const myId = Number(me?.id);
        if (myId && !currentList.includes(myId)) {
          return { ...prev, [conversationId]: [...currentList, myId] };
        }
        return prev;
      });
      setIsGroupCall(true);
      setGroupCallState('active');
      setGroupConversation(conversationData);
      activeConversationIdRef.current = conversationId;
      groupStartTimeRef.current = Date.now();

      const stream = await safeGetUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const participants = conversationData.participants || [];
      const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
      let sentAny = false;
      otherParticipants.forEach(p => {
        const pId = Number(p.id || p.user?.id);
        if (pId) {
          const sent = send('call.signaling', {
            recipientId: pId,
            data: {
              type: 'group-call-join',
              conversationId,
              sender: me
            }
          });
          if (sent) sentAny = true;
        }
      });
      if (otherParticipants.length > 0 && !sentAny) {
        throw new Error("Không thể gửi yêu cầu tham gia tới các thành viên nhóm. Vui lòng kiểm tra kết nối mạng.");
      }
    } catch (err) {
      console.error("[VideoCall] Failed to join group call:", err);
      handleCallError(err);
      cleanup();
    }
  }, [me, send, cleanup, isConnected, showMessage, handleCallError]);

  const startCall = useCallback(async (targetUser, conversationId, isGroup = false, conversationData = null) => {
    console.log("[VideoCall] Starting call. targetUser:", targetUser, "Conversation ID:", conversationId, "isGroup:", isGroup);
    if (!isConnected()) {
      showMessage({
        status: "error",
        title: "Lỗi kết nối",
        message: "Không thể bắt đầu cuộc gọi do không có kết nối với máy chủ thời gian thực. Vui lòng kiểm tra lại kết nối mạng.",
        duration: 5000
      });
      return;
    }
    if (isGroup) {
      if (!conversationData) {
        console.error("[VideoCall] conversationData is required for group calls");
        return;
      }
      try {
        setActiveGroupCalls(prev => {
          const currentList = prev[conversationId] || [];
          const myId = Number(me?.id);
          if (myId && !currentList.includes(myId)) {
            return { ...prev, [conversationId]: [...currentList, myId] };
          }
          return prev;
        });
        setIsGroupCall(true);
        setGroupCallState('active');
        setGroupConversation(conversationData);
        activeConversationIdRef.current = conversationId;
        isCallerRef.current = true;
        groupStartTimeRef.current = Date.now();

        const stream = await safeGetUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const participants = conversationData.participants || [];
        const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me.id);
        
        let sentAny = false;
        otherParticipants.forEach(p => {
          const pId = Number(p.id || p.user?.id);
          if (pId) {
            const sent = send('call.signaling', {
              recipientId: pId,
              data: {
                type: 'group-call-invite',
                conversationId,
                conversation: conversationData,
                sender: me
              }
            });
            if (sent) sentAny = true;
          }
        });
        if (otherParticipants.length > 0 && !sentAny) {
          throw new Error("Không thể gửi lời mời cuộc gọi tới các thành viên nhóm. Vui lòng kiểm tra kết nối mạng.");
        }
      } catch (err) {
        console.error("[VideoCall] Failed to start group call:", err);
        handleCallError(err);
        cleanup();
      }
      return;
    }

    if (!targetUser?.id) {
      console.error("[VideoCall] Target user ID is missing");
      return;
    }
    try {
      activeConversationIdRef.current = conversationId;
      isCallerRef.current = true;
      ringingStartTimeRef.current = Date.now();
      console.log("[VideoCall] Set activeConversationIdRef to:", activeConversationIdRef.current);
      
      // Update UI state immediately to show the calling modal
      setRemoteUser(targetUser);
      setCallState('outgoing');

      const stream = await safeGetUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("[VideoCall] Media stream obtained");
      localStreamRef.current = stream;
      setLocalStream(stream);

      callingAudio.current.play().catch(e => console.warn("Audio play blocked", e));

      // Auto hangup after 30s
      timeoutRef.current = setTimeout(() => {
        console.log("[VideoCall] Call timed out (no answer)");
        setCallState('no_answer');
        callingAudio.current.pause();

        // Notify the recipient to stop ringing and close modal
        send('call.signaling', {
          recipientId: targetUser.id,
          data: { type: 'hangup' }
        });

        const ringDuration = ringingStartTimeRef.current
          ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
          : 0;
        saveCallLog('missed', ringDuration);

        // Give time for user to see the message before closing
        setTimeout(() => cleanup(), 3000);
      }, 30000);

      const pc = createPeerConnection(targetUser.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      offer.sdp = setAudioBitrate(offer.sdp);
      await pc.setLocalDescription(offer);

      console.log("[VideoCall] Sending offer to recipient:", targetUser.id);
      const sent = send('call.signaling', {
        recipientId: targetUser.id,
        data: { type: 'offer', offer, sender: me }
      });
      if (!sent) {
        throw new Error("Không thể gửi yêu cầu cuộc gọi. Vui lòng kiểm tra kết nối mạng của bạn.");
      }
    } catch (err) {
      console.error("[VideoCall] Failed to start call:", err);
      handleCallError(err);
      cleanup();
    }
  }, [createPeerConnection, me, send, cleanup, isConnected, showMessage, handleCallError]);

  const acceptCall = useCallback(async () => {
    if (!isConnected()) {
      showMessage({
        status: "error",
        title: "Lỗi kết nối",
        message: "Không thể nhận cuộc gọi do không có kết nối với máy chủ thời gian thực. Vui lòng kiểm tra lại kết nối mạng.",
        duration: 5000
      });
      return;
    }
    if (isGroupCall) {
      try {
        ringingAudio.current.pause();
        ringingAudio.current.currentTime = 0;

        const stream = await safeGetUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setGroupCallState('active');
        groupStartTimeRef.current = Date.now();

        const convId = activeConversationIdRef.current;
        const participants = groupConversation?.participants || [];
        const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me.id);
        
        let sentAny = false;
        otherParticipants.forEach(p => {
          const pId = Number(p.id || p.user?.id);
          if (pId) {
            const sent = send('call.signaling', {
              recipientId: pId,
              data: {
                type: 'group-call-join',
                conversationId: convId,
                sender: me
              }
            });
            if (sent) sentAny = true;
          }
        });
        if (otherParticipants.length > 0 && !sentAny) {
          throw new Error("Không thể gửi yêu cầu tham gia tới các thành viên nhóm. Vui lòng kiểm tra kết nối mạng.");
        }
      } catch (err) {
        console.error("[GroupCall] Failed to accept group call:", err);
        handleCallError(err);
        cleanup();
      }
      return;
    }

    if (!remoteUser) return;
    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const stream = await safeGetUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallState('active');

      ringingAudio.current.pause();

      const pc = pcRef.current;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      answer.sdp = setAudioBitrate(answer.sdp);
      await pc.setLocalDescription(answer);

      const sent = send('call.signaling', {
        recipientId: remoteUser.id,
        data: { type: 'answer', answer }
      });
      if (!sent) {
        throw new Error("Không thể gửi phản hồi cuộc gọi. Vui lòng kiểm tra kết nối mạng của bạn.");
      }

      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("[WebRTC] Lỗi nạp ICE Candidate tạm thời:", e);
        }
      }
    } catch (err) {
      console.error("Failed to accept call:", err);
      handleCallError(err);
      cleanup();
    }
  }, [remoteUser, cleanup, send, isGroupCall, groupConversation, me, isConnected, showMessage, handleCallError]);

  const rejectCall = useCallback(() => {
    console.log("[VideoCall] rejectCall triggered");
    if (isGroupCall) {
      cleanup();
      return;
    }
    if (remoteUser) {
      send('call.signaling', {
        recipientId: remoteUser.id,
        data: { type: 'reject' }
      });
    }
    const ringDuration = ringingStartTimeRef.current
      ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
      : 0;
    saveCallLog('missed', ringDuration);
    cleanup();
  }, [remoteUser, send, cleanup, saveCallLog, isGroupCall]);

  const endCall = useCallback(() => {
    console.log("[VideoCall] endCall triggered by user");
    if (isGroupCall) {
      const convId = activeConversationIdRef.current;
      const participants = groupConversation?.participants || [];
      const otherParticipants = participants.filter(p => Number(p.id || p.user?.id) !== me?.id);
      
      otherParticipants.forEach(p => {
        const pId = Number(p.id || p.user?.id);
        if (pId) {
          send('call.signaling', {
            recipientId: pId,
            data: {
              type: 'group-call-leave',
              conversationId: convId,
              senderId: me?.id
            }
          });
        }
      });

      if (groupActiveMembers.length === 0 && groupStartTimeRef.current) {
        const duration = Math.floor((Date.now() - groupStartTimeRef.current) / 1000);
        saveCallLog('ended', duration, true);
      }
      cleanup();
      return;
    }

    if (remoteUser) {
      send('call.signaling', {
        recipientId: remoteUser.id,
        data: { type: 'hangup' }
      });
    }

    if (startTimeRef.current) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      console.log("[VideoCall] Call was active, duration:", duration);
      saveCallLog('ended', duration);
    } else {
      console.log("[VideoCall] Call was not active, marking as missed");
      const ringDuration = ringingStartTimeRef.current
        ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
        : 0;
      saveCallLog('missed', ringDuration);
    }
    cleanup();
  }, [remoteUser, send, cleanup, saveCallLog, isGroupCall, groupConversation, me, groupStreams]);

  useEffect(() => {
    const unsub = subscribe('call.signaling', async (payload) => {
      const { senderId, data } = payload;

      if (groupCallState === 'active' && data?.type && data.type.startsWith('group-') && data.type !== 'group-call-leave' && data.type !== 'group-call-invite' && data.type !== 'group-call-query' && data.type !== 'group-call-active-reply') {
        setGroupActiveMembers(prev => {
          const sId = Number(senderId);
          if (prev.some(m => Number(m.id) === sId)) return prev;
          const participantObj = groupConversationRef.current?.participants?.find(p => Number(p.user?.id || p.id) === sId);
          const userObj = participantObj?.user || participantObj || { id: sId };
          return [...prev, userObj];
        });
      }

      switch (data.type) {
        // --- Group Call Cases ---
        case 'group-call-query':
          if (groupCallState === 'active' && Number(activeConversationIdRef.current) === Number(data.conversationId)) {
            const activeIds = Array.from(new Set([
              Number(me?.id),
              ...groupActiveMembers.map(m => Number(m.id || m.user?.id))
            ].filter(Boolean)));
            send('call.signaling', {
              recipientId: senderId,
              data: {
                type: 'group-call-active-reply',
                conversationId: data.conversationId,
                activeMembers: activeIds
              }
            });
          }
          break;

        case 'group-call-active-reply':
          setActiveGroupCalls(prev => ({
            ...prev,
            [data.conversationId]: data.activeMembers
          }));
          break;

        case 'group-call-invite':
          setActiveGroupCalls(prev => {
            const currentList = prev[data.conversationId] || [];
            const sId = Number(senderId);
            if (sId && !currentList.includes(sId)) {
              return { ...prev, [data.conversationId]: [...currentList, sId] };
            }
            return prev;
          });

          if (callState !== 'idle' || groupCallState !== 'idle') {
            // Already in a call, ignore
            return;
          }
          setIsGroupCall(true);
          setGroupCallState('incoming');
          setGroupConversation(data.conversation);
          activeConversationIdRef.current = data.conversationId;
          setGroupActiveMembers([data.sender]);
          setRemoteUser(data.sender);
          ringingAudio.current.play().catch(e => console.warn("Ringing play blocked", e));
          break;

        case 'group-call-join':
          setActiveGroupCalls(prev => {
            const currentList = prev[data.conversationId] || [];
            const sId = Number(senderId);
            if (currentList.includes(sId)) return prev;
            return {
              ...prev,
              [data.conversationId]: [...currentList, sId]
            };
          });

          if (groupCallState === 'active' && localStreamRef.current) {
            setGroupActiveMembers(prev => {
              const sId = Number(senderId);
              if (prev.some(m => Number(m.id) === sId)) return prev;
              return [...prev, data.sender];
            });

            if (groupPCsRef.current[senderId]) {
              groupPCsRef.current[senderId].close();
            }

            const pc = createGroupPeerConnection(senderId, data.conversationId);
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

            const offer = await pc.createOffer();
            offer.sdp = setAudioBitrate(offer.sdp);
            await pc.setLocalDescription(offer);

            send('call.signaling', {
              recipientId: senderId,
              data: {
                type: 'group-offer',
                offer,
                senderId: me.id,
                conversationId: data.conversationId
              }
            });
          }
          break;

        case 'group-offer':
          if (localStreamRef.current) {
            let pc = groupPCsRef.current[senderId];
            if (pc) {
              pc.close();
            }
            pc = createGroupPeerConnection(senderId, data.conversationId);
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await pc.createAnswer();
            answer.sdp = setAudioBitrate(answer.sdp);
            await pc.setLocalDescription(answer);

            send('call.signaling', {
              recipientId: senderId,
              data: {
                type: 'group-answer',
                answer,
                senderId: me.id,
                conversationId: data.conversationId
              }
            });

            const candidates = pendingGroupCandidates.current[senderId] || [];
            while (candidates.length > 0) {
              const candidate = candidates.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("[WebRTC] Lỗi nạp Group ICE Candidate từ hàng đợi offer:", e);
              }
            }
          }
          break;

        case 'group-answer':
          if (groupPCsRef.current[senderId]) {
            const pc = groupPCsRef.current[senderId];
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

            const candidates = pendingGroupCandidates.current[senderId] || [];
            while (candidates.length > 0) {
              const candidate = candidates.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("[WebRTC] Lỗi nạp Group ICE Candidate từ hàng đợi answer:", e);
              }
            }
          }
          break;

        case 'group-candidate':
          {
            const pc = groupPCsRef.current[senderId];
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.error("[WebRTC] Lỗi nạp Group ICE Candidate trực tiếp:", e);
              }
            } else {
              if (!pendingGroupCandidates.current[senderId]) {
                pendingGroupCandidates.current[senderId] = [];
              }
              pendingGroupCandidates.current[senderId].push(data.candidate);
            }
          }
          break;

        case 'group-call-leave':
          setActiveGroupCalls(prev => {
            const currentList = prev[data.conversationId] || [];
            const nextList = currentList.filter(id => Number(id) !== Number(senderId));
            const nextState = { ...prev };
            if (nextList.length === 0) {
              delete nextState[data.conversationId];
            } else {
              nextState[data.conversationId] = nextList;
            }
            return nextState;
          });

          if (groupPCsRef.current[senderId]) {
            try {
              groupPCsRef.current[senderId].close();
            } catch(e) {}
            delete groupPCsRef.current[senderId];
          }
          setGroupStreams(prev => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
          setGroupActiveMembers(prev => prev.filter(m => Number(m?.id) !== Number(senderId)));
          setGroupParticipantStates(prev => {
            const next = { ...prev };
            delete next[senderId];
            return next;
          });
          break;

        case 'group-toggle-audio':
          setGroupParticipantStates(prev => ({
            ...prev,
            [senderId]: {
              ...prev[senderId],
              isMuted: data.isMuted
            }
          }));
          break;

        case 'group-toggle-video':
          setGroupParticipantStates(prev => ({
            ...prev,
            [senderId]: {
              ...prev[senderId],
              isVideoOff: data.isVideoOff
            }
          }));
          break;

        // --- Original 1-1 Cases ---
        case 'offer':
          if (callState !== 'idle') {
            send('call.signaling', { recipientId: senderId, data: { type: 'busy' } });
            return;
          }
          setRemoteUser(data.sender);
          setCallState('incoming');
          ringingAudio.current.play().catch(e => console.warn("Audio play blocked", e));

          const pc1_1 = createPeerConnection(senderId);
          await pc1_1.setRemoteDescription(new RTCSessionDescription(data.offer));
          break;

        case 'answer':
          if (pcRef.current) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            callingAudio.current.pause();
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallState('active');
            startTimeRef.current = Date.now();

            // Sửa lỗi: Nạp các ICE candidate tạm thời đã nhận được trước khi set remote description thành công
            while (pendingCandidates.current.length > 0) {
              const candidate = pendingCandidates.current.shift();
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("[WebRTC] Lỗi nạp ICE Candidate tạm thời:", e);
              }
            }
          }
          break;

        case 'candidate':
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
              console.error("[WebRTC] Lỗi nạp ICE Candidate trực tiếp:", e);
            }
          } else {
            pendingCandidates.current.push(data.candidate);
          }
          break;

        case 'reject':
        case 'busy':
          if (data.type === 'reject') {
            const ringDuration = ringingStartTimeRef.current
              ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
              : 0;
            saveCallLog('missed', ringDuration);
          }
          cleanup();
          break;
        case 'hangup':
          if (startTimeRef.current) {
            const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
            saveCallLog('ended', duration);
          } else {
            const ringDuration = ringingStartTimeRef.current
              ? Math.floor((Date.now() - ringingStartTimeRef.current) / 1000)
              : 0;
            saveCallLog('missed', ringDuration);
          }
          cleanup();
          break;

        case 'toggle-audio':
          setRemoteIsMuted(data.isMuted);
          break;

        case 'toggle-video':
          setRemoteIsVideoOff(data.isVideoOff);
          break;

        default:
          break;
      }
    });

    return unsub;
  }, [subscribe, callState, groupCallState, createPeerConnection, createGroupPeerConnection, send, cleanup, saveCallLog, me]);

  useEffect(() => {
    if (callState !== 'idle' || groupCallState !== 'idle') {
      const backgroundVideos = document.querySelectorAll("video");
      backgroundVideos.forEach((vid) => {
        if (vid.getAttribute("data-keep-playing") !== "true") {
          vid.pause();
        }
      });
    }
  }, [callState, groupCallState]);

  return (
    <VideoCallContext.Provider value={{
      callState,
      remoteUser,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      remoteIsMuted,
      remoteIsVideoOff,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleAudio,
      toggleVideo,
      // Group call states
      isGroupCall,
      groupCallState,
      groupStreams,
      groupConversation,
      groupActiveMembers,
      groupParticipantStates,
      activeGroupCalls,
      queryGroupCallStatus,
      joinGroupCall
    }}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) throw new Error("useVideoCall must be used within a VideoCallProvider");
  return context;
}
