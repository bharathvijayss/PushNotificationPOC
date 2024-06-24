PushNotificationEnum = Object.freeze({
  NotificationON: "Push-Notification-ON",
  Ping: "Ping",
  ShowToastNotification: "Show-Toast-Notification",
  ShowBrowserNotification: "Show-Browser-Notification",
});

ping_client_id = null;
push_subscription = "push-subscription";

// Used to AutoUpdate the Service Worker to latest version if any available.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", async (event) => {
  // Refresh the clients
  event.waitUntil(clients.claim());

  findActiveClient(push_subscription);
});

function findActiveClient(action) {
  var payLoad = {
    type: PushNotificationEnum.Ping,
    action,
  };

  self.clients.matchAll().then(function (clients) {
    clients.forEach(function (client) {
      client.postMessage(JSON.stringify(payLoad));
    });
  });
}

self.addEventListener("message", function (event) {
  // When there is only one browser tab running the Enate application and it is reloaded with 'Empty Cache and Hard Reload', the service worker cannot identify that tab.
  // To resolve this, we refresh the service worker's client list upon any interaction to keep it updated.
  event.waitUntil(clients.claim());

  var senderClientId = event.source.id;

  var data = JSON.parse(event.data);

  if (data && [PushNotificationEnum.Ping].includes(data.type)) {
    if (ping_client_id) {
      return;
    }
    ping_client_id = senderClientId;

    if (data.action === push_subscription) {
      pingBack();
    }
  }
});

function pingBack() {
  self.clients.matchAll().then(function (clients) {
    var foundClient = clients.find(function (client) {
      return client.id === ping_client_id;
    });
    if (foundClient) {
      foundClient.postMessage(
        JSON.stringify({
          type: PushNotificationEnum.NotificationON,
        })
      );
    }
  });
}

pushNotificationResolve = null;

self.addEventListener("push", (e) => {
  var notificationPayLoad = e.data.json();
  let currentDate = new Date();
  let expiryDate = new Date(notificationPayLoad.NotificationExpirtyTime); // Convert to Date object

  if (currentDate < expiryDate) {
    if (notificationPayLoad.show) {
      // This condition check is temperorary for development purpose to simulate expired notification.
      e.waitUntil(
        new Promise(function (resolve, reject) {
          self.clients
            .matchAll()
            .then(function (clients) {
              var visibleClient = clients.find(function (client) {
                return client.visibilityState === "visible";
              });

              if (visibleClient) {
                console.log("Toast Message Triggered");
                visibleClient.postMessage(
                  JSON.stringify({
                    type: PushNotificationEnum.ShowToastNotification,
                  })
                );
                resolve();
              } else {
                console.log("Browser Notification Triggered");
                // To avoid sleeping tabs problem, BE should send the properly calculated notification payload

                self.registration
                  .showNotification(
                    notificationPayLoad.BrowserNotificationPayload.title,
                    notificationPayLoad.BrowserNotificationPayload.options
                  )
                  .then(resolve)
                  .catch(reject);
              }
            })
            .catch(reject);
        })
      );
    }
  } else {
    console.log(
      "Notification expired, no action taken. so default notification from browser will be triggered based upon conditions.."
    );
    // browser default notification.
  }
  console.log(notificationPayLoad);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  // default notification of chrome does not have data value.
  if (event.notification.data) {
    event.waitUntil(
      new Promise(function (resolve, reject) {
        clients
          .openWindow(event.notification.data.url)
          .then(function (windowClient) {
            console.log(windowClient.visibilityState);
            console.log(windowClient.focused);
            if (windowClient && !windowClient.focused) {
              windowClient.focus().catch(function(err) {}).finally(function () {
                resolve();
              });
            } else {
              resolve();
            }
          });
      })
    );
  }
});
