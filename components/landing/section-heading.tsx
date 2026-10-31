import s from "./landing.module.css";
export function SectionHeading({
  eyebrow,
  title,
  description,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  dark?: boolean;
}) {
  return (
    <div className={`${s.reveal} mb-9 flex max-w-3xl flex-col gap-4`}>
      <span className={`${s.eyebrow} ${dark ? "!text-[#a5b4fc]" : ""}`}>
        {eyebrow}
      </span>
      <h2 className={s.title}>{title}</h2>
      {description && (
        <p className={`${s.lead} ${dark ? "!text-[#b9bdd8]" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}
