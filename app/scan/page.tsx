"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, Loader2, Globe, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

let jsQrSingleton: any = null

export default function ScanPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [manualUrl, setManualUrl] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHttp = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      if (isHttp) {
        setError("Camera access requires HTTPS. Your site is running on HTTP.")
      } else {
        setError("Camera is not supported in this browser.")
      }
      return
    }

    if (!jsQrSingleton) {
      import("jsqr").then(mod => { jsQrSingleton = mod.default })
    }

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
    })
    .then(stream => {
      streamRef.current = stream
      const video = videoRef.current
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }

      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play().then(() => {
          if (!videoRef.current) return
          setReady(true)
        }).catch((e) => {
          setError("Could not play camera: " + e.message)
        })
      }
    })
    .catch((err: any) => {
      if (err?.name === "NotAllowedError") setError("Camera permission denied. Allow camera access in your browser settings.")
      else if (err?.name === "NotFoundError") setError("No camera found on this device.")
      else setError(err?.message || "Camera error")
    })

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    }
  }, [router])

  useEffect(() => {
    if (!ready) return

    intervalRef.current = window.setInterval(() => {
      const v = videoRef.current
      const c = canvasRef.current
      const jsqr = jsQrSingleton
      if (!v || !c || !jsqr || v.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) return
      c.width = v.videoWidth
      c.height = v.videoHeight
      const ctx = c.getContext("2d")
      if (!ctx) return
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const imageData = ctx.getImageData(0, 0, c.width, c.height)
      try {
        const code = jsqr(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
          router.push(code.data)
        }
      } catch {}
    }, 300)

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [ready, router])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${ready ? "" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-2 border-white/60 rounded-lg" />
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Starting camera...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <Globe className="h-10 w-10 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <ExternalLink className="h-4 w-4" />
                <span>Enter the QR code URL manually:</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="Paste URL from QR code..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={() => { if (manualUrl.trim()) router.push(manualUrl.trim()) }}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  Go
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black/80 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        {ready && (
          <span className="text-xs text-white/40">Point camera at QR code</span>
        )}
      </div>
    </div>
  )
}
