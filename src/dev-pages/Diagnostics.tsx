import { useEffect, useMemo, useState } from 'react';

type HealthResp = { success: boolean; data?: any } | any;
type DiagResp = { success: boolean; data: { status: string; serverTime: string; env: any; versions: any } };

const Diagnostics = () => {
  const [health, setHealth] = useState<HealthResp | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagResp['data'] | null>(null);
  const [streamMs, setStreamMs] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [h, d] = await Promise.all([
          fetch('/api/v1/health').then(r => r.json()).catch(() => null),
          fetch('/api/v1/diagnostics').then(r => r.json()).catch(() => null)
        ]);
        setHealth(h);
        setDiagnostics(d?.data || null);
      } finally { setLoading(false); }
    };
    run();
  }, []);

  const openaiMode = useMemo(() => {
    if (!diagnostics) return 'unknown';
    return diagnostics.env?.openai ? 'live' : 'demo';
  }, [diagnostics]);

  const testStreaming = async () => {
    setStreamMs(null); setStreamError(null);
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch('/api/v1/assistant/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ message: 'ping diagnostics', stream: true })
      });
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const { done } = await reader.read();
      clearTimeout(timer);
      if (done) {
        // If stream closed immediately, still count latency
        setStreamMs(Math.round(performance.now() - start));
        return;
      } else {
        setStreamMs(Math.round(performance.now() - start));
        try { reader.cancel(); } catch {}
      }
    } catch (e: any) {
      setStreamError(e?.message || 'Streaming failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Diagnostics</h1>

      <section className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">API Health</h2>
        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <div className="space-y-1">
            <div>
              <span className="font-medium">Health:</span>{' '}
              <span className={health ? 'text-green-600' : 'text-red-600'}>
                {health?.status || (health?.success ? 'ok' : 'down')}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{JSON.stringify(health)}</div>
          </div>
        )}
      </section>

      <section className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Configuration</h2>
        {diagnostics ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-medium">Mode Assistant</div>
              <div className={openaiMode === 'live' ? 'text-green-700' : 'text-amber-700'}>
                {openaiMode === 'live' ? 'Live (OPENAI_API_KEY configuré)' : 'Démo (sans clé)'}
              </div>
            </div>
            <div>
              <div className="font-medium">Video Processor</div>
              <div>{diagnostics.env?.videoProcessor ? 'Présent' : 'Absent'}</div>
            </div>
            <div>
              <div className="font-medium">Log Level</div>
              <div>{diagnostics.env?.logLevel}</div>
            </div>
            <div>
              <div className="font-medium">Allowed Origins</div>
              <div className="truncate" title={diagnostics.env?.allowedOrigins?.join(', ')}>
                {(diagnostics.env?.allowedOrigins || []).join(', ') || 'N/A'}
              </div>
            </div>
            <div>
              <div className="font-medium">Image Proxy Hosts</div>
              <div className="truncate" title={diagnostics.env?.imageProxyHosts?.join(', ')}>
                {(diagnostics.env?.imageProxyHosts || []).join(', ')}
              </div>
            </div>
            <div>
              <div className="font-medium">YT Rate Limit</div>
              <div>{diagnostics.env?.rateLimit?.ytMax} / {diagnostics.env?.rateLimit?.ytWindowMs}ms</div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Pas de données de diagnostics</p>
        )}
      </section>

      <section className="p-4 border rounded-lg">
        <h2 className="font-semibold mb-2">Test Streaming Assistant</h2>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded" onClick={testStreaming}>
          Lancer un test
        </button>
        {streamMs !== null && (
          <div className="mt-2 text-sm">Premier chunk en ~{streamMs} ms</div>
        )}
        {streamError && (
          <div className="mt-2 text-sm text-red-600">Erreur: {streamError}</div>
        )}
      </section>
    </div>
  );
};

export default Diagnostics;

