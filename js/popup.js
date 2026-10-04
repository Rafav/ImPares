// popup.js - CORREGIDO
document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById('startButton');
  const cancelButton = document.getElementById('cancelButton');
  const statusDiv = document.getElementById('status');

  function setIdleState() {
    startButton.style.display = '';
    startButton.disabled = false;
    startButton.textContent = 'Iniciar Descarga';
    cancelButton.style.display = 'none';
  }

  function setDownloadingState() {
    startButton.style.display = 'none';
    cancelButton.style.display = '';
    cancelButton.disabled = false;
    cancelButton.textContent = 'Cancelar Descarga';
  }

  // Verificar si estamos en una página de PARES
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];

    if (activeTab.url && activeTab.url.includes('pares.cultura.gob.es/ParesBusquedas20/catalogo/')) {
      // Extraer ID de la URL
      const match = activeTab.url.match(/\/(?:show|description)\/(\d+)/);
      if (match) {
        const documentId = match[1];

        // Preguntar al content script si ya hay una descarga en curso
        // (el popup se cierra y reabre libremente, la descarga sigue en segundo plano)
        chrome.tabs.sendMessage(activeTab.id, { action: 'getStatus' }, (response) => {
          if (chrome.runtime.lastError) {
            statusDiv.textContent = `Documento ID: ${documentId}`;
            statusDiv.style.color = '#4CAF50';
            setIdleState();
            return;
          }

          if (response && response.isDownloading) {
            statusDiv.textContent = `Descargando documento ${documentId}...`;
            statusDiv.style.color = '#4CAF50';
            setDownloadingState();
          } else {
            statusDiv.textContent = `Documento ID: ${documentId}`;
            statusDiv.style.color = '#4CAF50';
            setIdleState();
          }
        });
      } else {
        statusDiv.textContent = 'No se pudo detectar el ID del documento';
        statusDiv.style.color = '#f44336';
      }
    } else {
      statusDiv.textContent = 'Abre una página de PARES para usar esta extensión';
      statusDiv.style.color = '#ff9800';
    }
  });

  // Evento del botón de inicio
  startButton.addEventListener('click', function () {
    setDownloadingState();
    statusDiv.textContent = 'Iniciando descarga...';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      // CORREGIDO: Solo enviar mensaje, NO inyectar script
      chrome.tabs.sendMessage(activeTab.id, { action: 'startDownload' }, (response) => {
        // Verificar si hubo error de comunicación
        if (chrome.runtime.lastError) {
          console.error('Error comunicación:', chrome.runtime.lastError);
          statusDiv.textContent = 'Error: Recarga la página de PARES';
          statusDiv.style.color = '#f44336';
          setIdleState();
          return;
        }

        if (response && response.success) {
          statusDiv.textContent = 'Descarga en progreso...';
          statusDiv.style.color = '#4CAF50';
        } else {
          statusDiv.textContent = 'Error al iniciar la descarga';
          statusDiv.style.color = '#f44336';
          setIdleState();
        }
      });
    });
  });

  // Evento del botón de cancelación
  cancelButton.addEventListener('click', function () {
    cancelButton.disabled = true;
    cancelButton.textContent = 'Cancelando...';
    statusDiv.textContent = 'Cancelando descarga...';

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      chrome.tabs.sendMessage(activeTab.id, { action: 'cancelDownload' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error comunicación:', chrome.runtime.lastError);
          statusDiv.textContent = 'Error: Recarga la página de PARES';
          statusDiv.style.color = '#f44336';
          return;
        }

        statusDiv.textContent = 'Descarga cancelada';
        statusDiv.style.color = '#f44336';
        setIdleState();
      });
    });
  });
});
