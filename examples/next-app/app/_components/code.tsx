import { codeToHtml, createCssVariablesTheme } from "shiki";
import { CopyButton } from "./copy-button";

const theme = createCssVariablesTheme({
  name: "perf-trail",
  variablePrefix: "--shiki-",
  fontStyle: true,
});

export async function Code({
  code,
  label,
  language,
}: {
  code: string;
  label: string;
  language: "yaml" | "tsx" | "ts" | "json" | "markdown" | "sh";
}) {
  const html = await codeToHtml(code, {
    lang: language === "sh" ? "shellscript" : language,
    theme,
  });
  return (
    <div className="code">
      <div className="code-bar">
        <span className="code-file">{label}</span>
        <CopyButton text={code} label={label} />
      </div>
      <div className="code-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
