import { useMemo, useState } from "react";

const CATEGORY_COLORS = {
    "Treatment & Clinical Trials": "from-emerald-500 to-lime-400",
    "Public Health / Other": "from-sky-500 to-cyan-400",
};

export default function App() {
    const [abstractText, setAbstractText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const confidenceWidth = useMemo(() => {
        if (!result) return "0%";
        return `${Math.min(Math.max(result.confidence, 0), 100)}%`;
    }, [result]);

    const handleAnalyze = async () => {
        setError("");
        setResult(null);
        setLoading(true);

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ abstract: abstractText }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Request failed");
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute top-24 right-0 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_60%)]" />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-16">
                <header className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
                        AI signal intelligence
                    </p>
                    <h1 className="text-4xl font-semibold text-white md:text-5xl">
                        COVID-19 Research Paper Analyzer
                    </h1>
                    <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                        Paste a scientific abstract and instantly classify its focus, extract
                        biomedical entities, and surface related research keywords.
                    </p>
                </header>

                <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.8)] md:grid-cols-[1.6fr_0.7fr]">
                    <div className="flex flex-col gap-4">
                        <label className="text-sm font-medium text-slate-300" htmlFor="abstract">
                            Research Abstract
                        </label>
                        <textarea
                            id="abstract"
                            value={abstractText}
                            onChange={(event) => setAbstractText(event.target.value)}
                            placeholder="Paste the paper abstract here..."
                            className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-base text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        />
                    </div>

                    <div className="flex flex-col justify-between gap-5">
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/20 p-4">
                            <p className="text-sm text-slate-400">Model Capabilities</p>
                            <ul className="space-y-2 text-sm text-slate-200">
                                <li>Classification + confidence scoring</li>
                                <li>NER extraction (ORG, PERSON, DATE)</li>
                                <li>Semantic keyword expansion</li>
                            </ul>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !abstractText.trim()}
                            className="inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <span className="flex items-center gap-3">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/40 border-t-slate-900" />
                                    Analyzing...
                                </span>
                            ) : (
                                "Analyze Paper"
                            )}
                        </button>
                        {error && (
                            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                                {error}
                            </p>
                        )}
                    </div>
                </section>

                {result && (
                    <section className="grid gap-6 md:grid-cols-3">
                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                Classification
                            </p>
                            <h2 className="mt-3 text-lg font-semibold text-white">
                                {result.category}
                            </h2>
                            <div className="mt-5 h-3 w-full rounded-full bg-white/10">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${CATEGORY_COLORS[result.category] || "from-purple-500 to-pink-400"
                                        }`}
                                    style={{ width: confidenceWidth }}
                                />
                            </div>
                            <p className="mt-3 text-sm text-slate-300">
                                Confidence: {result.confidence}%
                            </p>
                        </article>

                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                Entities
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {result.entities?.length ? (
                                    result.entities.map((entity, index) => (
                                        <span
                                            key={`${entity.text}-${index}`}
                                            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                                        >
                                            {entity.text}
                                            <span className="ml-2 text-[10px] uppercase text-cyan-200/70">
                                                {entity.label}
                                            </span>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">No entities found.</p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                AI Suggestions
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {result.suggestions?.length ? (
                                    result.suggestions.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
                                        >
                                            {item}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">No suggestions yet.</p>
                                )}
                            </div>
                        </article>
                    </section>
                )}
            </div>
        </div>
    );
}
