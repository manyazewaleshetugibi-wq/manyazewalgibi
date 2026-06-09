// hooks/useNotificationSound.ts
import { useRef, useState, useEffect, useCallback } from 'react';

interface NotificationSoundHook {
  play: () => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  isReady: boolean;
}

export const useNotificationSound = (): NotificationSoundHook => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  
  // Auto-initialize audio on component mount
  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = '/sounds/notification.mp3';
    audio.volume = 0.5;
    
    audio.addEventListener('canplaythrough', () => {
      console.log('Notification sound loaded successfully');
      setAudioLoaded(true);
      setIsReady(true);
    });
    
    audio.addEventListener('error', () => {
      console.log('Notification sound file not found, using Web Audio fallback');
      setAudioLoaded(false);
      // Still mark as ready because we have fallback
      setIsReady(true);
    });
    
    audioRef.current = audio;
    
    // Initialize Web Audio context for fallback (can be started later)
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
        // Note: Not starting the context yet - we'll start when playing
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Play sound - will work automatically after initialization
  const play = useCallback(() => {
    if (!isEnabled) {
      console.log('Sound is disabled');
      return;
    }
    
    if (!isReady) {
      console.log('Sound not ready yet');
      return;
    }
    
    console.log('Playing notification sound...');
    
    // Try to play audio file first
    if (audioRef.current && audioLoaded) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Audio file play failed, using Web Audio fallback:', error);
          playFallbackBeep();
        });
      }
      return;
    }
    
    // Fallback to Web Audio beep
    playFallbackBeep();
  }, [isEnabled, isReady, audioLoaded]);

  const playFallbackBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        audioContextRef.current = new AudioContext();
      }
      
      // Resume the audio context if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContextRef.current.currentTime + 0.3);
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
      
      console.log('Fallback beep played');
    } catch (error) {
      console.error('Failed to play fallback beep:', error);
    }
  }, []);

  return { play, isEnabled, setIsEnabled, isReady };
};