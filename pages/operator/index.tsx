import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { OperatorDashboardView } from '@/lib/domain/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Megaphone, LogOut, Clock, Activity, Power, UserCheck, Shield, AlertTriangle } from 'lucide-react';

export default function OperatorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<OperatorDashboardView | null>(null);
  const [operatorInfo, setOperatorInfo] = useState<{ id: string; displayLabel: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/operator/dashboard', { signal });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/operator/login');
          return;
        }
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to load operator dashboard.');
      }
      const json = await res.json();
      setData(json.dashboard);
      setOperatorInfo(json.operator);
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
    fetchDashboard(controller.signal);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboard(controller.signal);
      }
    }, 2500);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const handleCallNext = async (bathroomId: string) => {
    setActionLoading(`call-${bathroomId}`);
    setError(null);
    try {
      const res = await fetch('/api/operator/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bathroomId }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to call next pass.');
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (bathroomId: string, passId: string) => {
    setActionLoading(`complete-${passId}`);
    setError(null);
    try {
      const res = await fetch('/api/operator/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bathroomId, passId }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to complete visit.');
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSkip = async (bathroomId: string, passId: string) => {
    setActionLoading(`skip-${passId}`);
    setError(null);
    try {
      const res = await fetch('/api/operator/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bathroomId, passId, reason: 'Operator skipped' }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to skip pass.');
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBathroom = async (bathroomId: string, currentState: 'open' | 'closed') => {
    const nextState = currentState === 'open' ? 'closed' : 'open';
    setActionLoading(`toggle-${bathroomId}`);
    setError(null);
    try {
      const res = await fetch('/api/operator/toggle-bathroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bathroomId, state: nextState }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to toggle bathroom state.');
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/operator/logout', { method: 'POST' });
    } finally {
      router.push('/operator/login');
    }
  };

  const totalWaiting = data?.bathrooms.reduce((acc, b) => acc + b.waitingCount, 0) || 0;
  const totalCalled = data?.bathrooms.filter((b) => b.calledPass !== null).length || 0;

  return (
    <>
      <Head>
        <title>Operator Dashboard — BathPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-slate-100/70 pb-12">
        {/* Top Navbar */}
        <header className="bg-slate-900 text-white sticky top-0 z-10 border-b border-slate-800 shadow-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm text-white">
                BP
              </span>
              <div>
                <h1 className="text-base font-bold leading-tight">
                  {data?.venue.name || 'BathPass Dashboard'}
                </h1>
                <span className="text-[11px] text-slate-400">
                  {operatorInfo?.displayLabel || 'Staff Operator'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                Live Polling (2.5s)
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Global Alert Bar */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
              <span className="flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-rose-600 font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Overview Metrics Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 space-y-1">
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Waiting
              </CardDescription>
              <CardTitle className="text-3xl font-black text-slate-900">{totalWaiting}</CardTitle>
            </Card>

            <Card className="p-4 space-y-1">
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Currently Called
              </CardDescription>
              <CardTitle className="text-3xl font-black text-amber-600">{totalCalled}</CardTitle>
            </Card>

            <Card className="p-4 space-y-1">
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Open Bathrooms
              </CardDescription>
              <CardTitle className="text-3xl font-black text-emerald-600">
                {data?.bathrooms.filter((b) => b.state === 'open').length || 0}
              </CardTitle>
            </Card>

            <Card className="p-4 space-y-1">
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Call Window
              </CardDescription>
              <CardTitle className="text-3xl font-black text-indigo-600">
                {data ? `${Math.floor(data.venue.responseWindowSeconds / 60)}m` : '5m'}
              </CardTitle>
            </Card>
          </section>

          {/* Bathrooms Management Grid */}
          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Bathroom Operational Controls
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-64 bg-slate-200 animate-pulse rounded-3xl"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data?.bathrooms.map((bm) => {
                  const isOpen = bm.state === 'open';
                  const isToggling = actionLoading === `toggle-${bm.id}`;
                  const isCalling = actionLoading === `call-${bm.id}`;

                  return (
                    <Card
                      key={bm.id}
                      className={`flex flex-col justify-between overflow-hidden transition-all ${
                        isOpen ? 'border-slate-200' : 'border-slate-300/80 bg-slate-50/60'
                      }`}
                    >
                      {/* Bathroom Header */}
                      <CardHeader className="p-5 border-b border-slate-100 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-extrabold text-slate-900">
                              {bm.name}
                            </CardTitle>
                            {bm.locationHint && (
                              <CardDescription className="text-xs text-slate-500 mt-0.5">
                                📍 {bm.locationHint}
                              </CardDescription>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={isOpen ? 'default' : 'secondary'}
                            onClick={() => handleToggleBathroom(bm.id, bm.state)}
                            disabled={isToggling}
                            className={`text-xs font-bold rounded-full ${
                              isOpen
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <Power className="w-3 h-3 mr-1" />
                            {isToggling ? 'Saving...' : isOpen ? 'Open' : 'Closed'}
                          </Button>
                        </div>
                      </CardHeader>

                      {/* Currently Called Pass Section */}
                      <CardContent className="p-5 bg-slate-50/70 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <span>Called Pass</span>
                          {bm.calledPass && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono">
                              ACTIVE CALL
                            </Badge>
                          )}
                        </div>

                        {bm.calledPass ? (
                          <div className="p-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-bold opacity-80 block">
                                  Public Code
                                </span>
                                <span className="text-3xl font-black font-mono tracking-tight">
                                  {bm.calledPass.publicCode}
                                </span>
                              </div>
                              {bm.calledPass.isExpired && (
                                <Badge variant="destructive" className="animate-pulse">
                                  Expired
                                </Badge>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <Button
                                size="sm"
                                onClick={() => handleComplete(bm.id, bm.calledPass!.id)}
                                disabled={actionLoading === `complete-${bm.calledPass.id}`}
                                aria-label={`Complete visit for pass ${bm.calledPass.publicCode}`}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSkip(bm.id, bm.calledPass!.id)}
                                disabled={actionLoading === `skip-${bm.calledPass.id}`}
                                aria-label={`Skip guest for pass ${bm.calledPass.publicCode}`}
                                className="bg-amber-950/60 hover:bg-amber-950 text-white font-bold text-xs rounded-xl"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Skip
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-medium">
                            No guest called currently.
                          </div>
                        )}

                        {/* Call Next Primary Action */}
                        <Button
                          onClick={() => handleCallNext(bm.id)}
                          disabled={
                            !isOpen ||
                            bm.calledPass !== null ||
                            bm.waitingCount === 0 ||
                            isCalling
                          }
                          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs rounded-2xl shadow transition"
                        >
                          <Megaphone className="w-4 h-4 mr-2" />
                          {isCalling
                            ? 'Calling...'
                            : !isOpen
                            ? 'Bathroom Closed'
                            : bm.calledPass
                            ? 'Resolve Called Pass First'
                            : bm.waitingCount === 0
                            ? 'No Guests Waiting'
                            : `Call Next Pass (${bm.nextPass?.publicCode || ''}) →`}
                        </Button>
                      </CardContent>

                      {/* Waiting Queue List */}
                      <CardFooter className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="w-full">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            <span>Waiting Line ({bm.waitingCount})</span>
                          </div>

                          {bm.waitingPasses.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No waiting passes.</p>
                          ) : (
                            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              {bm.waitingPasses.map((p) => (
                                <li
                                  key={p.id}
                                  className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                      #{p.position}
                                    </span>
                                    <span className="font-mono font-bold text-slate-900">
                                      {p.publicCode}
                                    </span>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSkip(bm.id, p.id)}
                                    disabled={actionLoading === `skip-${p.id}`}
                                    aria-label={`Skip pass ${p.publicCode}`}
                                    className="h-7 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2"
                                  >
                                    Skip
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* Audit Events Timeline */}
          <Card className="p-6 shadow-sm space-y-4">
            <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" />
              <span>Recent Operational Audit Events</span>
            </CardTitle>

            {(!data || data.recentEvents.length === 0) ? (
              <p className="text-xs text-slate-500 italic">No events recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {data.recentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wide bg-slate-200/80 text-slate-700">
                        {ev.type}
                      </Badge>
                      <span className="font-semibold text-slate-800">
                        {ev.bathroomName}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(ev.occurredAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </>
  );
}
