import React, { useRef, useState } from 'react';

export default function VideoPlayer({ src, title }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);

  return (
    <div className="video-player">
      {title && <div className="video-player__title">{title}</div>}
      {error ? (
        <div className="video-player__error">
          <p>Unable to load video</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          controls
          preload="metadata"
          className="video-player__element"
          onError={() => setError(true)}
        >
          Your browser does not support video playback.
        </video>
      )}
    </div>
  );
}
