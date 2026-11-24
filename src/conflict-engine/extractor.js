// Injected content script for extracting snapshot of DOM text from active mirror tabs
(() => {
  function extractPageText() {
    const rawText = document.body ? document.body.innerText : "";
    // Clean whitespace and cap snapshot to 3,000 characters to keep payload fast and lightweight
    const cleanText = rawText.replace(/\s+/g, " ").trim().slice(0, 3000);
    return {
      url: window.location.href,
      title: document.title,
      text: cleanText,
      timestamp: Date.now()
    };
  }

  return extractPageText();
})();
