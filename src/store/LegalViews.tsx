// The privacy policy and the licence notices, readable inside the app and offline.
import legal from "./legal.json";
import licenses from "./licenses.json";

export function PrivacyPolicy() {
  return (
    <article className="legal">
      <p>{legal.intro}</p>
      {legal.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </section>
      ))}
      {(legal.operator || legal.contact) && (
        <section>
          <h3>お問い合わせ</h3>
          {legal.operator && <p>運営者：{legal.operator}</p>}
          {legal.contact && <p>連絡先：{legal.contact}</p>}
        </section>
      )}
      {legal.privacyPolicyUrl && (
        <p>
          <a href={legal.privacyPolicyUrl} target="_blank" rel="noreferrer">
            ウェブ版を開く
          </a>
        </p>
      )}
      <p className="plan-fineprint">最終更新日：{legal.updated}</p>
    </article>
  );
}

export function LicenseNotices() {
  return (
    <div className="legal">
      <p>本アプリは、次のソフトウェアと書体を利用しています。名前を押すと条文を表示します。</p>
      {licenses.map((item) => (
        <details key={item.name}>
          <summary>
            {item.name}
            <small>{item.license}</small>
          </summary>
          <pre>{item.text}</pre>
        </details>
      ))}
    </div>
  );
}
