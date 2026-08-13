import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PublicVenueSummary, PublicPassView } from '@/lib/domain/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, Users, Clock, ArrowRight, Ticket, ShieldCheck, DoorClosed } from 'lucide-react';

export default function VenueHome() {
  const router = useRouter();
  const [venue, setVenue] = useState<PublicVenueSummary | null>(null);
  const [activePass, setActivePass] = useState<PublicPassView | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (signal?: AbortSignal) => {
    try {
      // 1. Fetch Venue Summary
      const vRes = await fetch('/api/venue?slug=main', { signal });
      if (vRes.ok) {
        const vData = await vRes.json();
        setVenue(vData);
      }

      // 2. Check Active Pass for device
      const pRes = await fetch('/api/guest/pass', { signal });
      if (pRes.ok) {
        const pData: PublicPassView = await pRes.json();
        if (pData.status === 'waiting' || pData.status === 'called') {
          setActivePass(pData);
        } else {
          setActivePass(null);
        }
      } else {
        setActivePass(null);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load venue state', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData(controller.signal);
      }
    }, 4000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const handleJoin = async (bathroomId: string) => {
    if (!venue) return;
    setJoiningId(bathroomId);
    setError(null);

    try {
      const res = await fetch('/api/guest/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: venue.id,
          bathroomId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join queue.');
      }

      router.push(`/pass/${data.pass.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <>
      <Head>
        <title>{venue ? `${venue.name} — BathPass Queue` : 'BathPass'}</title>
        <meta
          name="description"
          content="Lightweight, privacy-conscious virtual waitlist for venue bathrooms."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-md mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Header Branding */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Live Virtual Queue</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                BP
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {venue ? venue.name : 'BathPass'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 max-w-xs mx-auto">
              Select an open bathroom to claim your spot in line without standing outside.
            </p>
          </div>
        </header>

        {/* Existing Active Pass Callout Banner */}
        {activePass && (
          <Card className="border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-orange-500/10 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-amber-200/80 text-amber-900 border-amber-300 font-mono font-bold">
                  Pass #{activePass.publicCode}
                </Badge>
                <Badge className={activePass.status === 'called' ? 'bg-amber-600 text-white animate-pulse' : 'bg-indigo-600 text-white'}>
                  {activePass.status === 'called' ? '⚡ READY NOW' : `In Line (#${activePass.queuePosition})`}
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-2">
                Active Pass Registered
              </CardTitle>
              <CardDescription className="text-xs text-slate-700">
                You hold an active pass for <strong className="text-slate-900">{activePass.bathroomName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href={`/pass/${activePass.id}`} passHref>
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow">
                  <Ticket className="w-4 h-4 mr-2" />
                  View Pass Details & Return Window →
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-900 text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Bathrooms List */}
        <section aria-label="Available Bathrooms" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Available Bathrooms</span>
            </h2>
            <span className="text-[11px] text-slate-400">Auto-refresh 4s</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-32 bg-slate-200/70 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : !venue || venue.bathrooms.length === 0 ? (
            <Card className="text-center p-8 text-slate-500 text-sm">
              No bathrooms configured for this venue.
            </Card>
          ) : (
            <div className="space-y-3">
              {venue.bathrooms.map((bm) => {
                const isOpen = bm.state === 'open';
                const isJoining = joiningId === bm.id;
                const hasActivePassInAnother = activePass && activePass.bathroomId !== bm.id;

                return (
                  <Card
                    key={bm.id}
                    className={`transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? 'border-slate-200 shadow-sm hover:border-slate-300 bg-white'
                        : 'border-slate-200/60 bg-slate-50/50 opacity-80'
                    }`}
                  >
                    <CardHeader className="p-4 sm:p-5 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-base font-bold text-slate-900">
                              {bm.name}
                            </CardTitle>
                            <Badge
                              variant={isOpen ? 'default' : 'secondary'}
                              className={
                                isOpen
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px]'
                                  : 'bg-slate-100 text-slate-600 font-semibold text-[11px]'
                              }
                            >
                              {isOpen ? '● Open' : 'Closed'}
                            </Badge>
                          </div>
                          {bm.locationHint && (
                            <CardDescription className="text-xs text-slate-500 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 inline text-slate-400 mr-1" />
                              <span>{bm.locationHint}</span>
                            </CardDescription>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black text-slate-900">
                            {bm.waitingCount}
                          </span>
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Waiting
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardFooter className="p-4 sm:p-5 pt-0 border-t border-slate-100/80 flex items-center justify-between mt-2">
                      <div className="text-xs text-slate-500 flex items-center space-x-1">
                        {isOpen ? (
                          bm.waitingCount === 0 ? (
                            <span className="text-emerald-700 font-bold flex items-center">
                              <Sparkles className="w-3.5 h-3.5 mr-1" />
                              No wait line!
                            </span>
                          ) : (
                            <span className="flex items-center text-slate-600">
                              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              Est: <strong className="text-slate-800 ml-1">~{bm.estimatedWaitMinutes} mins</strong>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 italic flex items-center">
                            <DoorClosed className="w-3.5 h-3.5 mr-1" />
                            Unavailable
                          </span>
                        )}
                      </div>

                      {isOpen && (
                        <Button
                          onClick={() => handleJoin(bm.id)}
                          disabled={isJoining || !!hasActivePassInAnother}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-sm"
                        >
                          {isJoining ? (
                            'Joining...'
                          ) : hasActivePassInAnother ? (
                            'Pass active elsewhere'
                          ) : (
                            <>
                              Join Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer Navigation */}
        <footer className="pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 space-y-2">
          <p className="flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>BathPass coordinates fair access without personal accounts.</span>
          </p>
          <div className="pt-1">
            <Link
              href="/operator/login"
              className="text-slate-600 hover:text-indigo-600 font-semibold underline underline-offset-4"
            >
              Operator Sign In
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
