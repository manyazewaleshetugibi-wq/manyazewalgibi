// components/orders/SoundControls.tsx
"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Volume2, VolumeX, Settings } from "lucide-react"

interface SoundControlsProps {
  isEnabled: boolean
  onToggle: () => void
  volume: number
  onVolumeChange: (value: number) => void
  onTestSound?: () => void
}

export const SoundToggleButton = ({ isEnabled, onToggle }: { isEnabled: boolean; onToggle: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onToggle}
    className="h-8 w-8"
    title={isEnabled ? "Sound notifications on" : "Sound notifications off"}
  >
    {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
  </Button>
)

export const SoundControlDialog = ({
  isEnabled,
  onToggle,
  volume,
  onVolumeChange,
  onTestSound,
}: SoundControlsProps) => {
  const [open, setOpen] = useState(false)

  const handleTestSound = () => {
    if (onTestSound) {
      onTestSound();
    } else {
      // Default test sound
      const audio = new Audio("/sounds/freesound_community-alert-33762.mp3");
      audio.volume = volume;
      audio.play().catch((error) => {
        console.error("Failed to play test sound:", error);
        // Fallback beep
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 800;
            gainNode.gain.value = volume;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            oscillator.stop(audioCtx.currentTime + 0.3);
            setTimeout(() => audioCtx.close(), 500);
          }
        } catch (e) {
          console.error("Fallback failed:", e);
        }
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sound Settings</DialogTitle>
          <DialogDescription>Configure notification sound preferences</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="text-sm font-medium">Sound Notifications</span>
            </div>
            <Button
              variant={isEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggle}
              className="h-8"
            >
              {isEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>

          {isEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Volume</span>
                <span className="text-sm font-medium">{Math.round(volume * 100)}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={(values) => onVolumeChange(values[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestSound}
                className="w-full mt-2"
              >
                <Volume2 className="h-3 w-3 mr-2" />
                Test Sound
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}