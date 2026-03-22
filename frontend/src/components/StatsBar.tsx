import { useEffect, useState, useRef } from 'react';
import { EyeOff, Globe, MapPinOff } from 'lucide-react';

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}

const stats: StatItem[] = [
  {
    icon: <EyeOff size={24} />,
    value: 56,
    suffix: '%',
    label: 'of businesses missing from Google',
  },
  {
    icon: <Globe size={24} />,
    value: 30,
    suffix: '%',
    label: 'have no website at all',
  },
  {
    icon: <MapPinOff size={24} />,
    value: 2.1,
    suffix: 'M+',
    label: 'invisible businesses in Canada',
    decimals: 1,
  },
];

function useCountUp(target: number, duration = 1800, decimals = 0) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration, decimals]);

  return { value, ref };
}

function StatCard({ stat, index }: { stat: StatItem; index: number }) {
  const { value, ref } = useCountUp(stat.value, 2000, stat.decimals ?? 0);

  return (
    <div
      ref={ref}
      className="group relative flex flex-1 flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface-light/50 px-6 py-7 text-center transition-all duration-500 hover:border-primary/20 hover:bg-surface-light"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)]" />

      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
        {stat.icon}
      </div>

      <div className="relative">
        <span className="block text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {value}
          {stat.suffix}
        </span>
        <span className="mt-1 block text-sm text-gray-400">{stat.label}</span>
      </div>
    </div>
  );
}

export default function StatsBar() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} />
        ))}
      </div>
    </section>
  );
}
