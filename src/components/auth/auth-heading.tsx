import Link from "next/link";

/** Every auth screen opens the same way, so the four feel like one product. */
export function AuthHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7">
      <p className="placard mb-3">{eyebrow}</p>
      <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-cloud">
        {title}
      </h1>
      <p className="mt-2 text-sm text-fog text-pretty">{description}</p>
    </header>
  );
}

export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-fog">
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-lagoon underline-offset-4 transition-colors hover:text-cloud hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}
