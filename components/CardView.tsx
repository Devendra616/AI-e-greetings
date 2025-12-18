
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedCard, GreetingDetails } from '../types';
import { decodeBase64, decodeAudioData } from '../geminiService';
import { toPng } from 'html-to-image';

interface Props {
  card: GeneratedCard;
  details: GreetingDetails;
  onReset: () => void;
}

const CardView: React.FC<Props> = ({ card, details, onReset }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  
  // Audio state
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const formattedDate = formatDate(details.date);

  // Initialize Audio Buffer
  useEffect(() => {
    if (card.audioBase64) {
      const initAudio = async () => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(card.audioBase64!);
        const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
        setAudioBuffer(buffer);
        setAudioDuration(buffer.duration);
        audioCtxRef.current = ctx;
      };
      initAudio();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioSourceRef.current) audioSourceRef.current.stop();
    };
  }, [card.audioBase64]);

  // Handle Playback Progress Tracking
  const updateProgress = () => {
    if (isPlayingAudio && audioCtxRef.current && audioBuffer) {
      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
      const progress = Math.min((elapsed / audioBuffer.duration) * 100, 100);
      setAudioProgress(progress);
      
      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      }
    }
  };

  const playAudio = () => {
    if (!audioBuffer || !audioCtxRef.current) return;
    
    // Stop previous if playing
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
    }

    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    gainNode.gain.value = audioVolume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    audioSourceRef.current = source;
    gainNodeRef.current = gainNode;
    
    setIsPlayingAudio(true);
    startTimeRef.current = ctx.currentTime;
    source.start(0);
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
    
    source.onended = () => {
      setIsPlayingAudio(false);
      setAudioProgress(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      setIsPlayingAudio(false);
      setAudioProgress(0);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(vol, audioCtxRef.current!.currentTime, 0.05);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlayingVideo(true);
    } else {
      videoRef.current.pause();
      setIsPlayingVideo(false);
    }
  };

  const replayVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlayingVideo(true);
  };

  const handleDownloadFullCardPng = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const originalTransform = cardRef.current.style.transform;
      const originalTransition = cardRef.current.style.transition;
      
      cardRef.current.style.transition = 'none';
      cardRef.current.style.transform = 'none';
      
      const dataUrl = await toPng(cardRef.current, { 
        pixelRatio: 3, 
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0',
          boxShadow: 'none',
          border: 'none'
        }
      });
      
      cardRef.current.style.transform = originalTransform;
      cardRef.current.style.transition = originalTransition;

      const link = document.createElement('a');
      link.download = `bespoke-greeting-${details.recipientName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture card', err);
      alert('Artisanal capture failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadVideo = async () => {
    if (!card.videoUrl) return;
    setIsDownloadingVideo(true);
    try {
      const response = await fetch(card.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinematic-greeting-${details.recipientName.toLowerCase().replace(/\s+/g, '-')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Download failed. Please check your connection.");
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  const shareUrl = window.location.href;
  const shareText = `I just created a bespoke artisanal greeting for ${details.recipientName}! Check out this masterpiece.`;

  const shareLinks = [
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>,
      color: 'bg-[#1877F2]'
    },
    {
      name: 'X',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
      color: 'bg-black'
    },
    {
      name: 'WhatsApp',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.675 1.438 5.662 1.439h.005c6.552 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
      color: 'bg-[#25D366]'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 animate-fade-in printable-card-container overflow-visible">
      <div className="relative group perspective-2500 no-print">
        <div 
          ref={cardRef}
          className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(244,63,94,0.3)] overflow-hidden border-[12px] border-white flex flex-col md:flex-row min-h-[700px] transition-all duration-700 ease-out origin-center"
          style={{ 
            transform: 'rotateY(-8deg) rotateX(2deg) translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Visual Panel (Left) */}
          <div className="w-full md:w-1/2 relative bg-rose-50 group/media overflow-hidden">
            {card.videoUrl ? (
              <div className="w-full h-full relative">
                <video 
                  ref={videoRef}
                  src={card.videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                  onPlay={() => setIsPlayingVideo(true)}
                  onPause={() => setIsPlayingVideo(false)}
                />
                
                {/* Manual Video Controls */}
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 z-30">
                  <button 
                    onClick={toggleVideo}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all"
                  >
                    {isPlayingVideo ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={replayVideo}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <img src={card.imageUrl} alt="Greeting Art" className="w-full h-full object-cover" />
            )}
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12 pointer-events-none z-10">
              <div className="text-white">
                <p className="text-xs font-black uppercase tracking-[0.4em] mb-3 text-rose-400 opacity-90">{details.occasion}</p>
                <h2 className="text-5xl font-serif border-l-8 border-rose-500 pl-6 drop-shadow-2xl">
                  {formattedDate}
                </h2>
              </div>
            </div>
          </div>

          {/* Text Panel (Right) */}
          <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-between bg-white relative">
            <div className="absolute top-10 right-10 opacity-[0.04] pointer-events-none">
               <svg className="w-72 h-72 text-rose-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>

            <div className="space-y-10 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.3em] mb-2">Commissioned for</p>
                  <h3 className="text-5xl font-serif text-stone-900 leading-tight">{details.recipientName}</h3>
                </div>
                
                {card.audioBase64 && (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={isPlayingAudio ? stopAudio : playAudio}
                      className={`p-6 rounded-[2rem] transition-all duration-500 relative overflow-hidden ${isPlayingAudio ? 'bg-rose-100 text-rose-400 scale-95' : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-110 shadow-2xl shadow-rose-200'}`}
                    >
                      <svg className={`w-8 h-8 relative z-10 ${isPlayingAudio ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPlayingAudio ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3H6" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} />
                        {isPlayingAudio && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
                      </svg>
                      {isPlayingAudio && (
                        <div 
                          className="absolute bottom-0 left-0 h-1.5 bg-rose-500 transition-all duration-100 ease-linear" 
                          style={{ width: `${audioProgress}%` }}
                        />
                      )}
                    </button>
                    
                    {/* Volume Slider - Artisanal Style */}
                    <div className="group/vol relative flex items-center gap-2">
                       <svg className="w-4 h-4 text-stone-300" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                       <input 
                         type="range" 
                         min="0" 
                         max="1" 
                         step="0.01" 
                         value={audioVolume} 
                         onChange={handleVolumeChange}
                         className="w-20 h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-rose-400"
                       />
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar UI for Audio */}
              {card.audioBase64 && (
                <div className={`transition-all duration-500 overflow-hidden ${isPlayingAudio ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="w-full bg-stone-50 h-2 rounded-full relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-300 to-rose-500 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Narrating...</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                      {Math.floor((audioProgress/100) * audioDuration)}s / {Math.floor(audioDuration)}s
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <span className="absolute -top-6 -left-4 text-6xl text-rose-50 font-serif">"</span>
                <p className="text-stone-700 leading-relaxed font-light italic text-2xl md:text-3xl whitespace-pre-wrap bg-gradient-to-b from-stone-900 to-stone-500 bg-clip-text text-transparent">
                  {card.selectedMessage}
                </p>
                <span className="absolute -bottom-10 -right-2 text-6xl text-rose-50 font-serif">"</span>
              </div>

              <div className="pt-16 border-t-2 border-rose-50">
                <p className="text-rose-300 text-[10px] font-black uppercase tracking-[0.4em] mb-4">With sincere devotion,</p>
                <p className="text-5xl font-serif bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-transparent tracking-tight">{details.senderName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Sharing Suite */}
      <div className="mt-16 flex flex-col items-center no-print">
        <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.4em] mb-6">Share your bespoke creation</p>
        <div className="flex gap-4">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${link.color} text-white p-4 rounded-full shadow-lg hover:scale-110 hover:-translate-y-1 transition-all duration-300`}
              title={`Share on ${link.name}`}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Control Buttons (no-print) */}
      <div className="mt-12 flex flex-wrap gap-6 no-print justify-center items-center">
        <button
          onClick={handleDownloadFullCardPng}
          disabled={isDownloading}
          className="px-10 py-5 bg-white border-2 border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center gap-3 active:scale-95"
        >
          {isDownloading ? (
             <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
          Download Artwork (PNG)
        </button>
        
        {card.videoUrl && (
          <button
            onClick={handleDownloadVideo}
            disabled={isDownloadingVideo}
            className="px-12 py-5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center gap-3 shadow-xl active:scale-95"
          >
            {isDownloadingVideo ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
            Download Masterpiece (MP4)
          </button>
        )}

        <button
          onClick={onReset}
          className="px-12 py-5 bg-stone-900 text-white rounded-full hover:bg-black transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95"
        >
          Craft Another
        </button>
      </div>
    </div>
  );
};

export default CardView;
