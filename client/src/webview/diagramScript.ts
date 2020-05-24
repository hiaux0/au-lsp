//@ts-check
// import mermaid from 'mermaid'

//@ts-ignore


let count = 0;
window.setTimeout(() => {
	const counter = document.getElementById('lines-of-code-counter');

	setInterval(() => {
		counter.textContent = String(count++);
	}, 100);
}, 0)