import s from "./landing.module.css";
export function Testimonial() {
  return (
    <section
      id="temoignage"
      data-testid="section-testimonial"
      className={`${s.section} border-t border-[#e4e4ee] bg-white`}
    >
      <div className={s.wrap}>
        <figure
          data-testid="testimonial-card"
          className={`${s.reveal} mx-auto flex max-w-[860px] flex-col items-center gap-6 text-center`}
        >
          <blockquote
            className={`${s.heading} text-[26px] font-bold leading-snug`}
          >
            {
              "« Avant, chaque soir je m'asseyais avec cahier et calculatrice pour savoir qui a payé, qui doit, combien de colis sont sortis… Ça me prenait des heures et à la fin ça tombait même pas juste. Maintenant avec Warko, tout est déjà là. Je regarde mon bilan en deux minutes et je dors tranquille. »"
            }
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef0ff] font-bold text-[#4338ca]">
              MA
            </span>
            <span className="text-left">
              <span className="block font-bold">Mondesire Abesse</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
