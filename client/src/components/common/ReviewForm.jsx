import { useEffect, useRef, useState } from 'react';
import {
  FiStar, FiMic, FiSquare, FiPlay, FiPause, FiTrash2, FiImage, FiX, FiSend, FiUpload,
} from 'react-icons/fi';
import { api } from '../../services/api.js';
import toast from 'react-hot-toast';

function StarPicker({ value, onChange }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1.5">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 -m-1"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <FiStar
            className={`text-2xl transition ${n <= value ? 'text-primary fill-current' : 'text-ink/30 hover:text-primary/60'}`}
          />
        </button>
      ))}
    </div>
  );
}

function VoiceRecorder({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [supported] = useState(() => typeof window !== 'undefined' && 'MediaRecorder' in window);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function start() {
    if (!supported) return toast.error('Recording is not supported in this browser. Upload an audio file instead.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        onChange({ blob, durationSec: seconds });
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  function clear() {
    onChange(null);
    setSeconds(0);
    setPlaying(false);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ blob: file, durationSec: 0 });
  }

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); a.onended = () => setPlaying(false); }
  }

  const previewUrl = value?.blob ? URL.createObjectURL(value.blob) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!value ? (
          <>
            {recording ? (
              <button type="button" onClick={stop} className="btn-primary inline-flex items-center gap-2 text-sm">
                <FiSquare /> Stop ({seconds}s)
              </button>
            ) : (
              <button type="button" onClick={start} className="btn-outline inline-flex items-center gap-2 text-sm">
                <FiMic /> Record voice note
              </button>
            )}
            <label className="btn-ghost text-sm inline-flex items-center gap-2 cursor-pointer">
              <FiUpload /> Upload audio
              <input type="file" accept="audio/*" className="hidden" onChange={onFile} />
            </label>
          </>
        ) : (
          <>
            <audio ref={audioRef} src={previewUrl} onPause={() => setPlaying(false)} />
            <button type="button" onClick={togglePlay} className="btn-outline inline-flex items-center gap-2 text-sm">
              {playing ? <FiPause /> : <FiPlay />} {playing ? 'Pause' : 'Play'} preview
            </button>
            <button type="button" onClick={clear} className="btn-ghost text-sm text-danger inline-flex items-center gap-1">
              <FiTrash2 /> Remove
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-ink/50">
        Optional voice note (max 8MB, ~60s). Audio reviews build trust with future buyers.
      </p>
    </div>
  );
}

function PhotoUploader({ photos, onChange }) {
  function onFile(e) {
    const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
    if (!files.length) return;
    onChange([...photos, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    e.target.value = '';
  }
  function removeAt(i) {
    const next = photos.slice();
    next.splice(i, 1);
    onChange(next);
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-ink/10 bg-canvas">
            <img src={p.preview || p.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute -top-1 -right-1 bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              aria-label="Remove"
            >
              <FiX />
            </button>
          </div>
        ))}
        {photos.length < 4 && (
          <label className="w-16 h-16 rounded-md border-2 border-dashed border-ink/20 flex items-center justify-center cursor-pointer hover:border-primary text-ink/40 hover:text-primary">
            <FiImage className="text-xl" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
          </label>
        )}
      </div>
      <p className="text-xs text-ink/50">Up to 4 photos of the product in use.</p>
    </div>
  );
}

export default function ReviewForm({ productId, orderId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [voice, setVoice] = useState(null); // { blob, durationSec }
  const [photos, setPhotos] = useState([]);  // [{ file, preview } | { url }]
  const [busy, setBusy] = useState(false);

  async function uploadBlob(endpoint, blob, fieldName) {
    const fd = new FormData();
    fd.append(fieldName, blob, blob.name || `${fieldName}.webm`);
    const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.url;
  }

  async function submit(e) {
    e.preventDefault();
    if (rating < 1) return toast.error('Please pick a rating');
    setBusy(true);
    try {
      let voiceNoteUrl;
      if (voice?.blob) voiceNoteUrl = await uploadBlob('/upload/audio', voice.blob, 'audio');

      const photoUrls = [];
      for (const p of photos) {
        if (p.url) { photoUrls.push(p.url); continue; }
        const url = await uploadBlob('/upload/review-photo', p.file, 'image');
        photoUrls.push(url);
      }

      const payload = {
        product: productId,
        order: orderId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        voiceNoteUrl,
        photos: photoUrls,
      };
      const { data } = await api.post('/reviews', payload);
      toast.success('Thanks for your review!');
      onSubmitted?.(data.data);
      setTitle(''); setComment(''); setRating(5); setVoice(null); setPhotos([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4 border border-primary/20">
      <div>
        <h3 className="text-lg">Leave a review</h3>
        <p className="text-sm text-ink/60">Help other cooks decide. Photos and voice notes are optional but appreciated.</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Your rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      <input
        className="input"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <textarea
        className="input"
        rows={4}
        placeholder="Tell us how this product performed in your kitchen..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
      />

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Voice note (optional)</p>
        <VoiceRecorder value={voice} onChange={setVoice} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Photos (optional)</p>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </div>

      <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={busy}>
        <FiSend /> {busy ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  );
}
