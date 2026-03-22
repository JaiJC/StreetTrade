import { Link } from 'react-router-dom';
import {
  ScanEye,
  BrainCircuit,
  DatabaseZap,
  ListChecks,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import StatsBar from '../components/StatsBar';

const steps = [
  {
    icon: <ScanEye size={28} />,
    title: 'Street View Scan',
    description:
      'We crawl Google Street View imagery to detect storefronts, signs, and physical businesses that exist in the real world.',
  },
  {
    icon: <BrainCircuit size={28} />,
    title: 'AI Analysis',
    description:
      'Our vision models extract business names, categories, and operating signals from storefront imagery with high accuracy.',
  },
  {
    icon: <DatabaseZap size={28} />,
    title: 'Cross-Reference',
    description:
      'We compare detected businesses against Google Maps, Yelp, and other directories to find the ones that are completely missing.',
  },
  {
    icon: <ListChecks size={28} />,
    title: 'Verified Results',
    description:
      'Browse a curated map of invisible businesses with confidence scores, location data, and category tags ready for outreach.',
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute top-96 -right-48 h-[400px] w-[400px] rounded-full bg-cyan-500/[0.05] blur-[100px]" />
        <div className="absolute top-[800px] -left-32 h-[300px] w-[300px] rounded-full bg-accent/[0.04] blur-[80px]" />
      </div>

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pt-24 pb-12 text-center">
        {/* Badge */}
        <div className="fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-4 py-1.5 text-sm font-medium text-primary-light">
          <Sparkles size={14} />
          <span>Hackathon 2026 Project</span>
        </div>

        <h1
          className="fade-in-up max-w-4xl text-5xl leading-[1.1] font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
          style={{ animationDelay: '100ms' }}
        >
          Discover What{' '}
          <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Google Can't Find
          </span>
        </h1>

        <p
          className="fade-in-up mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl"
          style={{ animationDelay: '200ms' }}
        >
          Millions of real businesses are invisible online -- no Google listing,
          no website, no digital footprint. StreetTrade uses Street View AI to
          find them.
        </p>

        <div
          className="fade-in-up mt-10 flex flex-col items-center gap-4 sm:flex-row"
          style={{ animationDelay: '300ms' }}
        >
          <Link
            to="/search"
            className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-gray-950 shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all hover:bg-primary-light hover:shadow-[0_0_40px_rgba(16,185,129,0.35)]"
          >
            Start Searching
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-3.5 text-base font-semibold text-gray-300 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            Learn More
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-gray-600">
          <div className="h-8 w-5 rounded-full border-2 border-gray-600 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-gray-500" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsBar />

      {/* How It Works */}
      <section id="how-it-works" className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How It{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Four steps from Street View to actionable business data.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={i}
                className="fade-in-up group relative rounded-2xl border border-white/[0.06] bg-surface-light/40 p-6 transition-all duration-500 hover:border-primary/20 hover:bg-surface-light/70"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {/* Step number */}
                <span className="absolute top-4 right-4 text-xs font-bold text-white/10 select-none">
                  0{i + 1}
                </span>

                {/* Connector line (not on last card) */}
                {i < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-3 hidden h-px w-6 bg-gradient-to-r from-primary/30 to-transparent lg:block" />
                )}

                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                  {step.icon}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Glow behind card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-96 rounded-full bg-primary/[0.08] blur-[100px]" />
          </div>

          <div className="relative rounded-3xl border border-white/[0.06] bg-surface-light/30 px-8 py-14 backdrop-blur-sm">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to uncover hidden businesses?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Search any Canadian street address and see what businesses exist
              in the real world but not on the internet.
            </p>
            <Link
              to="/search"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-lg font-semibold text-gray-950 shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all hover:bg-primary-light hover:shadow-[0_0_40px_rgba(16,185,129,0.35)]"
            >
              Start Searching
              <ArrowRight
                size={20}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
