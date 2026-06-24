import Image from "next/image";
import type { ComponentProps } from "react";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "tip";

const CALLOUT_STYLES: Record<
  CalloutType,
  { container: string; icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    container: "border-orange/30 bg-orange/5 text-grey-700",
    icon: Info,
  },
  warning: {
    container: "border-error/30 bg-error/5 text-grey-700",
    icon: AlertTriangle,
  },
  tip: {
    container: "border-success/30 bg-success/5 text-grey-700",
    icon: Lightbulb,
  },
};

function Callout({
  type = "info",
  children,
}: {
  type?: CalloutType;
  children: React.ReactNode;
}) {
  const { container, icon: Icon } = CALLOUT_STYLES[type];
  return (
    <aside
      className={cn(
        "my-6 flex items-start gap-3 rounded-xl border p-5",
        container,
      )}
    >
      <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-orange" />
      <div className="flex-1 [&>p]:m-0">{children}</div>
    </aside>
  );
}

function MdxImage({ src, alt, ...rest }: ComponentProps<"img">) {
  if (!src) return null;
  return (
    <span className="my-8 block overflow-hidden rounded-xl">
      <Image
        src={src}
        alt={alt ?? ""}
        width={1200}
        height={675}
        className="h-auto w-full object-cover"
        {...(rest as object)}
      />
    </span>
  );
}

function Video({ src, title }: { src: string; title?: string }) {
  return (
    <div className="my-8 aspect-video overflow-hidden rounded-xl">
      <iframe
        src={src}
        title={title ?? "video"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

export const mdxComponents = {
  Callout,
  Image: MdxImage,
  img: MdxImage,
  Video,
  h2: (props: ComponentProps<"h2">) => (
    <h2 className="mt-12 font-anton text-h3 uppercase text-navy" {...props} />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3 className="mt-8 font-anton text-xl uppercase text-navy" {...props} />
  ),
  p: (props: ComponentProps<"p">) => (
    <p className="my-4 text-justify leading-relaxed text-grey-700" {...props} />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-grey-700" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-grey-700" {...props} />
  ),
  a: (props: ComponentProps<"a">) => (
    <a className="font-semibold text-orange hover:text-orange-600" {...props} />
  ),
  strong: (props: ComponentProps<"strong">) => (
    <strong className="font-semibold text-navy" {...props} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="my-6 border-l-4 border-orange bg-grey-100 p-5 italic text-grey-700"
      {...props}
    />
  ),
};
