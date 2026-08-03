"use client"

import { useState, Suspense, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, Loader2, User, Smartphone, MapPin, Navigation, Fingerprint, Plus, LogIn, Copy } from "lucide-react"
import { startRegistration, startAuthentication } from "@simplewebauthn/browser"
import toast from "react-hot-toast"

const OFFICE_LAT = Number(process.env.NEXT_PUBLIC_OFFICE_LAT) || 8.99410
const OFFICE_LNG = Number(process.env.NEXT_PUBLIC_OFFICE_LNG) || 38.79260
const RADIUS_METERS = Number(process.env.NEXT_PUBLIC_ATTENDANCE_RADIUS_METERS) || 5
const BYPASS_LOCATION = process.env.NEXT_PUBLIC_BYPASS_CLOCKIN_LOCATION === 'true'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type PageStep = 'start' | 'location-loading' | 'location-error' | 'choice' | 'register' | 'password-shown' | 'returning-password' | 'returning-welcome' | 'fingerprint' | 'success' | 'error'

function ClockInForm() {
  const router = useRouter()
  const { data: session } = useSession()

  const [step, setStep] = useState<PageStep>('start')
  const [error, setError] = useState("")
  const [result, setResult] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [newName, setNewName] = useState("")
  const [newDept, setNewDept] = useState("")
  const [returningPassword, setReturningPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [needsFingerprintReg, setNeedsFingerprintReg] = useState(false)
  const [proofToken, setProofToken] = useState("")

  const checkFingerprintThenProceed = async (user: any) => {
    if (!user) return
    setSelectedUser(user)
    try {
      const res = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      })
      const data = await res.json()
      setNeedsFingerprintReg(!(data.success && data.options.allowCredentials?.length > 0))
    } catch {
      setNeedsFingerprintReg(true)
    }
    setStep('fingerprint')
  }

  const requestLocation = useCallback(() => {
    if (BYPASS_LOCATION) {
      setUserLat(OFFICE_LAT)
      setUserLng(OFFICE_LNG)
      if (session?.user?.id) {
        checkFingerprintThenProceed({ _id: session.user.id, name: session.user.name, role: session.user.role })
      } else {
        setStep('choice')
      }
      return
    }
    if (!navigator.geolocation) {
      setStep('location-error')
      setError("Geolocation not supported on this device")
      return
    }
    setStep('location-loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const dist = haversineDistance(lat, lng, OFFICE_LAT, OFFICE_LNG)
        if (dist <= RADIUS_METERS) {
          setUserLat(lat)
          setUserLng(lng)
          if (session?.user?.id) {
            checkFingerprintThenProceed({ _id: session.user.id, name: session.user.name, role: session.user.role })
          } else {
            setStep('choice')
          }
        } else {
          setStep('location-error')
          setError("You are far from the work space. Please go to the work space to clock in.")
        }
      },
      () => {
        setStep('location-error')
        setError("Location access denied or unavailable. Make sure location is enabled and try again, or use a different browser.")
      },
      { enableHighAccuracy: false, timeout: 30000 }
    )
  }, [session, checkFingerprintThenProceed])

  const handleFingerprintRegister = async () => {
    if (!selectedUser) return
    setSubmitting(true)
    setError("")
    try {
      const regRes = await fetch('/api/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, name: selectedUser.name, token: proofToken }),
      })
      const regData = await regRes.json()
      if (!regData.success) throw new Error(regData.error || "Failed to start registration")
      const attResp = await startRegistration(regData.options)
      const verifyRes = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, response: attResp, token: proofToken }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) throw new Error(verifyData.error || "Verification failed")
      if (verifyData.token) setProofToken(verifyData.token)
      await doClockIn(verifyData.token || proofToken)
    } catch (err: any) {
      setError(err.message || "Fingerprint registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFingerprintAuth = async () => {
    if (!selectedUser) return
    setSubmitting(true)
    setError("")
    try {
      const authRes = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id }),
      })
      const authData = await authRes.json()
      if (!authData.success) throw new Error(authData.error || "Failed to start authentication")
      const authResp = await startAuthentication(authData.options)
      const verifyRes = await fetch('/api/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser._id, response: authResp }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) throw new Error(verifyData.error || "Authentication failed")
      if (verifyData.token) setProofToken(verifyData.token)
      await doClockIn(verifyData.token || proofToken)
    } catch (err: any) {
      setError(err.message || "Fingerprint scan failed")
    } finally {
      setSubmitting(false)
    }
  }

  const doClockIn = async (tokenOverride?: string) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser._id, latitude: userLat, longitude: userLng, token: tokenOverride || proofToken }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data.data)
        setStep('success')
      } else {
        setError(data.error || "Clock-in failed")
      }
    } catch {
      setError("Connection error")
    }
  }

  if (step === 'start') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-6">
          <Smartphone className="h-12 w-12 text-purple-500 mx-auto" />
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Tap the button below to start</p>
          <Button onClick={requestLocation} className="w-full rounded-xl h-14 text-lg" size="lg">
            Tap to Clock In
          </Button>
        </Card>
      </div>
    )
  }

  if (step === 'location-loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Navigation className="h-8 w-8 text-purple-600 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold">Checking Location</h1>
          <p className="text-sm text-muted-foreground">Please allow location access when prompted...</p>
          <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto" />
        </Card>
      </div>
    )
  }

  if (step === 'location-error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <MapPin className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-red-700">Cannot Verify Location</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={requestLocation} variant="outline" className="rounded-full w-full">
            Try Again
          </Button>
          <Button variant="ghost" className="rounded-full w-full" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    )
  }

  if (step === 'choice') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-6">
          <div className="flex items-center justify-center gap-1 text-xs text-green-600 mb-2">
            <MapPin className="h-3 w-3" /> Location verified
          </div>
          <Smartphone className="h-12 w-12 text-purple-500 mx-auto" />
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground">Scan your fingerprint to clock in/out</p>
          <div className="space-y-3 pt-2">
            <Button onClick={() => setStep('returning-password')} className="w-full rounded-xl h-12" size="lg">
              <LogIn className="h-5 w-5 mr-2" /> I have an account
            </Button>
            <Button onClick={() => setStep('register')} variant="outline" className="w-full rounded-xl h-12" size="lg">
              <Plus className="h-5 w-5 mr-2" /> New here? Register
            </Button>
          </div>
          {session?.user && (
            <Button
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => checkFingerprintThenProceed({ _id: session.user.id, name: session.user.name, role: session.user.role })}
            >
              Clock in as {session.user.name}
            </Button>
          )}
        </Card>
      </div>
    )
  }

  if (step === 'register') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg p-8 space-y-4">
          <h1 className="text-xl font-bold text-center">Register New Staff</h1>
          <p className="text-sm text-muted-foreground text-center">Enter your details to get started</p>
          <div className="space-y-3">
            <Input placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl" />
            <Input placeholder="Department (e.g. Kitchen, Waitress)" value={newDept} onChange={e => setNewDept(e.target.value)} className="rounded-xl" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button
            onClick={async () => {
              if (!newName.trim()) { setError("Enter your name"); return }
              setSubmitting(true)
              setError("")
              try {
                const res = await fetch('/api/attendance/staff/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName.trim(), department: newDept.trim() }),
                })
                const data = await res.json()
                if (!data.success) throw new Error(data.error || "Registration failed")
                setSelectedUser(data.data)
                setGeneratedPassword(data.data.password)
                if (data.data.token) setProofToken(data.data.token)
                setStep('password-shown')
              } catch (err: any) {
                setError(err.message || "Registration failed")
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting || !newName.trim()}
            className="w-full rounded-xl"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Register & Continue"}
          </Button>
          <Button variant="ghost" className="w-full rounded-xl" onClick={() => setStep('choice')}>Back</Button>
        </Card>
      </div>
    )
  }

  if (step === 'password-shown') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">Registered Successfully!</h1>
          <p className="text-sm text-muted-foreground">Welcome, <span className="font-semibold">{selectedUser?.name}</span></p>
          {selectedUser?.department && <Badge variant="secondary">{selectedUser.department}</Badge>}
          <div className="bg-purple-50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Your password (save this to sign in later):</p>
            <p className="text-3xl font-bold tracking-widest text-purple-700">{generatedPassword}</p>
            <Button
              variant="ghost" size="sm" className="rounded-full text-xs"
              onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success("Password copied") }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Next: scan your fingerprint to clock in</p>
          <Button onClick={() => { setStep('fingerprint'); setNeedsFingerprintReg(true) }} className="w-full rounded-xl">
            Continue to Fingerprint Setup
          </Button>
        </Card>
      </div>
    )
  }

  if (step === 'returning-password') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg p-8 space-y-4">
          <h1 className="text-xl font-bold text-center">Welcome Back</h1>
          <p className="text-sm text-muted-foreground text-center">Enter your password to identify yourself</p>
          <Input
            placeholder="Enter password"
            value={returningPassword}
            onChange={e => setReturningPassword(e.target.value)}
            className="text-center text-xl tracking-widest rounded-xl"
            type="password"
            maxLength={4}
            inputMode="numeric"
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <Button
            onClick={async () => {
              if (!returningPassword.trim()) { setError("Enter your password"); return }
              setSubmitting(true)
              setError("")
              try {
                const res = await fetch('/api/attendance/staff/lookup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: returningPassword.trim() }),
                })
                const data = await res.json()
                if (!data.success) throw new Error(data.error || "Invalid password")
                setSelectedUser(data.data)
                if (data.token) setProofToken(data.token)
                setStep('returning-welcome')
              } catch (err: any) {
                setError(err.message || "Invalid password")
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting || !returningPassword.trim()}
            className="w-full rounded-xl"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}
          </Button>
          <Button variant="ghost" className="w-full rounded-xl" onClick={() => setStep('choice')}>Back</Button>
        </Card>
      </div>
    )
  }

  if (step === 'returning-welcome') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">Welcome back!</h1>
          <p className="text-lg font-semibold">{selectedUser?.name}</p>
          {selectedUser?.department && <Badge variant="secondary">{selectedUser.department}</Badge>}
          <p className="text-sm text-muted-foreground">Scan fingerprint to clock in</p>
          <Button onClick={() => checkFingerprintThenProceed(selectedUser)} className="w-full rounded-xl">
            Continue to Fingerprint Scan
          </Button>
          <Button variant="ghost" className="w-full rounded-xl" onClick={() => { setStep('choice'); setSelectedUser(null); setReturningPassword("") }}>
            Not you? Try again
          </Button>
        </Card>
      </div>
    )
  }

  if (step === 'fingerprint') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold">{selectedUser?.name}</h1>
            {selectedUser?.department && <Badge variant="secondary" className="capitalize">{selectedUser.department}</Badge>}
            <Badge variant="outline" className="capitalize">{selectedUser?.role}</Badge>
            <div className="flex items-center justify-center gap-1 text-xs text-green-600">
              <MapPin className="h-3 w-3" /> Location verified
            </div>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center border-2 border-dashed border-purple-300">
              <Fingerprint className="h-10 w-10 text-purple-600" />
            </div>
            <p className="text-sm font-medium">
              {needsFingerprintReg ? "Register your fingerprint" : "Scan your fingerprint to clock in/out"}
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            {needsFingerprintReg ? (
              <Button onClick={handleFingerprintRegister} disabled={submitting} className="w-full rounded-xl h-12 bg-purple-600 hover:bg-purple-700">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Fingerprint className="h-5 w-5 mr-2" /> Register Fingerprint</>}
              </Button>
            ) : (
              <Button onClick={handleFingerprintAuth} disabled={submitting} className="w-full rounded-xl h-12 bg-purple-600 hover:bg-purple-700">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Fingerprint className="h-5 w-5 mr-2" /> Scan Fingerprint</>}
              </Button>
            )}
            <Button onClick={needsFingerprintReg ? handleFingerprintRegister : handleFingerprintAuth} disabled={submitting} variant="outline" className="w-full rounded-xl">
              {needsFingerprintReg ? <><Fingerprint className="h-4 w-4 mr-2" /> Already have fingerprint? Scan</> : <><Plus className="h-4 w-4 mr-2" /> Register New Fingerprint</>}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
        <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8 space-y-4">
          {result?.type === "CLOCK_IN" ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-700">Clocked In!</h1>
              <p className="text-muted-foreground">Welcome, <span className="font-semibold">{result.userName}</span></p>
              <p className="text-xs text-muted-foreground">{new Date(result.time).toLocaleTimeString()}</p>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-blue-700">Clocked Out!</h1>
              <p className="text-muted-foreground">Goodbye, <span className="font-semibold">{result.userName}</span></p>
              <p className="text-xs text-muted-foreground">{new Date(result.time).toLocaleTimeString()}</p>
            </>
          )}
          <Button onClick={() => router.push('/attendance/clock')} variant="outline" className="rounded-full w-full mt-4">
            Done
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white p-4">
      <Card className="max-w-sm w-full rounded-2xl shadow-lg text-center p-8">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Error</h1>
        <p className="text-sm text-muted-foreground">{error || "Something went wrong"}</p>
        <Button onClick={() => router.push('/attendance/clock')} variant="outline" className="rounded-full w-full mt-4">
          Try Again
        </Button>
      </Card>
    </div>
  )
}

export default function ClockPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <ClockInForm />
    </Suspense>
  )
}
