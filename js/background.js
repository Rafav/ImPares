// background.js
let currentDocumentId = null;

// IDs de descargas de Chrome que aún no han terminado (para poder cancelarlas)
let activeDownloadIds = new Set();

// Dejar de rastrear una descarga en cuanto Chrome la da por completada o interrumpida
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && (delta.state.current === 'complete' || delta.state.current === 'interrupted')) {
    activeDownloadIds.delete(delta.id);
  }
});

// Listener para mensajes del content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setDocumentId') {
    currentDocumentId = message.documentId;
    console.log('Document ID guardado:', currentDocumentId);
    sendResponse({ success: true });
  }

  if (message.action === 'downloadImage') {
    const { url, filename, documentId } = message;

    // Crear ruta con carpeta del documento
    const downloadPath = `PARES/${documentId}/${filename}`;

    chrome.downloads.download({
      url: url,
      filename: downloadPath,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Error descargando:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        activeDownloadIds.add(downloadId);
        console.log(`Descargado: ${downloadPath}`);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });

    return true; // Mantener el canal abierto para respuesta asíncrona
  }

  if (message.action === 'cancelAllDownloads') {
    const ids = Array.from(activeDownloadIds);

    if (ids.length === 0) {
      sendResponse({ success: true, cancelled: 0 });
      return true;
    }

    let pending = ids.length;
    let cancelled = 0;

    ids.forEach((id) => {
      chrome.downloads.cancel(id, () => {
        // Ignorar chrome.runtime.lastError aquí: puede ocurrir si la
        // descarga ya había terminado justo antes de cancelarla.
        cancelled++;
        activeDownloadIds.delete(id);
        pending--;
        if (pending === 0) {
          console.log(`Descargas canceladas: ${cancelled}/${ids.length}`);
          sendResponse({ success: true, cancelled: cancelled });
        }
      });
    });

    return true; // Mantener el canal abierto para respuesta asíncrona
  }
});
