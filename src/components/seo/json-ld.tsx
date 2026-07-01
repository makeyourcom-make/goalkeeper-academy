/**
 * Renders a JSON-LD (schema.org) script tag. Server component, safe: the data
 * is our own structured object, serialized to JSON.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
