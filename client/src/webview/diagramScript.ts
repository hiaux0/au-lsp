// @ts-check
// @ts-ignore

const count = 0;
window.setTimeout(() => {
  // <button id="copyAsMarkdown">Copy as mermaid markdown</button>
  const copyAsMarkdownButton = document.getElementById("copyAsMarkdown");
  copyAsMarkdownButton.addEventListener("click", (ev) => {
    const mermaidDiagram = document.getElementsByClassName("mermaid")[0];
    const content = mermaidDiagram.textContent;
    const innerHtml = mermaidDiagram.innerHTML;
  });
}, 0);
