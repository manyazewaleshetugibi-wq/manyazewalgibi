// hooks/useNotificationSound.ts
import { useRef, useState, useCallback, useEffect } from 'react';

interface NotificationSoundHook {
  play: () => void;
  stop: () => void;
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  isReady: boolean;
  volume: number;
  setVolume: (volume: number) => void;
}

export const useNotificationSound = (): NotificationSoundHook => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [userInteracted, setUserInteracted] = useState(false);
  
  // Initialize Web Audio context
  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) {
      // Check if context is usable
      if (audioContextRef.current.state !== 'closed') {
        return audioContextRef.current;
      }
    }
    
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const context = new AudioContextClass();
          audioContextRef.current = context;
          console.log('✅ Audio context initialized, state:', context.state);
          
          // Mark as ready when context is created
          setIsReady(true);
          
          return context;
        } catch (error) {
          console.error('❌ Failed to create AudioContext:', error);
          setIsReady(false);
          return null;
        }
      }
    }
    setIsReady(false);
    return null;
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    console.log('🔊 useNotificationSound mounted, initializing...');
    initAudioContext();
    
    // Listen for user interaction to unlock audio
    const handleUserInteraction = async () => {
      if (!userInteracted && audioContextRef.current) {
        console.log('👆 User interaction detected, unlocking audio...');
        try {
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
            console.log('✅ Audio context resumed, state:', audioContextRef.current.state);
          }
          setUserInteracted(true);
        } catch (error) {
          console.error('❌ Failed to resume audio context:', error);
        }
      }
    };
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [initAudioContext, userInteracted]);
  
  const stop = useCallback(() => {
    // No need to stop individual oscillators as we create new ones each time
    console.log('🔇 Stop requested');
  }, []);
  
  // Play beep sound
  const play = useCallback(async () => {
    console.log('🔊 play() called, isEnabled:', isEnabled, 'isReady:', isReady);
    
    if (!isEnabled) {
      console.log('🔇 Sound is disabled');
      return;
    }
    
    if (!isReady) {
      console.log('⚠️ Sound not ready yet, trying to initialize...');
      await initAudioContext();
    }
    
    try {
      let context = audioContextRef.current;
      
      if (!context) {
        context = await initAudioContext();
        if (!context) {
          console.error('❌ No audio context available');
          return;
        }
      }
      
      // Check if context is suspended (browser autoplay policy)
      if (context.state === 'suspended') {
        console.log('⏸️ Audio context suspended, attempting to resume...');
        await context.resume();
        console.log('✅ Audio context resumed, new state:', context.state);
      }
      
      if (context.state !== 'running') {
        console.warn('⚠️ Audio context not running, state:', context.state);
        return;
      }
      
      // Create and play beep
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5 note - pleasant notification
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
      
      oscillator.start();
      oscillator.stop(now + 0.3);
      
      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
      
      console.log('🔔 Beep sound played successfully!');
      
    } catch (error) {
      console.error('❌ Failed to play sound:', error);
    }
  }, [isEnabled, isReady, volume, initAudioContext]);
  
  // Force unlock audio with a silent play on component mount
  useEffect(() => {
    const unlockAudio = async () => {
      const context = audioContextRef.current;
      if (context && context.state === 'suspended') {
        try {
          // Create a silent gain node to unlock audio
          const silentGain = context.createGain();
          silentGain.gain.value = 0;
          silentGain.connect(context.destination);
          const oscillator = context.createOscillator();
          oscillator.connect(silentGain);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.001);
          console.log('🔓 Silent audio unlock attempted');
        } catch (e) {
          // Ignore
        }
      }
    };
    
    // Try to unlock after a short delay
    const timer = setTimeout(() => {
      unlockAudio();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return { 
    play, 
    stop, 
    isEnabled, 
    setIsEnabled, 
    isReady, 
    volume, 
    setVolume 
  };
};