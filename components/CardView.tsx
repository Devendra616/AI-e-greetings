
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedCard, GreetingDetails } from '../types';
import { decodeBase64, decodeAudioData } from '../geminiService';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Helper to format YYYY-MM-DD to DD-MM-YYYY
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMedia = async () => {
    setIsDownloading(true);
    try {
      if (card.videoUrl) {
        const response = await fetch(card.videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `greeting-${details.recipientName}-${details.occasion}.mp4`.toLowerCase().replace(/\s+/g, '-');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const a = document.createElement('a');
        a.href = card.imageUrl;
        a.download = `greeting-${details.recipientName}-${details.occasion}.png`.toLowerCase().replace(/\s+/g, '-');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download interrupted. Please check your connection and try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const shareText = `I created a bespoke artisanal greeting for ${details.recipientName}!`;
  const shareUrl = window.location.href;

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
          className="bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(244,63,94,0.3)] overflow-hidden border-[12px] border-white flex flex-col md:flex-row min-h-[700px] transition-all duration-700 ease-out"
          style={{ 
            transform: 'rotateY(-8deg) rotateX(2deg) translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Visual Panel (Left) */}
          <div className="w-full md:w-1/2 relative bg-rose-50 group/video">
            {card.videoUrl ? (
              <div className="w-full h-full relative overflow-hidden">
                <video 
                  ref={videoRef}
                  src={card.videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-105"
                  onPlay={() => setIsPlayingVideo(true)}
                  onPause={() => setIsPlayingVideo(false)}
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute top-6 left-6 flex gap-2 opacity-0 group-hover/video:opacity-100 transition-opacity duration-300">
                  <button 
                    onClick={toggleVideo}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                  >
                    {isPlayingVideo ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={replayVideo}
                    className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <img src={card.imageUrl} alt="Greeting Art" className="w-full h-full object-cover" />
            )}
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-12 pointer-events-none">
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

      {/* Social Sharing Section (no-print) */}
      <div className="mt-20 flex flex-col items-center no-print">
        <div className="text-center mb-8">
            <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Share your artisanal creation</p>
            <p className="text-stone-500 text-xs italic">For the best experience, download and share the high-quality file.</p>
        </div>
        <div className="flex gap-6">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${link.name}`}
              className={`${link.color} text-white p-5 rounded-full shadow-xl hover:scale-125 hover:-translate-y-2 transition-all duration-500`}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Control Buttons (no-print) */}
      <div className="mt-16 flex flex-wrap gap-8 no-print justify-center items-center">
        <button
          onClick={handlePrint}
          className="px-10 py-5 border-2 border-stone-200 text-stone-600 rounded-full hover:bg-stone-50 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm bg-white/50"
        >
          Export as PDF
        </button>
        
        <button
          onClick={handleDownloadMedia}
          disabled={isDownloading}
          className="px-12 py-5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-full hover:shadow-2xl hover:scale-105 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-rose-100"
        >
          {isDownloading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          )}
          Download {card.videoUrl ? 'Masterpiece (MP4)' : 'Artwork (PNG)'}
        </button>

        <button
          onClick={onReset}
          className="px-12 py-5 bg-stone-900 text-white rounded-full hover:bg-black transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95"
        >
          Craft Another
        </button>
      </div>

      {/* Flat Print Layout (Hidden on screen, shown on print) */}
      <div className="hidden print:flex flex-row h-screen w-full bg-white overflow-hidden">
        <div className="w-1/2 h-full">
           {card.videoUrl ? (
             <div className="h-full w-full bg-rose-50 flex items-center justify-center p-20 text-center">
                <p className="text-stone-400 italic font-serif text-2xl">A cinematic masterpiece awaits your digital presence.</p>
             </div>
           ) : (
             <img src={card.imageUrl} className="w-full h-full object-cover" alt="Art" />
           )}
        </div>
        <div className="w-1/2 h-full p-24 flex flex-col justify-center border-l border-stone-100">
           <p className="text-rose-400 uppercase tracking-[0.5em] font-black text-xs mb-6">{details.occasion}</p>
           <h1 className="text-7xl font-serif text-stone-900 mb-12">{details.recipientName}</h1>
           <p className="text-3xl text-stone-700 font-serif italic leading-relaxed mb-16">{card.selectedMessage}</p>
           <p className="text-4xl font-serif text-stone-900">With love, {details.senderName}</p>
           <div className="mt-24 h-0.5 w-16 bg-rose-200"></div>
           <p className="mt-6 text-stone-300 font-black tracking-widest text-xs">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
};

export default CardView;
