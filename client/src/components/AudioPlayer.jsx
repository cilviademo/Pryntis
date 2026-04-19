import React, { useState, useRef, useEffect, useCallback } from 'react';

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barCount = 60;
    const barWidth = Math.max(2, (w / barCount) - 2);
    const gap = 2;
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < barCount; i++) {
      // Generate pseudo-random but deterministic heights based on index
      const seed = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const barH = (Math.abs(seed % 1) * 0.7 + 0.3) * h;
      const x = i * (barWidth + gap);
      const isFilled = (i / barCount) <= progress;

      ctx.fillStyle = isFilled ? 'var(--color-primary, #7C3AED)' : 'var(--color-border, #1a1a2a)';
      ctx.fillRect(x, (h - barH) / 2, barWidth, barH);
    }

    if (playing) {
      animRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [currentTime, duration, playing]);

  useEffect(() => {
    drawWaveform();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [drawWaveform]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const seek = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const changeVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="audio-player__header">
        {title && <span className="audio-player__title">{title}</span>}
      </div>

      <div className="audio-player__controls">
        <button className="audio-player__play-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <span className="audio-player__time">{formatTime(currentTime)}</span>

        <canvas
          ref={canvasRef}
          className="audio-player__waveform"
          width={400}
          height={40}
          onClick={seek}
          style={{ cursor: 'pointer' }}
        />

        <span className="audio-player__time">{formatTime(duration)}</span>

        <input
          type="range"
          className="audio-player__volume"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={changeVolume}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
