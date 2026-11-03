import React from 'react';

// Render the model's common Markdown subset as React text nodes, never as HTML.
function emphasis(text) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

export default function EvidenceAnswer({text}) {
  return <div className="manual-answer">{text.split('\n').map((line, i) => {
    const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (heading) return <div className="answer-heading" key={i}><strong>{emphasis(heading[1])}</strong></div>;
    if (!line.trim()) return <div className="answer-gap" key={i} aria-hidden="true"/>;
    return <div className="answer-line" key={i}>{emphasis(line)}</div>;
  })}</div>;
}
