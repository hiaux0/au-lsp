//@ts-check
//@ts-ignore

let count = 0;
window.setTimeout(() => {
  // <button id="copyAsMarkdown">Copy as mermaid markdown</button>
  const copyAsMarkdownButton = document.getElementById("copyAsMarkdown");

  if (!copyAsMarkdownButton) return;

  copyAsMarkdownButton.addEventListener("click", (ev) => {
    const mermaidDiagram = document.getElementsByClassName("mermaid")[0];
    const content = mermaidDiagram.textContent;
    const innerHtml = mermaidDiagram.innerHTML;
  });
}, 0);
