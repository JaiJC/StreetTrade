import DetectionDemo from "../components/DetectionDemo";

export default function DemoPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">See the AI in action</h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload any storefront photo and watch StreetTrade identify the business.
        </p>
      </div>
      <DetectionDemo />
    </section>
  );
}
