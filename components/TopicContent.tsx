"use client";
import { useState } from "react";

function CodeBlock({ code }: { code: string }){
  const [copied, setCopied] = useState(false);
  return (
    <div style={{position:'relative'}}>
      <pre className="code"><code>{code}</code></pre>
      <button className="copy-btn" style={{position:'absolute', right:8, top:8}} onClick={async ()=>{ await navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),1500)}}>{copied? 'Copied' : 'Copy'}</button>
    </div>
  );
}

export default function TopicContent({ topic }: { topic: any }){
  return (
    <div>
      <h2 style={{marginTop:0}}>{topic.name}</h2>
      <p style={{color:'#9aa4b2'}}>{topic.category}</p>
      <section style={{marginTop:12}}>
        <h4>Intent</h4>
        <p>{topic.content?.intent}</p>
      </section>
      {topic.content?.analogy && (
        <section>
          <h4>Analogy</h4>
          <p>{topic.content.analogy}</p>
        </section>
      )}
      {topic.content?.explanation && (
        <section>
          <h4>Explanation</h4>
          <p>{topic.content.explanation}</p>
        </section>
      )}
      {topic.content?.examples?.length > 0 && (
        <section>
          <h4>Examples</h4>
          {topic.content.examples.map((ex: any, idx: number)=> (
            <div key={idx} style={{marginBottom:12}}>
              <div style={{color:'#9aa4b2'}}>{ex.title}</div>
              {ex.code && <CodeBlock code={ex.code} />}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
