import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useRealtimeSocket } from './RealtimeSocketContext';
import { useAuth } from './AuthContext';
import { messagesApi } from '../api';

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

export function VideoCallProvider({ children }) {
  const { subscribe, send } = useRealtimeSocket();
  const { user: me } = useAuth();

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
  }, []);

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
                } else {
                  console.warn("[WebRTC] Đang kết nối nội bộ (Mạng LAN/WiFi).");
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

  const startCall = useCallback(async (targetUser, conversationId, isGroup = false, conversationData = null) => {
    console.log("[VideoCall] Starting call. targetUser:", targetUser, "Conversation ID:", conversationId, "isGroup:", isGroup);
    if (isGroup) {
      if (!conversationData) {
        console.error("[VideoCall] conversationData is required for group calls");
        return;
      }
      try {
        setIsGroupCall(true);
        setGroupCallState('active');
        setGroupConversation(conversationData);
        activeConversationIdRef.current = conversationId;
        isCallerRef.current = true;
        groupStartTimeRef.current = Date.now();

        const stream = await navigator.mediaDevices.getUserMedia({
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
        
        otherParticipants.forEach(p => {
          const pId = Number(p.id || p.user?.id);
          if (pId) {
            send('call.signaling', {
              recipientId: pId,
              data: {
                type: 'group-call-invite',
                conversationId,
                conversation: conversationData,
                sender: me
              }
            });
          }
        });
      } catch (err) {
        console.error("[VideoCall] Failed to start group call:", err);
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
      const stream = await navigator.mediaDevices.getUserMedia({
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
      setRemoteUser(targetUser);
      setCallState('outgoing');

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
      send('call.signaling', {
        recipientId: targetUser.id,
        data: { type: 'offer', offer, sender: me }
      });
    } catch (err) {
      console.error("[VideoCall] Failed to start call:", err);
      cleanup();
    }
  }, [createPeerConnection, me, send, cleanup]);

  const acceptCall = useCallback(async () => {
    if (isGroupCall) {
      try {
        ringingAudio.current.pause();
        ringingAudio.current.currentTime = 0;

        const stream = await navigator.mediaDevices.getUserMedia({
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
        
        otherParticipants.forEach(p => {
          const pId = Number(p.id || p.user?.id);
          if (pId) {
            send('call.signaling', {
              recipientId: pId,
              data: {
                type: 'group-call-join',
                conversationId: convId,
                sender: me
              }
            });
          }
        });
      } catch (err) {
        console.error("[GroupCall] Failed to accept group call:", err);
        cleanup();
      }
      return;
    }

    if (!remoteUser) return;
    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({
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

      send('call.signaling', {
        recipientId: remoteUser.id,
        data: { type: 'answer', answer }
      });

      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanup();
    }
  }, [remoteUser, cleanup, send, isGroupCall, groupConversation, me]);

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

      if (data?.type && data.type.startsWith('group-') && data.type !== 'group-call-leave' && data.type !== 'group-call-invite') {
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
        case 'group-call-invite':
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
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
          break;

        case 'group-candidate':
          {
            const pc = groupPCsRef.current[senderId];
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
              if (!pendingGroupCandidates.current[senderId]) {
                pendingGroupCandidates.current[senderId] = [];
              }
              pendingGroupCandidates.current[senderId].push(data.candidate);
            }
          }
          break;

        case 'group-call-leave':
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
          }
          break;

        case 'candidate':
          if (pcRef.current && pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
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
      groupParticipantStates
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
