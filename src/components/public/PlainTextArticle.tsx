// `/hukuki/[slug]` ve `/blog/[slug]` aynı düz-metinden zengin görünümlü
// makale gövdesi üreten mantığı paylaşır — burada tek yerde tutulur.
export function PlainTextArticle({ content }: { content: string }) {
  return (
    <article className="legal-content text-muted-foreground text-sm md:text-base leading-[1.9] space-y-4">
      {content.split('\n\n').map((paragraph, i) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');
        if (lines.length === 1) {
          const line = lines[0].trim();
          if (/^\d+\./.test(line) && line.length < 120 && !line.includes('.  ')) {
            return (
              <h2 key={i} className="font-serif text-xl md:text-2xl text-foreground mt-10 mb-4 first:mt-0">
                {line}
              </h2>
            );
          }
          if (line === line.toUpperCase() && line.length > 5 && line.length < 200 && /[A-ZÇĞİÖŞÜ]/.test(line)) {
            return (
              <h3 key={i} className="font-bold text-foreground uppercase tracking-wider text-sm mt-8 mb-3">
                {line}
              </h3>
            );
          }
        }

        if (trimmed.includes('\t') || /\s{3,}/.test(trimmed)) {
          return (
            <div key={i} className="bg-muted rounded-xl p-4 md:p-6 border border-border overflow-x-auto">
              <pre className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {trimmed}
              </pre>
            </div>
          );
        }

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {trimmed.split('\n').map((line, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="text-[var(--primary)] mt-1.5 flex-shrink-0">•</span>
                  <span>{line.replace(/^[•\-]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {line}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </article>
  );
}
