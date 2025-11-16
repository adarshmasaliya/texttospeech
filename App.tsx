
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateSpeech } from './services/geminiService';
import { VOICES } from './types';
import type { AudioData, VoiceOption } from './types';
import { decode, decodeAudioData, encodeWav } from './utils/audioUtils';
import Spinner from './components/Spinner';
import PlayIcon from './components/icons/PlayIcon';
import PauseIcon from './components/icons/PauseIcon';
import DownloadIcon from './components/icons/DownloadIcon';

const App: React.FC = () => {
  const [text, setText] = useState<string>('Hello! Welcome to the Text to Speech Synthesizer powered by Gemini.');
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0].value);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const SAMPLE_RATE = 24000;

  useEffect(() => {
    // Initialize AudioContext after a user interaction (e.g., button click)
    // to comply with browser autoplay policies.
    // Here we'll just create it and resume it on first play.
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: SAMPLE_RATE
        });
    }
    
    return () => {
        audioContextRef.current?.close();
    };
  }, []);
  
  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
        audioSourceRef.current.onended = null; // Prevent onended from firing on manual stop
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
    }
    setIsPlaying(false);
  },[]);

  const handleGenerateAudio = async () => {
    stopPlayback();
    setIsLoading(true);
    setError(null);
    setAudioData(null);

    try {
      const base64Audio = await generateSpeech(text, selectedVoice);
      const audioBytes = decode(base64Audio);
      
      if (!audioContextRef.current) return;

      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, SAMPLE_RATE, 1);
      const wavBlob = encodeWav(audioBuffer.getChannelData(0), SAMPLE_RATE);
      
      setAudioData({ buffer: audioBuffer, blob: wavBlob });
      handlePlay(audioBuffer);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePlay = (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    
    stopPlayback(); // Stop any currently playing audio

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
    
    source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
    };
    
    audioSourceRef.current = source;
    setIsPlaying(true);
  };
  
  const handlePlayPause = () => {
      if (isPlaying) {
          stopPlayback();
      } else if(audioData) {
          handlePlay(audioData.buffer);
      }
  };

  const handleDownload = () => {
    if (!audioData) return;
    const url = URL.createObjectURL(audioData.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'speech.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            Text to Speech
          </h1>
          <p className="text-gray-400 mt-2">
            Powered by Gemini. Bring your text to life.
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl shadow-purple-500/10 border border-gray-700">
          <div className="space-y-6">
            <div>
              <label htmlFor="text-input" className="block text-sm font-medium text-gray-300 mb-2">
                Enter your text
              </label>
              <textarea
                id="text-input"
                rows={5}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something..."
              />
            </div>

            <div>
              <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">
                Choose a voice
              </label>
              <select
                id="voice-select"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
              >
                {VOICES.map((voice: VoiceOption) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateAudio}
              disabled={isLoading || !text.trim()}
              className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
            >
              {isLoading ? <Spinner /> : 'Generate Audio'}
            </button>
            
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                    <p>{error}</p>
                </div>
            )}

            {audioData && !isLoading && (
              <div className="bg-gray-900/70 p-4 rounded-lg flex items-center justify-center space-x-4 border border-gray-700">
                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>
                 <button
                  onClick={handleDownload}
                  className="p-3 bg-cyan-600 rounded-full hover:bg-cyan-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500"
                  aria-label="Download audio"
                >
                  <DownloadIcon className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
