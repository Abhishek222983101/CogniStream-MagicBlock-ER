import { ArrowRight, Activity, Database, Server, Brain, Target, Shield, MapPin, CheckCircle2, XCircle, AlertCircle, Terminal, Mic, Zap, Lock, Globe } from "lucide-react";
import Link from "next/link";
import HeroText from "@/components/ui/hero-shutter-text";
import { MetricsScoreCards } from "@/components/ui/metrics-score-cards";
import { FloatingHeader } from "@/components/ui/floating-header";
import { GridAnimation } from "@/components/ui/mouse-following-line";

export default function Home() {
  const metricsData = [
    {
      title: "Rule Engine",
      description: "Deterministic evaluation of hard criteria like age, gender, staging, and ECOG performance status against exact trial parameters.",
      initialScore: 100,
      icon: <Server className="w-8 h-8 stroke-charcoal" strokeWidth={2.5} />,
      color: "#00A36C" // surgical-green
    },
    {
      title: "ML Matcher",
      description: "Fine-tuned language models process unstructured patient histories and complex biomarker profiles against inclusion/exclusion criteria.",
      initialScore: 94,
      icon: <Brain className="w-8 h-8 stroke-charcoal" strokeWidth={2.5} />,
      color: "#0047AB" // cobalt
    },
    {
      title: "Geo-Filter",
      description: "Real-time mapping integration verifies patient-to-site travel viability, instantly flagging geographic disqualifications.",
      initialScore: 88,
      icon: <MapPin className="w-8 h-8 stroke-charcoal" strokeWidth={2.5} />,
      color: "#FF5722" // iodine
    }
  ];

  const sampleOutput = [
    { criterion: "Age 18-75", patient: "54", status: "ELIGIBLE", confidence: 98 },
    { criterion: "ECOG <= 2", patient: "1", status: "ELIGIBLE", confidence: 95 },
    { criterion: "Platelets >= 100K", patient: "112K", status: "ELIGIBLE", confidence: 92 },
    { criterion: "No prior chemo", patient: "N/A", status: "UNCLEAR", confidence: 60 },
  ];

  return (
    <div className="min-h-screen bg-paper font-mono relative bg-noise overflow-x-hidden text-charcoal">
      {/* Absolute full-screen dot pattern wrapper behind everything */}
      <div className="fixed inset-0 bg-dot-pattern opacity-10 pointer-events-none z-0" />
      
      {/* Brutalist Navbar Component - Floating with margin */}
      <div className="relative z-50 pt-4">
        <FloatingHeader />
      </div>

      <main className="flex flex-col relative z-10">
        {/* Hero Section */}
        <section className="relative px-6 py-12 md:px-12 md:py-24 border-brutal-b bg-transparent overflow-hidden mt-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-10">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-50px] right-[-100px] w-96 h-96 bg-cobalt rounded-full blur-[100px] opacity-20 pointer-events-none" />

            <div className="flex flex-col justify-center z-10 w-full overflow-hidden">
              <div className="mb-0 w-fit relative mt-8 md:mt-0">
                <HeroText text="COGNISTREAM" className="items-start" />
              </div>
              
              <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-charcoal mt-2 mb-6">
                Clinical Trial <span className="text-cobalt">Matching Engine</span>
              </h2>

              <p className="font-mono text-lg md:text-xl max-w-xl mb-10 leading-relaxed font-medium text-charcoal/80 bg-white/40 backdrop-blur-sm p-4 border-l-2 border-cobalt">
                Reducing manual screening from 30+ minutes to under 15 seconds. 
                Transparent, explainable AI for clinical trial eligibility.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex w-max items-center justify-center gap-3 bg-cobalt text-white brutal-btn px-8 py-4 text-lg md:text-xl uppercase whitespace-nowrap"
                >
                  Dashboard <ArrowRight className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                </Link>
                <Link
                  href="/pipeline"
                  className="inline-flex w-max items-center justify-center gap-3 bg-white text-charcoal brutal-btn px-8 py-4 text-lg md:text-xl uppercase whitespace-nowrap hover:bg-charcoal hover:text-white"
                >
                  Run Pipeline
                </Link>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center lg:justify-end mt-16 lg:mt-0">
              <div className="relative w-full max-w-[520px]">
                {/* 4-Layer Terminal Component from Inspiration Repo */}
                <div className="bg-charcoal text-white border-brutal shadow-brutal overflow-hidden rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center justify-between px-4 py-3 border-b-2 border-white/10">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-surgical" strokeWidth={2} />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-white/60">4-Layer Pipeline Output</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-surgical animate-pulse" />
                      <span className="font-mono text-[10px] font-bold uppercase text-surgical">LIVE</span>
                    </div>
                  </div>
                  <div className="p-4 font-mono text-sm bg-grid-pattern-dark">
                    {sampleOutput.map((row, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0">
                        <div className="flex items-center gap-3">
                          {row.status === "ELIGIBLE" ? (
                            <CheckCircle2 className="w-4 h-4 text-surgical shrink-0" strokeWidth={2.5} />
                          ) : row.status === "INELIGIBLE" ? (
                            <XCircle className="w-4 h-4 text-iodine shrink-0" strokeWidth={2.5} />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-cyber-yellow shrink-0" strokeWidth={2.5} />
                          )}
                          <span className="text-white/90 font-medium truncate pr-2">{row.criterion}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-white/40 text-xs hidden sm:inline-block">[{row.patient}]</span>
                          <span className={`font-bold text-xs w-16 text-right ${
                            row.status === "ELIGIBLE" ? "text-surgical" : 
                            row.status === "INELIGIBLE" ? "text-iodine" : "text-cyber-yellow"
                          }`}>
                            {row.status}
                          </span>
                          <span className="text-cobalt text-xs font-bold w-8 text-right">{row.confidence}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t-2 border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-white/40 uppercase">Composite Score</span>
                      <span className="font-heading text-2xl font-bold text-surgical">86<span className="text-sm text-white/40">/100</span></span>
                    </div>
                  </div>
                </div>

                {/* Overlapping Match Card */}
                <div className="absolute -bottom-8 -left-8 md:-bottom-10 md:-left-12 w-[85%] max-w-[320px] bg-white border-brutal shadow-brutal p-4 animate-pulse -rotate-2 z-20">
                  <div className="flex items-center gap-3 mb-2 border-b-2 border-charcoal pb-2">
                    <div className="relative w-3 h-3 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-surgical border-[1.5px] border-charcoal animate-ping absolute inset-0 opacity-75" />
                      <span className="w-3 h-3 rounded-full bg-surgical border-[1.5px] border-charcoal absolute inset-0" />
                    </div>
                    <span className="font-heading font-black uppercase text-sm tracking-tight leading-none text-charcoal">Match Confirmed</span>
                  </div>
                  <p className="font-mono text-xs leading-snug font-medium text-charcoal/80">
                    Patient ANON_MH_001 matched to NCT05278920. <span className="font-bold text-surgical">Confidence: 94%</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MagicBlock ER Section - NEW */}
        <section className="px-6 py-16 md:px-12 md:py-24 bg-gradient-to-br from-charcoal via-charcoal to-cobalt/30 border-brutal-b relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern-dark opacity-50" />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.3em] text-surgical mb-4 bg-surgical/10 border border-surgical/30 px-4 py-2">
                <Zap className="w-4 h-4" /> Powered by MagicBlock
              </span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-4">
                Ephemeral Rollups for Healthcare
              </h2>
              <p className="font-mono text-base md:text-lg text-white/70 max-w-2xl mx-auto">
                Patient data deserves the fastest, most private blockchain infrastructure. 
                MagicBlock Ephemeral Rollups deliver sub-50ms transactions with zero gas fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Speed */}
              <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 p-6 hover:border-surgical/50 transition-colors">
                <div className="w-12 h-12 bg-surgical/20 border border-surgical/30 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-surgical" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2 uppercase">Sub-50ms Latency</h3>
                <p className="font-mono text-sm text-white/60 mb-4">
                  Record patient matches and consent in real-time. No waiting for block confirmations.
                </p>
                <div className="flex items-center gap-2 text-surgical font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-surgical animate-pulse" />
                  EPHEMERAL ROLLUP ACTIVE
                </div>
              </div>

              {/* Gasless */}
              <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 p-6 hover:border-cobalt/50 transition-colors">
                <div className="w-12 h-12 bg-cobalt/20 border border-cobalt/30 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-cobalt" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2 uppercase">Zero Gas Fees</h3>
                <p className="font-mono text-sm text-white/60 mb-4">
                  Patients never pay transaction fees. Delegation enables gasless operations on ER.
                </p>
                <div className="flex items-center gap-2 text-cobalt font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-cobalt" />
                  DELEGATED MODE
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-white/5 backdrop-blur-sm border-2 border-white/10 p-6 hover:border-iodine/50 transition-colors">
                <div className="w-12 h-12 bg-iodine/20 border border-iodine/30 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-iodine" />
                </div>
                <h3 className="font-heading text-xl font-bold text-white mb-2 uppercase">TEE Privacy</h3>
                <p className="font-mono text-sm text-white/60 mb-4">
                  Sensitive health data processed in Trusted Execution Environments. Encrypted until consent.
                </p>
                <div className="flex items-center gap-2 text-iodine font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-iodine" />
                  TEE ENCRYPTED
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
              <Link
                href="/patients"
                className="inline-flex items-center gap-3 bg-surgical text-white brutal-btn px-8 py-4 text-sm uppercase"
              >
                <Database className="w-5 h-5" /> Explore On-Chain Data
              </Link>
              <Link
                href="/pipeline"
                className="inline-flex items-center gap-3 bg-white/10 text-white border-2 border-white/20 hover:bg-white hover:text-charcoal brutal-btn px-8 py-4 text-sm uppercase transition-colors"
              >
                <Zap className="w-5 h-5" /> Try ER Demo
              </Link>
            </div>

            {/* Program ID */}
            <div className="mt-12 text-center">
              <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Deployed on Solana Devnet</p>
              <code className="font-mono text-xs text-white/60 bg-white/5 px-4 py-2 border border-white/10">
                3YUtpqBtoJshnq7zWviWFrdWc82pgiDLM9wjfFujGMEg
              </code>
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section id="modules" className="px-6 py-16 md:px-12 md:py-24 bg-cream border-brutal-b relative">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-black mb-12 text-center uppercase tracking-tight text-charcoal">
              System Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { title: "Dashboard", desc: "Central hub for monitoring patient pipeline and active clinical trials.", link: "/dashboard", color: "bg-white", icon: <Database className="w-6 h-6 mb-4 text-cobalt" strokeWidth={2.5} /> },
                { title: "Pipeline", desc: "End-to-end ingestion, anonymization, and matching engine for new records.", link: "/pipeline", color: "bg-white", icon: <Activity className="w-6 h-6 mb-4 text-surgical" strokeWidth={2.5} /> },
                { title: "Results", desc: "Deep-dive view into criteria breakdowns, geo-mapping, and AI reasoning.", link: "/results", color: "bg-white", icon: <Target className="w-6 h-6 mb-4 text-iodine" strokeWidth={2.5} /> },
                { title: "Trial Chat", desc: "RAG-powered conversational assistant to query the trial database naturally.", link: "/chat", color: "bg-white", icon: <Brain className="w-6 h-6 mb-4 text-charcoal" strokeWidth={2.5} /> },
                { title: "Voice AI", desc: "Speak naturally to find clinical trials. Perfect for accessibility & elderly users.", link: "/voice", color: "bg-gradient-to-br from-cobalt/10 to-surgical/10", icon: <Mic className="w-6 h-6 mb-4 text-cobalt" strokeWidth={2.5} />, isNew: true }
              ].map((mod, i) => (
                <Link key={i} href={mod.link} className={`block border-brutal shadow-brutal p-6 transition-transform hover:-translate-y-1 hover:shadow-brutal-sm ${mod.color} relative`}>
                  {(mod as any).isNew && (
                    <span className="absolute top-3 right-3 text-[8px] font-bold bg-surgical text-white px-2 py-1 rounded uppercase">New</span>
                  )}
                  {mod.icon}
                  <h3 className="font-heading text-xl font-bold uppercase mb-3 text-charcoal">{mod.title}</h3>
                  <p className="font-mono text-sm text-charcoal/70 mb-6 min-h-[60px]">{mod.desc}</p>
                  <span className="inline-flex items-center gap-2 text-cobalt font-mono text-xs font-bold uppercase group-hover:text-charcoal transition-colors">
                    Launch Module <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="features" className="px-6 py-20 md:px-12 md:py-28 bg-charcoal text-white border-brutal-b relative bg-grid-pattern-dark">
          <div className="max-w-4xl mx-auto">
             <div className="text-center mb-16">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-surgical mb-4 block">Privacy First</span>
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white">
                The Intelligent Engine
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
              <div className="border-l-2 border-white/20 pl-6 hover:border-surgical transition-colors duration-300">
                <h3 className="font-heading text-2xl font-bold text-surgical mb-3 uppercase tracking-tight">01. Zero Friction</h3>
                <p className="font-mono text-sm text-white/70 leading-relaxed">
                  Manual trial matching takes weeks. We automated the entire pipeline. CogniStream ingests raw patient PDFs/JSONs, redacts PII on the fly, and runs them against active trials in seconds.
                </p>
              </div>
              <div className="border-l-2 border-white/20 pl-6 hover:border-cobalt transition-colors duration-300">
                <h3 className="font-heading text-2xl font-bold text-cobalt mb-3 uppercase tracking-tight">02. Total Privacy</h3>
                <p className="font-mono text-sm text-white/70 leading-relaxed">
                  Strict adherence to HIPAA/GDPR. Local NER models strip all Personal Identifiable Information before records ever touch the ML inference engine, ensuring total data security.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Metrics / Features Section */}
        <section id="technology" className="px-6 py-20 md:px-12 md:py-32 bg-paper border-brutal-b relative">
          <div className="text-center mb-16 relative z-10">
            <h2 className="font-heading text-3xl md:text-4xl font-black mb-4 uppercase tracking-tight text-charcoal">
              Multi-Agent Evaluation
            </h2>
            <p className="font-mono text-base md:text-lg text-center max-w-2xl mx-auto text-charcoal/70">
              Three distinct evaluation engines working in tandem to calculate composite compatibility scores with full explainability.
            </p>
          </div>

          <MetricsScoreCards data={metricsData} />
        </section>

        {/* Bottom CTA */}
        <section id="about" className="px-6 py-24 md:px-12 md:py-32 bg-surgical/10 border-brutal-b flex flex-col items-center justify-center text-center relative overflow-hidden mt-0">
          <GridAnimation 
            cols={50} 
            rows={20} 
            spacing={40} 
            strokeLength={12} 
            strokeWidth={1.5} 
            lineColor="rgba(15,15,15,0.1)"
            className="absolute inset-0 w-full h-full"
          />
          
          <div className="relative z-10 flex flex-col items-center max-w-3xl bg-paper/80 backdrop-blur-md p-8 md:p-12 border-brutal shadow-brutal">
             <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-cobalt mb-4">Ready to Test</span>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-charcoal mb-8">
              See It In Action
            </h2>
            <div className="flex gap-4 flex-col sm:flex-row">
              <Link
                href="/pipeline"
                className="inline-flex items-center justify-center gap-3 bg-charcoal text-white brutal-btn hover:bg-cobalt border-charcoal px-8 py-4 text-lg uppercase"
              >
                Launch Demo <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

        {/* Floating Brutalist Footer */}
        <div className="bg-paper px-4 py-8 pb-12 w-full flex justify-center mt-0">
          <footer className="w-full max-w-7xl bg-charcoal text-white border-brutal shadow-brutal p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden bg-grid-pattern-dark">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 z-10">
              <div className="flex items-center gap-3">
                <Activity className="size-6 stroke-[2px] text-surgical" />
                <div className="font-heading text-xl font-bold uppercase tracking-tight text-white">CogniStream</div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs font-bold uppercase tracking-widest text-white/60">
                <Link href="/dashboard" className="hover:text-cobalt transition-colors">Dashboard</Link>
                <Link href="/pipeline" className="hover:text-surgical transition-colors">Pipeline</Link>
                <Link href="/results" className="hover:text-iodine transition-colors">Results</Link>
                <Link href="/chat" className="hover:text-white transition-colors">AI Chat</Link>
                <Link href="/voice" className="hover:text-surgical transition-colors flex items-center gap-1">Voice AI <span className="text-[8px] bg-surgical text-white px-1 rounded">NEW</span></Link>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-2 z-10">
              <div className="flex gap-2">
                <a href="https://github.com/SnehaThakur19/COHERENCE-26_PARADIGM" target="_blank" rel="noopener noreferrer" className="bg-white/5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase border border-white/10 hover:bg-white hover:text-charcoal hover:border-white transition-colors">GitHub Repository</a>
              </div>
            </div>

            <div className="absolute bottom-2 left-0 right-0 text-center text-[9px] font-mono uppercase tracking-widest text-white/30 z-10">
              © {new Date().getFullYear()} Team Paradigm.
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
