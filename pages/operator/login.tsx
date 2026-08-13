import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';

export default function OperatorLogin() {
  const router = useRouter();
  const [authSubject, setAuthSubject] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/operator/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authSubject,
          password,
          venueSlug: 'main',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      router.push('/operator');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Operator Sign In — BathPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="max-w-sm mx-auto min-h-screen flex flex-col justify-center px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl mx-auto shadow-md">
            BP
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Staff Operator Sign In
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to manage bathroom queues and calls.
          </p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center">
                <KeyRound className="w-4 h-4 mr-2 text-indigo-600" />
                <span>Operator Credentials</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Enter your staff username and password.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  ⚠️ {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="authSubject" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Username / Subject
                </Label>
                <Input
                  id="authSubject"
                  type="text"
                  required
                  value={authSubject}
                  onChange={(e) => setAuthSubject(e.target.value)}
                  placeholder="e.g. operator"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="rounded-xl text-sm"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow py-5"
              >
                {loading ? 'Signing In...' : 'Sign In to Dashboard →'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Guest Queue View
          </Link>
        </div>
      </main>
    </>
  );
}
