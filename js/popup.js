document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById('startButton');

  startButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      const message = { action: 'scrapePage' };

      // Enviar un mensaje al script de contenido (content.js)
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: startContentScript
      });
    });
  });
});

function startContentScript() {
  var dbCodeElement = document.querySelector('input[name="dbCode"]');
  var totalElement = document.querySelector('input[name="txt_imagenFin"]');

  if (!dbCodeElement || !totalElement) {
    alert("No se encontraron elementos requeridos para la descarga.");
  } else {
    var dbCode = dbCodeElement.value;
    var total = totalElement.value;

    if (dbCode === "" || total === "") {
      alert("el identificador del documento o el total de imágenes están vacíos.");
      return; 
    }

    // Envía los resultados de vuelta a popup.js
    chrome.runtime.sendMessage({ action: 'scrapedData', dbCode, total });
  }
}
