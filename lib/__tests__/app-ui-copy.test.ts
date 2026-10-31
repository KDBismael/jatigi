import { it, expect } from "vitest";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(path.join(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [path.join(dir, e.name)]
        : [],
  );
}
it("has no displayed pseudo-icons, em dashes or emoji in app and component strings", () => {
  const found: string[] = [];
  for (const file of [...files("app"), ...files("components")]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    function visit(n: ts.Node) {
      if (
        ts.isStringLiteralLike(n) ||
        ts.isJsxText(n) ||
        ts.isTemplateHead(n) ||
        ts.isTemplateMiddle(n) ||
        ts.isTemplateTail(n)
      ) {
        const text = n.text;
        if (
          /[—→←✓○▾▴✕]|\p{Emoji_Presentation}/u.test(text) ||
          /exemple illustratif|exemple fictif|données d[’']exemple/i.test(text)
        )
          found.push(
            `${file}:${source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1} ${text.trim().slice(0, 100)}`,
          );
      }
      ts.forEachChild(n, visit);
    }
    visit(source);
  }
  expect(found).toEqual([]);
});
