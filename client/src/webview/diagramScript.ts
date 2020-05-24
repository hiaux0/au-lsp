//@ts-check
// import mermaid from 'mermaid'

//@ts-ignore


let count = 0;
window.setTimeout(() => {
	// <button id="copyAsMarkdown">Copy as mermaid markdown</button>
	const copyAsMarkdownButton = document.getElementById('copyAsMarkdown');
	copyAsMarkdownButton.addEventListener('click', (ev) => {
		const mermaidDiagram = document.getElementsByClassName('mermaid')[0];
		const content = mermaidDiagram.textContent;
		const innerHtml = mermaidDiagram.innerHTML;
	})

	// const counter = document.getElementById('lines-of-code-counter');

	// setInterval(() => {
	// 	counter.textContent = String(count++);
	// }, 100);
}, 0)