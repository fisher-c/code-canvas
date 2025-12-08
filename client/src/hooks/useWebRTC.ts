import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface WebRTCProps {
    sessionId: string;
    socket: Socket | null;
    isEnabled: boolean;
}

interface PeerConnection {
    peerId: string;
    connection: RTCPeerConnection;
    stream?: MediaStream;
}

export function useWebRTC({ sessionId, socket, isEnabled }: WebRTCProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<PeerConnection[]>([]);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);

    // Initialize local media stream
    useEffect(() => {
        if (!isEnabled) {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }
            // Close all peer connections
            peersRef.current.forEach(pc => pc.close());
            peersRef.current.clear();
            setPeers([]);
            return;
        }

        const startLocalStream = async () => {
            if (localStreamRef.current) return; // Already have stream

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                localStreamRef.current = stream;
                setLocalStream(stream);
            } catch (err) {
                console.error('Failed to get local stream:', err);
            }
        };

        startLocalStream();

        return () => {
            if (localStreamRef.current && !isEnabled) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isEnabled]);

    // Join room when socket is available and enabled
    useEffect(() => {
        if (isEnabled && socket && sessionId) {
            socket.emit('join-room', { sessionId });
        }
    }, [isEnabled, socket, sessionId]);


    // Handle WebRTC signaling
    useEffect(() => {
        if (!socket || !isEnabled) return;

        const createPeerConnection = (peerId: string, initiator: boolean) => {
            if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            });

            peersRef.current.set(peerId, pc);

            // Add local tracks to the connection
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, localStreamRef.current!);
                });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal', {
                        sessionId,
                        to: peerId,
                        signal: { type: 'candidate', candidate: event.candidate }
                    });
                }
            };

            // Handle remote stream
            pc.ontrack = (event) => {
                setPeers(prev => {
                    const existing = prev.find(p => p.peerId === peerId);
                    if (existing) return prev;
                    return [...prev, { peerId, connection: pc, stream: event.streams[0] }];
                });
            };

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    peersRef.current.delete(peerId);
                    setPeers(prev => prev.filter(p => p.peerId !== peerId));
                }
            };

            // Create offer if initiator
            if (initiator) {
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        socket.emit('signal', {
                            sessionId,
                            to: peerId,
                            signal: { type: 'offer', sdp: pc.localDescription }
                        });
                    })
                    .catch(err => console.error('Error creating offer:', err));
            }

            return pc;
        };

        const handlePeerJoined = ({ peerId }: { peerId: string }) => {
            createPeerConnection(peerId, true);
        };

        type SignalPayload =
          | { type: 'offer'; sdp: RTCSessionDescriptionInit }
          | { type: 'answer'; sdp: RTCSessionDescriptionInit }
          | { type: 'candidate'; candidate: RTCIceCandidateInit };

        const handleSignal = async ({ signal, from }: { signal: SignalPayload; from: string }) => {
            const pc = peersRef.current.get(from) || createPeerConnection(from, false);

            try {
                if (signal.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('signal', {
                        sessionId,
                        to: from,
                        signal: { type: 'answer', sdp: pc.localDescription }
                    });
                } else if (signal.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                } else if (signal.type === 'candidate') {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (err) {
                console.error('Error handling signal:', err);
            }
        };

        socket.on('peer-joined', handlePeerJoined);
        socket.on('signal', handleSignal);

        return () => {
            socket.off('peer-joined', handlePeerJoined);
            socket.off('signal', handleSignal);
        };
    }, [socket, isEnabled, sessionId]);

    const toggleAudio = useCallback((enabled: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }, []);

    const toggleVideo = useCallback((enabled: boolean) => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }, []);

    return {
        localStream,
        peers,
        toggleAudio,
        toggleVideo
    };
}
