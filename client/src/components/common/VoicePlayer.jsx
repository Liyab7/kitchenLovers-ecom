import { useEffect, useRef, useState } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

// Minimal accessible audio-only player. Shows progress via a thin bar.
// Native <audio controls> works too — this gives a tighter visual fit on review cards.
export default function VoicePlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  }

  function seekTo(e) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    a.currentTime = pct * duration;
  }

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-2 bg-primary/5 rounded-full pl-1 pr-3 py-1 max-w-full">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-primary text-white inline-flex items-center justify-center shrink-0"
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <FiPause /> : <FiPlay />}
      </button>
      <div
        className="h-1.5 w-32 sm:w-44 bg-primary/15 rounded-full overflow-hidden cursor-pointer"
        onClick={seekTo}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={progress}
      >
        <div className="h-full bg-primary" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
      </div>
      <span className="text-xs text-ink/60 font-mono tabular-nums shrink-0">
        {fmtTime(progress)}{duration ? ` / ${fmtTime(duration)}` : ''}
      </span>
    </div>
  );
}
