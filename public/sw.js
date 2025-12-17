// Service Worker para Push Notifications - MotoExtra

const CACHE_VERSION = 'v1';

self.addEventListener('push', function(event) {
  console.log('[SW] Push recebido:', event);
  
  let data = {
    title: 'Novo Extra Disponível!',
    body: 'Um restaurante precisa de motoboy.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[SW] Erro ao parsear dados:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'new-offer',
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'view', title: 'Ver Extra' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Se já tem uma janela aberta, foca nela
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Senão, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Service Worker instalado');
  // Força ativação imediata sem esperar tabs fecharem
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Service Worker ativado');
  
  // Limpa todos os caches antigos para garantir conteúdo atualizado
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW] Removendo cache antigo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Assume controle de todas as páginas imediatamente
      return clients.claim();
    })
  );
});

// Estratégia Network First - sempre busca da rede, só usa cache se offline
self.addEventListener('fetch', function(event) {
  // Ignora requisições não-GET e de extensões
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('chrome-extension')) return;
  if (event.request.url.includes('supabase')) return;
  
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        return response;
      })
      .catch(function() {
        // Só usa cache se a rede falhar
        return caches.match(event.request);
      })
  );
});
