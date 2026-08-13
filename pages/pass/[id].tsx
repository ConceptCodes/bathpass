import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PublicPassView } from '@/lib/domain/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Clock, MapPin, CheckCircle2, AlertCircle, LogOut, Ticket, Sparkles } from 'lucide-react';

export default function PassStatusPage() {
  const router = useRouter();
  const [pass, setPass] = useState<PublicPassView | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const fetchPass = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/guest/pass', { signal });
      if (!res.ok) {
        if (res.status === 401 || res.status === 404) {
          setPass(null);
          return;
        }
        const data = await res.json();
        throw new Error(data.error || 'Failed to load pass status.');
      }
      const data: PublicPassView = await res.json();
      setPass(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPass(controller.signal);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchPass(controller.signal);
      }
    }, 3500);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // Timer countdown for called status
  useEffect(() => {
    if (!pass || pass.status !== 'called' || !pass.expiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const calculateRemaining = () => {
      const expires = new Date(pass.expiresAt!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setRemainingSeconds(diff);
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);
    return () => clearInterval(timer);
  }, [pass]);

  const confirmLeave = async () => {
    setLeaving(true);
    setShowLeaveDialog(false);
    try {
      const res = await fetch('/api/guest/leave', { method: 'POST' });
      if (res.ok) {
        await fetchPass();
      } else {
        const data = await res.json();
        setError(data.error || 'Could not leave queue.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLeaving(false);
    }
  };

  const handleSelfComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch('/api/guest/complete', { method: 'POST' });
      if (res.ok) {
        await fetchPass();
      } else {
        const data = await res.json();
        setError(data.error || 'Could not complete visit.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <Head>
        <title>
          {pass ? `Pass ${pass.publicCode} — ${pass.bathroomName}` : 'My Pass — BathPass'}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-md mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Venue Overview</span>
          </Link>
          <Badge variant="outline" className="font-mono text-[10px] text-slate-400">
            Token Guarded
          </Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-600">Loading pass credentials...</p>
          </Card>
        ) : !pass ? (
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-900">No Active Pass Found</CardTitle>
              <CardDescription className="text-xs text-slate-600">
                You do not hold an active pass on this device. You may have left or completed your visit.
              </CardDescription>
            </div>
            <Link href="/" passHref>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl">
                Join Queue
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* CALLED STATUS ALERT */}
            {pass.status === 'called' && (
              <section role="alert" aria-live="assertive">
                <Card className="p-6 bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 rounded-3xl shadow-lg ring-4 ring-amber-400/40 text-center space-y-4 animate-bounce-subtle border-none">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-950/20 rounded-full text-xs font-black uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping"></span>
                    <span>IT’S YOUR TURN NOW!</span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Head to {pass.bathroomName}
                    </h2>
                    <p className="text-sm font-semibold opacity-90">
                      Show or speak code <strong className="text-xl underline underline-offset-4 font-mono">{pass.publicCode}</strong>
                    </p>
                  </div>

                  {remainingSeconds !== null && (
                    <div className="p-3 bg-amber-950/15 rounded-2xl inline-block">
                      <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                        Response Window Remaining
                      </span>
                      <span className="text-2xl font-black font-mono">
                        {formatTime(remainingSeconds)}
                      </span>
                    </div>
                  )}

                  {/* Self-Service Completion Button */}
                  <div className="pt-2">
                    <Button
                      onClick={handleSelfComplete}
                      disabled={completing}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-2xl py-6 shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
                      {completing ? 'Finishing Visit...' : '✓ I’m Finished / Left Bathroom'}
                    </Button>
                    <span className="text-[10px] opacity-75 font-semibold block mt-1">
                      Tap when finished to instantly call the next guest in line
                    </span>
                  </div>
                </Card>
              </section>
            )}

            {/* WAITING STATUS CARD */}
            {pass.status === 'waiting' && (
              <section role="region" aria-live="polite">
                <Card className="p-6 border-2 border-indigo-100 shadow-sm text-center space-y-5">
                  <div className="inline-flex items-center justify-center">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider px-3 py-1">
                      Waiting in Queue
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Your Queue Position
                    </span>
                    <div className="text-5xl font-black text-indigo-600 tracking-tight">
                      #{pass.queuePosition}
                    </div>
                    <p className="text-xs text-slate-500">
                      Out of {pass.waitingCount} guest{pass.waitingCount > 1 ? 's' : ''} in line
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl text-left space-y-2 border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Destination:</span>
                      <span className="font-bold text-slate-900">{pass.bathroomName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Public Short Code:</span>
                      <Badge className="font-mono font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                        {pass.publicCode}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    Keep this page open. Your screen will alert you automatically when called.
                  </p>
                </Card>
              </section>
            )}

            {/* TERMINAL STATUS CARDS */}
            {pass.status === 'completed' && (
              <Card role="region" aria-live="polite" className="p-6 bg-emerald-50 border border-emerald-200 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-slate-900">Visit Completed</CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    Thank you for using BathPass! Your session for {pass.bathroomName} is complete.
                  </CardDescription>
                </div>
                <Link href="/" passHref>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl">
                    Return to Venue Main
                  </Button>
                </Link>
              </Card>
            )}

            {pass.status === 'left' && (
              <Card role="region" aria-live="polite" className="p-6 bg-slate-100 border border-slate-200 text-center space-y-4">
                <CardTitle className="text-xl font-bold text-slate-900">You Left the Queue</CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Your pass #{pass.publicCode} for {pass.bathroomName} was cancelled.
                </CardDescription>
                <Link href="/" passHref>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl">
                    Re-join Queue
                  </Button>
                </Link>
              </Card>
            )}

            {pass.status === 'skipped' && (
              <Card role="region" aria-live="polite" className="p-6 bg-rose-50 border border-rose-200 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">Pass Expired or Skipped</CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  The response window elapsed or an operator skipped pass #{pass.publicCode}.
                </CardDescription>
                <Link href="/" passHref>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl">
                    Join Queue Again
                  </Button>
                </Link>
              </Card>
            )}

            {/* LEAVE QUEUE ACTION */}
            {(pass.status === 'waiting' || pass.status === 'called') && (
              <Button
                variant="outline"
                onClick={() => setShowLeaveDialog(true)}
                disabled={leaving}
                className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-2xl py-6"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {leaving ? 'Leaving Queue...' : 'Cancel & Leave Queue'}
              </Button>
            )}
          </div>
        )}

        {/* Leave Confirmation Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="max-w-xs rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">Leave Queue?</DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Are you sure you want to cancel your pass? You will lose your position in line.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowLeaveDialog(false)} className="w-full">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmLeave} className="w-full">
                Yes, Leave Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
