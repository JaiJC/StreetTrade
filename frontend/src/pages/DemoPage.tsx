import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  ScanSearch,
  Tags,
  Share2,
  CheckCircle2,
  Play,
  RotateCcw,
  MapPin,
  Star,
  Instagram,
  Facebook,
  ExternalLink,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepStatus = 'pending' | 'active' | 'complete';

interface PipelineStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS: PipelineStep[] = [
  { id: 0, title: 'Capture', subtitle: 'Street View Image Capture', icon: Camera },
  { id: 1, title: 'Analyze', subtitle: 'VLM Storefront Detection', icon: ScanSearch },
  { id: 2, title: 'Classify', subtitle: 'Business Classification', icon: Tags },
  { id: 3, title: 'Verify', subtitle: 'Social Media Cross-Reference', icon: Share2 },
];

const ANALYSIS_LINES = [
  '> Initializing Vision-Language Model...',
  '> Processing frame buffer [1920x1080]...',
  '> Detecting storefront regions...',
  '> Region #1: Signage detected (conf: 0.94)',
  '> Region #2: Window display analyzed',
  '> Region #3: Awning text extraction...',
  '> OCR Result: "Nonna\'s Kitchen"',
  '> Storefront classification: RESTAURANT',
  '> Detection complete. 1 business found.',
];

const STEP_DURATIONS = [2500, 3500, 3000, 2500];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_12px_2px_rgba(232,140,10,0.6)]"
        style={{
          animation: 'scanDown 2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function CameraGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid lines */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/3 left-0 right-0 h-px bg-primary" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-primary" />
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-primary" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-primary" />
      </div>
      {/* Corner brackets */}
      {[
        'top-2 left-2 border-t-2 border-l-2',
        'top-2 right-2 border-t-2 border-r-2',
        'bottom-2 left-2 border-b-2 border-l-2',
        'bottom-2 right-2 border-b-2 border-r-2',
      ].map((pos) => (
        <div key={pos} className={`absolute ${pos} w-6 h-6 border-primary/50`} />
      ))}
      {/* REC indicator */}
      <div className="absolute top-3 right-10 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-400 text-xs font-mono tracking-wider">REC</span>
      </div>
      {/* Timestamp */}
      <div className="absolute bottom-3 left-3 text-xs font-mono text-primary/50">
        CAM-04 | 40.7128N 74.0060W
      </div>
    </div>
  );
}

function BoundingBoxOverlay({ progress }: { progress: number }) {
  const boxes = [
    { top: '15%', left: '10%', width: '55%', height: '40%', label: 'Signage', delay: 0 },
    { top: '55%', left: '20%', width: '35%', height: '30%', label: 'Window Display', delay: 0.3 },
    { top: '8%', left: '12%', width: '50%', height: '15%', label: "Nonna's Kitchen", delay: 0.6 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((box, i) => {
        const visible = progress > box.delay;
        return (
          <div
            key={i}
            className="absolute border-2 border-primary transition-all duration-500"
            style={{
              top: box.top,
              left: box.left,
              width: visible ? box.width : '0%',
              height: visible ? box.height : '0%',
              opacity: visible ? 1 : 0,
            }}
          >
            {visible && (
              <span className="absolute -top-5 left-0 text-xs font-mono bg-primary text-surface px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                {box.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TypingTerminal({ lines, visibleCount }: { lines: string[]; visibleCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div
      ref={containerRef}
      className="bg-surface rounded-lg border border-primary/20 p-4 font-mono text-sm h-48 overflow-y-auto"
    >
      {lines.slice(0, visibleCount).map((line, i) => (
        <div
          key={i}
          className="text-primary-light leading-relaxed animate-fadeIn"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {line}
          {i === visibleCount - 1 && (
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}

function ConfidenceMeter({ target, active }: { target: number; active: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 1800;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Confidence</span>
        <span className="text-primary font-mono font-bold">{value}%</span>
      </div>
      <div className="h-3 bg-surface rounded-full overflow-hidden border border-surface-lighter">
        <div
          className="h-full bg-gradient-to-r from-primary-dark via-primary to-primary-light rounded-full transition-all duration-100"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ClassificationCard({ active }: { active: boolean }) {
  const fields = [
    { label: 'Name', value: "Nonna's Kitchen", delay: 0 },
    { label: 'Category', value: 'Italian Restaurant', delay: 600 },
    { label: 'Sub-type', value: 'Family Dining', delay: 1000 },
    { label: 'Source', value: 'Awning + Window Signage', delay: 1400 },
  ];

  const [visibleFields, setVisibleFields] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleFields(0);
      return;
    }
    const timers = fields.map((f, i) =>
      setTimeout(() => setVisibleFields(i + 1), f.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div
          key={field.label}
          className="flex items-center gap-3 transition-all duration-300"
          style={{ opacity: i < visibleFields ? 1 : 0, transform: i < visibleFields ? 'translateX(0)' : 'translateX(-12px)' }}
        >
          <span className="text-gray-500 text-sm w-20 shrink-0">{field.label}</span>
          <span className="text-white font-medium">{field.value}</span>
        </div>
      ))}
      <div className="pt-2">
        <ConfidenceMeter target={87} active={active && visibleFields >= 3} />
      </div>
    </div>
  );
}

function VerificationPanel({ active }: { active: boolean }) {
  const checks = [
    { icon: Instagram, label: 'Instagram geotag match found', color: 'text-pink-400', delay: 0 },
    { icon: Facebook, label: 'Facebook business page confirmed', color: 'text-blue-400', delay: 800 },
    { icon: MapPin, label: 'Google Maps listing verified', color: 'text-red-400', delay: 1400 },
    { icon: Star, label: 'Yelp profile matched (4.3 stars)', color: 'text-yellow-400', delay: 1900 },
  ];

  const [visibleChecks, setVisibleChecks] = useState(0);

  useEffect(() => {
    if (!active) {
      setVisibleChecks(0);
      return;
    }
    const timers = checks.map((c, i) =>
      setTimeout(() => setVisibleChecks(i + 1), c.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-3">
      {checks.map((check, i) => {
        const Icon = check.icon;
        const visible = i < visibleChecks;
        return (
          <div
            key={check.label}
            className="flex items-center gap-3 transition-all duration-500"
            style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-16px)' }}
          >
            <div className={`w-8 h-8 rounded-lg bg-surface flex items-center justify-center ${check.color}`}>
              <Icon size={16} />
            </div>
            <span className="text-gray-300 text-sm">{check.label}</span>
            {visible && (
              <CheckCircle2 size={16} className="text-primary ml-auto animate-scaleIn" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FinalResultCard({ visible }: { visible: boolean }) {
  return (
    <div
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
      }}
    >
      <div className="bg-gradient-to-br from-primary/10 via-surface-light to-surface-light rounded-2xl border border-primary/30 p-6 shadow-lg shadow-primary/5">
        <div className="flex items-start gap-4">
          {/* Restaurant "avatar" */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-2xl shrink-0">
            🍝
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white">Nonna's Kitchen</h3>
            <p className="text-primary-light text-sm mt-0.5">Italian Restaurant - Family Dining</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> 127 Mulberry St, NYC
              </span>
              <span className="flex items-center gap-1">
                <Star size={12} className="text-accent" /> 4.3
              </span>
              <span className="bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-mono font-bold">
                87% confidence
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Street View', 'Instagram', 'Facebook', 'Yelp'].map((src) => (
                <span
                  key={src}
                  className="text-xs bg-surface px-2 py-1 rounded border border-surface-lighter text-gray-400"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-surface-lighter flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Discovered via Hidden City AI Pipeline
          </span>
          <a
            href="#"
            className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            View full profile <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Step ───────────────────────────────────────────────────────────

function TimelineStep({
  step,
  status,
  isLast,
}: {
  step: PipelineStep;
  status: StepStatus;
  isLast: boolean;
}) {
  const Icon = step.icon;
  return (
    <div className="flex gap-4">
      {/* Timeline track */}
      <div className="flex flex-col items-center">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 border-2
            ${status === 'complete' ? 'bg-primary border-primary text-white' : ''}
            ${status === 'active' ? 'border-primary text-primary bg-primary/10 shadow-[0_0_16px_rgba(232,140,10,0.3)] animate-pulse' : ''}
            ${status === 'pending' ? 'border-surface-lighter text-gray-600 bg-surface-light' : ''}
          `}
        >
          {status === 'complete' ? <CheckCircle2 size={20} /> : <Icon size={18} />}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-8 my-1">
            <div
              className="w-full h-full transition-colors duration-500"
              style={{
                background:
                  status === 'complete'
                    ? 'linear-gradient(to bottom, #e88c0a, #e88c0a)'
                    : status === 'active'
                    ? 'linear-gradient(to bottom, #e88c0a, #374151)'
                    : '#374151',
              }}
            />
          </div>
        )}
      </div>
      {/* Label */}
      <div className="pb-8">
        <h3
          className={`font-semibold text-sm transition-colors duration-300 ${
            status === 'pending' ? 'text-gray-500' : 'text-white'
          }`}
        >
          {step.title}
        </h3>
        <p
          className={`text-xs transition-colors duration-300 ${
            status === 'pending' ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          {step.subtitle}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = not started
  const [analysisLineCount, setAnalysisLineCount] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const timeoutRefs = useRef<number[]>([]);

  const isRunning = currentStep >= 0 && currentStep <= 3;
  const isFinished = currentStep > 3;

  const clearTimers = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setCurrentStep(-1);
    setAnalysisLineCount(0);
    setAnalyzeProgress(0);
    setShowResult(false);
  }, [clearTimers]);

  const startDemo = useCallback(() => {
    clearTimers();
    setAnalysisLineCount(0);
    setAnalyzeProgress(0);
    setShowResult(false);
    setCurrentStep(0);
  }, [clearTimers]);

  // Auto-progress through steps
  useEffect(() => {
    if (currentStep < 0 || currentStep > 3) return;

    const timer = window.setTimeout(() => {
      if (currentStep < 3) {
        setCurrentStep((s) => s + 1);
      } else {
        // Finished all steps
        setCurrentStep(4);
        const t = window.setTimeout(() => setShowResult(true), 400);
        timeoutRefs.current.push(t);
      }
    }, STEP_DURATIONS[currentStep]);

    timeoutRefs.current.push(timer);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Analysis typing effect (step 1)
  useEffect(() => {
    if (currentStep !== 1) return;
    setAnalysisLineCount(0);
    setAnalyzeProgress(0);

    const lineTimers = ANALYSIS_LINES.map((_, i) => {
      const t = window.setTimeout(() => {
        setAnalysisLineCount(i + 1);
        setAnalyzeProgress((i + 1) / ANALYSIS_LINES.length);
      }, i * 350);
      timeoutRefs.current.push(t);
      return t;
    });

    return () => lineTimers.forEach(clearTimeout);
  }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const getStatus = (stepId: number): StepStatus => {
    if (currentStep < 0) return 'pending';
    if (stepId < currentStep) return 'complete';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Inline keyframe styles */}
      <style>{`
        @keyframes scanDown {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out both; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out both; }
      `}</style>

      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <p className="text-primary font-mono text-sm tracking-wider uppercase mb-2">
          AI Detection Pipeline
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          How Hidden City Discovers{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">
            Hidden Businesses
          </span>
        </h1>
        <p className="text-gray-400 mt-3 max-w-2xl text-base">
          Watch our AI pipeline process street-level imagery in real-time,
          identifying storefronts and cross-referencing social media to uncover
          businesses that are invisible to traditional mapping services.
        </p>

        {/* Start / Reset button */}
        <div className="mt-6">
          {!isRunning && !isFinished && (
            <button
              onClick={startDemo}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25 cursor-pointer"
            >
              <Play size={18} /> Start Demo
            </button>
          )}
          {isFinished && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-surface-light hover:bg-surface-lighter text-gray-300 font-semibold px-6 py-3 rounded-xl border border-surface-lighter transition-all duration-200 cursor-pointer"
            >
              <RotateCcw size={18} /> Run Again
            </button>
          )}
          {isRunning && (
            <div className="inline-flex items-center gap-2 text-primary text-sm font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Processing... Step {currentStep + 1} of 4
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Timeline */}
          <div className="lg:col-span-3">
            <div className="sticky top-8">
              {STEPS.map((step, i) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  status={getStatus(step.id)}
                  isLast={i === STEPS.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Right: Content area */}
          <div className="lg:col-span-9 space-y-6">
            {/* Simulated camera feed */}
            <div className="relative aspect-video bg-gradient-to-br from-surface-light via-surface to-surface-light rounded-2xl overflow-hidden border border-surface-lighter">
              {/* Fake street scene shapes */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute bottom-0 left-[8%] w-[30%] h-[65%] bg-surface-lighter rounded-t-sm" />
                <div className="absolute bottom-0 left-[42%] w-[25%] h-[75%] bg-surface-lighter/80 rounded-t-sm" />
                <div className="absolute bottom-0 right-[8%] w-[20%] h-[55%] bg-surface-lighter/60 rounded-t-sm" />
                <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gray-700/50" />
              </div>
              {/* Awning shape */}
              <div className="absolute top-[20%] left-[10%] w-[52%] h-[8%] bg-red-900/30 rounded-b-sm" />
              <div className="absolute top-[18%] left-[12%] px-3 py-1 text-[10px] sm:text-xs font-mono text-gray-500/60 tracking-wider">
                NONNA'S KITCHEN
              </div>

              <CameraGrid />

              {/* Step 0: Scanning animation */}
              {currentStep === 0 && <ScanLine />}

              {/* Step 1: Bounding boxes */}
              {(currentStep === 1 || (currentStep > 1 && currentStep <= 4)) && (
                <BoundingBoxOverlay progress={currentStep === 1 ? analyzeProgress : 1} />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent" />
            </div>

            {/* Step detail panels */}
            <div className="min-h-[260px]">
              {/* Step 0: Capture */}
              {currentStep === 0 && (
                <div className="animate-fadeIn bg-surface-light rounded-xl border border-surface-lighter p-5">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Camera size={16} className="text-primary" />
                    Capturing Street View Frame
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="font-mono text-primary">40.7128N, 74.0060W</span>
                    <span className="text-surface-lighter">|</span>
                    <span>Heading: 127 deg</span>
                    <span className="text-surface-lighter">|</span>
                    <span>FOV: 90 deg</span>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1 bg-surface rounded-lg p-3 border border-surface-lighter">
                      <div className="text-xs text-gray-500 mb-1">Resolution</div>
                      <div className="text-sm text-white font-mono">1920 x 1080</div>
                    </div>
                    <div className="flex-1 bg-surface rounded-lg p-3 border border-surface-lighter">
                      <div className="text-xs text-gray-500 mb-1">Frame</div>
                      <div className="text-sm text-white font-mono">#004271</div>
                    </div>
                    <div className="flex-1 bg-surface rounded-lg p-3 border border-surface-lighter">
                      <div className="text-xs text-gray-500 mb-1">Quality</div>
                      <div className="text-sm text-primary font-mono">Excellent</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Analyze */}
              {currentStep === 1 && (
                <div className="animate-fadeIn bg-surface-light rounded-xl border border-surface-lighter p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <ScanSearch size={16} className="text-primary" />
                    VLM Analysis Output
                  </h3>
                  <TypingTerminal lines={ANALYSIS_LINES} visibleCount={analysisLineCount} />
                </div>
              )}

              {/* Step 2: Classify */}
              {currentStep === 2 && (
                <div className="animate-fadeIn bg-surface-light rounded-xl border border-surface-lighter p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Tags size={16} className="text-primary" />
                    Business Classification
                  </h3>
                  <ClassificationCard active={currentStep === 2} />
                </div>
              )}

              {/* Step 3: Verify */}
              {currentStep === 3 && (
                <div className="animate-fadeIn bg-surface-light rounded-xl border border-surface-lighter p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Share2 size={16} className="text-primary" />
                    Cross-Reference Verification
                  </h3>
                  <VerificationPanel active={currentStep === 3} />
                </div>
              )}

              {/* Final result */}
              {isFinished && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400 font-mono text-center">
                    -- Pipeline complete. Business discovered. --
                  </p>
                  <FinalResultCard visible={showResult} />
                </div>
              )}

              {/* Idle state */}
              {currentStep === -1 && (
                <div className="flex flex-col items-center justify-center h-56 text-gray-600">
                  <ScanSearch size={40} className="mb-3 opacity-40" />
                  <p className="text-sm">Press <span className="text-primary">Start Demo</span> to begin the detection pipeline</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
