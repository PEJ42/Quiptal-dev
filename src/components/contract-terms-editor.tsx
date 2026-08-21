"use client";

import { useRef, useState } from "react";

export function ContractTermsEditor({ initialHtml }: { initialHtml: string }) {
  const editor = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(initialHtml);

  function updateValue() {
    setHtml(editor.current?.innerHTML ?? "");
  }

  function run(command: "bold" | "insertUnorderedList" | "formatBlock") {
    editor.current?.focus();
    document.execCommand(command, false, command === "formatBlock" ? "p" : undefined);
    updateValue();
  }

  return (
    <div>
      <div
        aria-label="Legal terms formatting controls"
        className="flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-2"
        role="toolbar"
      >
        <button
          aria-label="Bold selected text"
          className="secondary-button min-h-8 px-3 py-1"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run("bold")}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          className="secondary-button min-h-8 px-3 py-1"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run("formatBlock")}
          type="button"
        >
          Paragraph
        </button>
        <button
          className="secondary-button min-h-8 px-3 py-1"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run("insertUnorderedList")}
          type="button"
        >
          • Bullet list
        </button>
      </div>
      <div
        className="min-h-64 w-full rounded-b-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        contentEditable
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        onInput={updateValue}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          updateValue();
        }}
        ref={editor}
        role="textbox"
        suppressContentEditableWarning
      />
      <input name="legalTerms" type="hidden" value={html} />
      <p className="mt-2 text-xs text-slate-500">
        Use Enter for a new paragraph. Select text before applying bold or bullets.
      </p>
    </div>
  );
}
