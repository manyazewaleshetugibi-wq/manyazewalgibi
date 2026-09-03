'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ScanLine, CheckCircle, AlertCircle, Camera, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsQR from 'jsqr';

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (tableNumber: string, qrUrl?: string) => void;
}

type Status = 'permission' | 'requesting' | 'scanning' | 'success' | 'error';

function extractTableNumber(raw: string): string | null {
  const s = raw.trim();
  const patterns = [
    /[?&]table=(\d+)/i,
    /\/table\/(\d+)/i,
    /table[=:](\d+)/i,
    /^(\d+)$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return null;
}

export function QRScannerDialog({ open, onOpenChange, onScan }: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  const [status, setStatus] = useState<Status>('permission');
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedTable, setScannedTable] = useState('');

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    doneRef.current = false;
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || doneRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code?.data) {
        const tableNum = extractTableNumber(code.data);
        if (tableNum) {
          doneRef.current = true;
          stopCamera();
          setScannedTable(tableNum);
          setStatus('success');
          setTimeout(() => {
            onScan(tableNum, code.data);
            onOpenChange(false);
          }, 900);
          return;
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stopCamera, onScan, onOpenChange]);

  const startCamera = useCallback(async () => {
    setStatus('requesting');
    setErrorMsg('');
    doneRef.current = false;

    // Robust check — mediaDevices can be undefined on HTTP or old browsers
    const mediaDevices =
      navigator.mediaDevices ||
      ((navigator as any).webkitGetUserMedia && {
        getUserMedia: (c: any) =>
          new Promise((res, rej) =>
            (navigator as any).webkitGetUserMedia(c, res, rej)
          ),
      });

    if (!mediaDevices?.getUserMedia) {
      setStatus('error');
      setErrorMsg(
        window.location.protocol !== 'https:' && window.location.hostname !== 'localhost'
          ? 'Camera requires a secure (HTTPS) connection. Please open this page over HTTPS.'
          : 'Camera is not available on this device or browser.'
      );
      return;
    }

    try {
      const stream = await mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setStatus('scanning');
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      setStatus('error');
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg(
          'Camera access was denied. Please tap "Allow" when your browser asks, or enable camera permission in your device settings.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMsg('No camera was found on this device.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorMsg('Camera is already in use by another app. Please close it and try again.');
      } else if (name === 'OverconstrainedError') {
        // Retry without facingMode constraint
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
          }
          setStatus('scanning');
          rafRef.current = requestAnimationFrame(tick);
        } catch {
          setErrorMsg('Could not access camera. Please try again.');
        }
      } else {
        setErrorMsg('Could not start camera. Please try again.');
      }
    }
  }, [tick]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStatus('permission');
      setErrorMsg('');
      setScannedTable('');
      doneRef.current = false;
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopCamera();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        <DialogTitle className="sr-only">Scan Table QR Code</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900 to-purple-700">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">Scan Table QR</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 rounded-full text-white hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* ── PERMISSION REQUEST SCREEN ── */}
        {status === 'permission' && (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-10 bg-white">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="p-5 bg-purple-100 rounded-full"
            >
              <Camera className="h-10 w-10 text-purple-800" />
            </motion.div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-gray-900">Camera Access Needed</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                To scan the table QR code, we need access to your camera.
                Your browser will ask for permission — please tap <strong>Allow</strong>.
              </p>
            </div>

            <div className="w-full space-y-2">
              <Button
                onClick={startCamera}
                className="w-full h-10 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white rounded-xl font-semibold gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Allow Camera & Scan
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-8 text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── REQUESTING (spinner while browser permission dialog shows) ── */}
        {status === 'requesting' && (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 bg-white">
            <div className="relative">
              <div className="h-14 w-14 rounded-full border-4 border-purple-100 border-t-purple-700 animate-spin" />
              <Camera className="absolute inset-0 m-auto h-5 w-5 text-purple-700" />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Waiting for camera permission…
            </p>
            <p className="text-[10px] text-gray-400 text-center">
              Please tap <strong>Allow</strong> in your browser's permission dialog
            </p>
          </div>
        )}

        {/* Video + canvas ALWAYS rendered so refs exist when stream is assigned during 'requesting' */}
        <div
          className="relative bg-black"
          style={{
            aspectRatio: '1 / 1',
            display: (status === 'scanning' || status === 'success' || status === 'error') ? undefined : 'none',
          }}
        >
          <canvas ref={canvasRef} className="hidden" />
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/35" />
              <div className="relative z-10 w-52 h-52">
                <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-purple-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-purple-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-purple-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-purple-400 rounded-br-lg" />
                <motion.div
                  className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                  style={{ boxShadow: '0 0 8px 2px rgba(167,139,250,0.7)' }}
                  animate={{ top: ['8%', '88%', '8%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}

          {/* Success overlay */}
          <AnimatePresence>
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-green-900/85 flex flex-col items-center justify-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                >
                  <CheckCircle className="h-14 w-14 text-green-400" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <p className="text-white font-bold text-base">Table {scannedTable}</p>
                  <p className="text-green-300 text-xs mt-0.5">QR code detected!</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error overlay */}
          {status === 'error' && (
            <div className="absolute inset-0 bg-gray-950/95 flex flex-col items-center justify-center gap-4 p-5">
              <div className="p-3 bg-red-900/40 rounded-full">
                <AlertCircle className="h-10 w-10 text-red-400" />
              </div>
              <p className="text-white text-xs text-center leading-relaxed">{errorMsg}</p>
              <Button
                size="sm"
                onClick={() => setStatus('permission')}
                className="bg-purple-700 hover:bg-purple-600 text-white text-xs h-8 px-4 rounded-full gap-1.5"
              >
                <Camera className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          )}
        </div>

        {status === 'scanning' && (
          <div className="px-4 py-3 bg-gray-950 text-center">
            <p className="text-[11px] text-gray-300 font-medium">
              Point camera at the table QR code
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
