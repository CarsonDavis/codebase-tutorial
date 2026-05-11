import { GlossaryPopovers } from "./GlossaryPopovers";

export function MarkdownBody({ html }: { html: string }) {
  return (
    <>
      <div
        className="prose prose-invert max-w-none"
        // Server-rendered HTML from our trusted pipeline.
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <GlossaryPopovers />
    </>
  );
}
