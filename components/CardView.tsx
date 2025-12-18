
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const formattedDate = formatDate(details.date);

  useEffect(() => {
    if (card.audioBase64) {
      const initAudio = async () => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(card.audioBase64!);
        const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
        setAudioBuffer(buffer);
      };
      initAudio();
    }
  }, [card.audioBase64]);

  const playAudio = () => {
    if (!audioBuffer) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    source.start(0);
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
      // Temporarily remove 3D transform for clean capture
      const originalTransform = cardRef.current.style.transform;
      cardRef.current.style.transform = 'none';
      
      const dataUrl = await toPng(cardRef.current, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0'
        }
      });
      
      cardRef.current.style.transform = originalTransform;

      const link = document.createElement('a');
      link.download = `bespoke-greeting-${details.recipientName}.png`;
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
      a.download = `cinematic-greeting-${details.recipientName}.mp4`;
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

            <div className="space-y-12 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.3em] mb-2">Commissioned for</p>
                  <h3 className="text-5xl font-serif text-stone-900 leading-tight">{details.recipientName}</h3>
                </div>
                {card.audioBase64 && (
                  <button
                    onClick={playAudio}
                    disabled={isPlayingAudio}
                    className={`p-6 rounded-[2rem] transition-all duration-500 ${isPlayingAudio ? 'bg-rose-100 text-rose-400 scale-95' : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-110 shadow-2xl shadow-rose-200'}`}
                  >
                    <svg className={`w-10 h-10 ${isPlayingAudio ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={isPlayingAudio ? "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.586A2 2 0 007 16h3.172l3.592 3.592A1 1 0 0015 19V5a1 1 0 00-1.235-.97L10.172 7.628H7a2 2 0 00-1.414.586L5.586 15.586z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"} />
                    </svg>
                  </button>
                )}
              </div>

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

      {/* Control Buttons (no-print) */}
      <div className="mt-16 flex flex-wrap gap-8 no-print justify-center items-center">
        <button
          onClick={handleDownloadFullCardPng}
          disabled={isDownloading}
          className="px-10 py-5 bg-white border-2 border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center gap-3"
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
            className="px-12 py-5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center gap-3 shadow-xl"
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
