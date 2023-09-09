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
    // Este código se ejecutará en el contexto de la pestaña activa
    // Realiza el scraping aquí y devuelve los resultados
    const scrapedData = {}; // Realiza el scraping y guarda los resultados aquí
  

    var dbCode = document.querySelector('input[name="dbCode"]').value;
    var total = document.querySelector('input[name="txt_imagenFin"]').value;
     
    // Envía los resultados de vuelta a popup.js
    chrome.runtime.sendMessage({ action: 'scrapedData',dbCode, total });
  }
  