// Renders a JSON-LD structured-data block. Server component — the script ships
// in the initial HTML so crawlers and AI answer engines read it without JS.

export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
