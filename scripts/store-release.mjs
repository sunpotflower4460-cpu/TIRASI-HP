// Release material for the App Store edition.
//   node scripts/store-release.mjs licenses   rebuild src/store/licenses.json
//   node scripts/store-release.mjs site       write the privacy and support pages to docs/appstore/site/
//   node scripts/store-release.mjs check      fail while anything required for submission is missing
// `licenses` reads the Swift packages from SPM_CHECKOUTS (Xcode's SourcePackages/checkouts) when set.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const legal = () => JSON.parse(read("src/store/legal.json"));
const licensesPath = "src/store/licenses.json";

/** npm packages whose code ends up in the app, with everything they depend on. */
const shipped = ["react", "react-dom", "html2canvas", "@capacitor/core", "@capacitor/ios", "@capacitor/filesystem", "@capacitor/share", "@capacitor-community/media"];
const swiftPackages = ["SDWebImage", "capacitor-swift-pm", "ion-ios-filesystem"];

function licenseText(directory) {
  if (!existsSync(directory)) return "";
  const file = readdirSync(directory).find((name) => /^(license|licence|copying)/i.test(name));
  return file ? readFileSync(join(directory, file), "utf8").trim() : "";
}

function packageDirectory(name) {
  return [join(root, "node_modules", name), join(root, "ios-store/node_modules", name)].find(existsSync);
}

const mit = (author) => `MIT License

Copyright (c) ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

function buildLicenses() {
  const entries = [];
  const seen = new Set();
  const queue = [...shipped];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const directory = packageDirectory(name);
    if (!directory) throw new Error(`${name} is not installed (npm ci in the root and in ios-store).`);
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    queue.push(...Object.keys(manifest.dependencies ?? {}));
    // A package without a licence file still needs its notice: for MIT, the
    // standard text with the author the package names.
    const author = typeof manifest.author === "string" ? manifest.author : manifest.author?.name;
    const text = licenseText(directory) || (manifest.license === "MIT" && author ? mit(author) : "");
    if (!text) throw new Error(`No licence text for ${name}.`);
    entries.push({ name, license: String(manifest.license ?? "unknown"), text });
  }
  for (const file of readdirSync(join(root, "public/licenses")).sort()) {
    const apache = file.includes("Apache");
    entries.push({ name: file.replace(/-(OFL|Apache-2\.0)\.txt$/, ""), license: apache ? "Apache-2.0" : "OFL-1.1", text: read(`public/licenses/${file}`).trim() });
  }
  const checkouts = process.env.SPM_CHECKOUTS;
  const previous = existsSync(join(root, licensesPath)) ? JSON.parse(read(licensesPath)) : [];
  for (const name of swiftPackages) {
    const text = checkouts ? licenseText(join(checkouts, name)) : previous.find((item) => item.name === name)?.text;
    if (!text) throw new Error(`No licence text for ${name}. Set SPM_CHECKOUTS to Xcode's SourcePackages/checkouts.`);
    entries.push({ name, license: "MIT", text });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(root, licensesPath), `${JSON.stringify(entries, null, 1)}\n`);
  console.log(`${entries.length} licences written to ${licensesPath}`);
}

const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const page = (title, body) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
body { margin: 0 auto; max-width: 680px; padding: 24px 18px 60px; font: 16px/1.9 system-ui, sans-serif; color: #1e2140; background: #f8f5ef; }
h1 { font-size: 22px; line-height: 1.5; } h2 { margin-top: 32px; font-size: 17px; } a { color: #232a57; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

function buildSite() {
  const data = legal();
  const out = join(root, "docs/appstore/site");
  mkdirSync(out, { recursive: true });
  const contact = data.contact || "（未記入）";
  const contactHtml = /^[^\s@]+@[^\s@]+$/.test(contact) ? `<a href="mailto:${escape(contact)}">${escape(contact)}</a>` : escape(contact);
  const footer = `<p>運営者：${escape(data.operator || "（未記入）")}<br>お問い合わせ：${contactHtml}</p>`;
  const privacy = [
    `<h1>${escape(data.appName)}<br>プライバシーポリシー</h1>`,
    `<p>${escape(data.intro)}</p>`,
    ...data.sections.map((s) => `<h2>${escape(s.heading)}</h2>\n${s.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("\n")}`),
    `<h2>お問い合わせ</h2>`,
    footer,
    `<p>最終更新日：${escape(data.updated)}</p>`,
  ].join("\n");
  const support = [
    `<h1>${escape(data.appName)}<br>サポート</h1>`,
    `<h2>よくある質問</h2>`,
    `<p><b>購入したのに鍵が外れない</b><br>右上のプラン表示を開き、「購入を復元」を押してください。購入したときと同じApple IDでサインインしている必要があります。</p>`,
    `<p><b>写真に保存できない</b><br>iPhoneの「設定」で「ライブチラシ」を開き、「写真」への追加を許可してください。「ファイルに保存 / 共有」からも保存できます。</p>`,
    `<p><b>機種変更でデータを移したい</b><br>画面下の「保存・バックアップ」で完全バックアップを書き出し、新しい端末で復元してください。</p>`,
    `<p><b>返金について</b><br>購入はAppleが処理しています。返金はAppleの案内に従って申請してください。</p>`,
    `<h2>お問い合わせ</h2>`,
    footer,
    `<p><a href="privacy.html">プライバシーポリシー</a></p>`,
  ].join("\n");
  writeFileSync(join(out, "privacy.html"), page(`プライバシーポリシー｜${data.appName}`, privacy));
  writeFileSync(join(out, "support.html"), page(`サポート｜${data.appName}`, support));
  console.log(`pages written to docs/appstore/site/`);
}

/** App Store Connect length limits, and agreement with the app's own rules. */
export function listingProblems() {
  const meta = JSON.parse(read("docs/appstore/metadata.json"));
  const length = (text) => [...text].length;
  const problems = [];
  const limit = (label, text, max, min = 1) => {
    if (length(text) < min || length(text) > max) problems.push(`${label}: ${length(text)} characters (allowed ${min}-${max})`);
  };
  limit("name", meta.app.name, 30, 2);
  limit("subtitle", meta.app.subtitle, 30);
  limit("promotionalText", meta.promotionalText, 170);
  limit("keywords", meta.keywords, 100);
  limit("description", meta.description, 4000);
  limit("reviewNotes", meta.reviewNotes, 4000);
  const code = read("src/plan/entitlements.ts");
  for (const item of meta.inAppPurchases) {
    limit(`${item.referenceName} display name`, item.displayName, 30, 2);
    limit(`${item.referenceName} description`, item.description, 45);
    if (!code.includes(`"${item.productId}"`)) problems.push(`${item.productId} is not a product id the app uses`);
  }
  if (meta.app.name !== legal().appName) problems.push("The app name differs between metadata.json and legal.json");
  if (meta.app.privacyPolicyUrl !== legal().privacyPolicyUrl) problems.push("The privacy policy URL differs between metadata.json and legal.json");
  if (!/^https:\/\//.test(meta.app.supportUrl ?? "")) problems.push("metadata.json: supportUrl is not a public https URL");
  return problems;
}

function check() {
  const data = legal();
  const problems = [];
  if (!data.operator.trim()) problems.push("src/store/legal.json: operator (運営者名) is empty");
  if (!data.contact.trim()) problems.push("src/store/legal.json: contact (お問い合わせ先) is empty");
  if (!/^https:\/\//.test(data.privacyPolicyUrl)) problems.push("src/store/legal.json: privacyPolicyUrl is not a public https URL");
  if (!existsSync(join(root, licensesPath))) problems.push(`${licensesPath} is missing`);
  problems.push(...listingProblems());
  if (problems.length) {
    console.error(`Not ready to submit:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Release material is complete.");
}

const command = process.argv[2];
if (command === "licenses") buildLicenses();
else if (command === "site") buildSite();
else if (command === "check") check();
else if (command === "listing") {
  const problems = listingProblems();
  console.log(problems.length ? problems.join("\n") : "Store listing is within the limits.");
  process.exit(problems.length ? 1 : 0);
}
else {
  console.error("usage: node scripts/store-release.mjs licenses|site|listing|check");
  process.exit(2);
}
