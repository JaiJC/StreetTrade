const STEPS = [
  {
    title: "1) Fetch imagery",
    detail:
      "StreetTrade pulls Google Street View static imagery around a target area, with Mapillary as a fallback source.",
  },
  {
    title: "2) OCR and visual analysis",
    detail:
      "Google Vision extracts signage text and Moondream classifies storefront type, business name, and confidence.",
  },
  {
    title: "3) Category normalization",
    detail:
      "Raw model outputs are mapped into practical categories like restaurant, grocery, services, and auto.",
  },
  {
    title: "4) Cross-reference POI data",
    detail:
      "Potential matches are checked against Overture, Yelp, and Foursquare to infer online visibility.",
  },
  {
    title: "5) Save + rank",
    detail:
      "High-confidence candidates are stored in the StreetTrade database and surfaced in local search results.",
  },
];

export default function HowItWorksPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">How StreetTrade works</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Instead of waiting for owners to register online, we discover businesses directly from
          the street and use AI to classify what is visible in storefront imagery.
        </p>
      </div>
      <div className="grid gap-4">
        {STEPS.map((step) => (
          <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">{step.title}</h2>
            <p className="text-sm text-slate-600">{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
