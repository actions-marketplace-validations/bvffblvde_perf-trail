import { CopyButton } from "./copy-button";

export function Code({ code, label, language }: { code: string; label: string; language: string }) {
  return (
    <div className="code">
      <div className="code-bar">
        <span>{label}</span>
        <CopyButton text={code} label={label} />
      </div>
      <pre data-language={language}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
