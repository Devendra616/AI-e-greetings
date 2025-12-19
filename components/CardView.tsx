
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedCard, GreetingDetails } from '../types';
import { decodeBase64, decodeAudioData } from '../geminiService';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface Props {
  card: GeneratedCard;
  details: GreetingDetails;
  onReset: () => void;
}

const CardView: React.FC<Props> = ({ card, details, onReset }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(card.videoUrl ? true : false);
  const [videoError, setVideoError] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  
  // Audio state
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [audioProgress, setAudioProgress] = useState(0);

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
    // Expected format from FormView is DD-MM-YYYY
    // But we handle YYYY-MM-DD just in case of bypass
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return dateStr;
    
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD-MM-YYYY
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    // Assume it's already DD-MM-YYYY
    return parts.join('-');
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
        audioCtxRef.current = ctx;
      };
      initAudio();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioSourceRef.current) audioSourceRef.current.stop();
    };
  }, [card.audioBase64]);

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
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(vol, audioCtxRef.current.currentTime, 0.05);
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

  const flattenCardForCapture = async () => {
    if (!cardRef.current) return null;
    const originalTransform = cardRef.current.style.transform;
    const originalTransition = cardRef.current.style.transition;
    cardRef.current.style.transition = 'none';
    cardRef.current.style.transform = 'none';
    // Wait for two frames to ensure styles are applied
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 150));
    return () => {
      if (cardRef.current) {
        cardRef.current.style.transition = originalTransition;
        cardRef.current.style.transform = originalTransform;
      }
    };
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setIsDownloadingPng(true);
    const restore = await flattenCardForCapture();
    try {
      const dataUrl = await toPng(cardRef.current, { 
        pixelRatio: 3, 
        backgroundColor: '#ffffff',
        style: { borderRadius: '0', boxShadow: 'none', border: 'none' }
      });
      const link = document.createElement('a');
      link.download = `bespoke-greeting-${details.recipientName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate PNG', err);
      alert('PNG capture failed. Please try again.');
    } finally {
      if (restore) restore();
      setIsDownloadingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsDownloadingPdf(true);
    const restore = await flattenCardForCapture();
    try {
      const width = cardRef.current.offsetWidth;
      const height = cardRef.current.offsetHeight;
      const dataUrl = await toPng(cardRef.current, { 
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        style: { borderRadius: '0', boxShadow: 'none', border: 'none' }
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [width, height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`bespoke-greeting-${details.recipientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      if (restore) restore();
      setIsDownloadingPdf(false);
    }
  };

  const shareMessage = `Check out this artisanal e-greeting I created for ${details.recipientName}! #BespokeGreetings #ArtAndAI`;
  const shareUrl = window.location.href;

  const shareHandlers = {
    twitter: () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    },
    facebook: () => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    },
    whatsapp: () => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage + ' ' + shareUrl)}`, '_blank');
    }
  };

  const Tooltip = ({ text }: { text: string }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-stone-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 font-medium tracking-wide">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 animate-fade-in printable-card-container overflow-visible">
      <div className="relative group perspective-2500 no-print">
        <div 
          ref={cardRef}
          className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(244,63,94,0.3)] overflow-hidden border-[12px] border-white flex flex-col md:flex-row min-h-[700px] transition-all duration-700 ease-out origin-center"
          style={{ transform: 'rotateY(-8deg) rotateX(2deg) translateZ(0)', transformStyle: 'preserve-3d' }}
        >
          {/* Visual Panel (Left) */}
          <div className="w-full md:w-1/2 relative bg-rose-50 group/media overflow-hidden">
            {card.videoUrl && !videoError ? (
              <div className="w-full h-full relative">
                {isVideoLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-rose-50/20 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin"></div>
                    <p className="mt-4 text-xs font-black uppercase tracking-widest text-rose-600">Cinematic Masterpiece Loading...</p>
                  </div>
                )}
                <video 
                  ref={videoRef}
                  src={card.videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className={`w-full h-full object-cover transition-all duration-700 group-hover/media:scale-105 ${isVideoLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  onLoadStart={() => setIsVideoLoading(true)}
                  onPlaying={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                  onError={() => setVideoError(true)}
                />
                <div className={`absolute top-6 right-6 flex gap-2 transition-opacity duration-300 z-30 ${isVideoLoading ? 'opacity-0' : 'opacity-0 group-hover/media:opacity-100'}`}>
                  <button onClick={toggleVideo} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all">
                    {isPlayingVideo ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                 <img src={card.imageUrl} alt="Greeting Art" className="w-full h-full object-cover" />
                 {videoError && (
                    <div className="absolute top-4 left-4 right-4 bg-stone-900/80 backdrop-blur px-4 py-2 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest text-center border border-white/10">
                      Cinematic Playback Unavailable - Showing Static Art
                    </div>
                 )}
              </div>
            )}
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12 pointer-events-none z-10">
              <div className="text-white">
                <p className="text-xs font-black uppercase tracking-[0.4em] mb-3 text-rose-400 opacity-90">{details.occasion}</p>
                <h2 className="text-5xl font-serif border-l-8 border-rose-500 pl-6 drop-shadow-2xl">{formattedDate}</h2>
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
                    <button onClick={isPlayingAudio ? stopAudio : playAudio} className={`p-6 rounded-[2rem] transition-all duration-500 relative overflow-hidden ${isPlayingAudio ? 'bg-rose-100 text-rose-400 scale-95' : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-110 shadow-2xl shadow-rose-200'}`}>
                      <svg className={`w-8 h-8 relative z-10 ${isPlayingAudio ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPlayingAudio ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3H6" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} /></svg>
                    </button>
                    <div className="group/vol relative flex items-center gap-2">
                       <input type="range" min="0" max="1" step="0.01" value={audioVolume} onChange={handleVolumeChange} className="w-20 h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-rose-400" />
                    </div>
                  </div>
                )}
              </div>
              {card.audioBase64 && (
                <div className={`transition-all duration-500 overflow-hidden ${isPlayingAudio ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="w-full bg-stone-50 h-2 rounded-full relative">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-rose-300 to-rose-500 rounded-full transition-all duration-100 ease-linear" style={{ width: `${audioProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="relative">
                <span className="absolute -top-6 -left-4 text-6xl text-rose-50 font-serif">"</span>
                <p className="text-stone-700 leading-relaxed font-light italic text-2xl md:text-3xl whitespace-pre-wrap bg-gradient-to-b from-stone-900 to-stone-500 bg-clip-text text-transparent">{card.selectedMessage}</p>
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

      <div className="mt-12 space-y-8 no-print">
        <div className="flex flex-wrap gap-6 justify-center items-center">
          <div className="relative group">
            <button onClick={() => window.print()} className="px-8 py-5 bg-stone-50 border-2 border-stone-200 text-stone-700 rounded-full hover:bg-stone-100 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center gap-3 active:scale-95">
              Print Card
            </button>
            <Tooltip text="Print this card as landscape stationery." />
          </div>

          <div className="relative group">
            <button onClick={handleDownloadPng} disabled={isDownloadingPng} className="px-8 py-5 bg-rose-50 border-2 border-rose-100 text-rose-700 rounded-full hover:bg-rose-100 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center gap-3 active:scale-95 disabled:opacity-50">
              {isDownloadingPng ? 'Capturing Art...' : 'Download PNG'}
            </button>
            <Tooltip text="Save as a high-resolution image masterpiece." />
          </div>

          <div className="relative group">
            <button onClick={handleDownloadPdf} disabled={isDownloadingPdf} className="px-10 py-5 bg-stone-900 text-white rounded-full hover:bg-black transition-all font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center gap-3 active:scale-95 disabled:opacity-50">
              {isDownloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <Tooltip text="Download a high-resolution PDF for sharing." />
          </div>

          <div className="relative group">
            <button onClick={onReset} className="px-12 py-5 bg-stone-100 text-stone-600 border border-stone-200 rounded-full hover:bg-stone-200 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm active:scale-95">
              Craft Another
            </button>
            <Tooltip text="Start over to create a new masterpiece." />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400">Share the Masterpiece</p>
           <div className="flex gap-4">
              <div className="relative group">
                <button onClick={shareHandlers.twitter} className="p-4 bg-white border border-rose-100 text-stone-900 rounded-full hover:bg-rose-50 transition-all shadow-md active:scale-90">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </button>
                <Tooltip text="Share on Twitter" />
              </div>

              <div className="relative group">
                <button onClick={shareHandlers.facebook} className="p-4 bg-white border border-rose-100 text-stone-900 rounded-full hover:bg-rose-50 transition-all shadow-md active:scale-90">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                <Tooltip text="Share on Facebook" />
              </div>

              <div className="relative group">
                <button onClick={shareHandlers.whatsapp} className="p-4 bg-white border border-rose-100 text-stone-900 rounded-full hover:bg-rose-50 transition-all shadow-md active:scale-90">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.675 1.439 5.662 1.439h.005c6.562 0 11.894-5.335 11.897-11.896a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
                <Tooltip text="Share on WhatsApp" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CardView;
