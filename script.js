var uname = null;
var pwd = null;
var public_key = null;
var onNotificationMessageHandler = null;
var reg = null;

PushNotificationEnum = Object.freeze({
  NotificationON: "Push-Notification-ON",
  Ping: "Ping",
  ShowToastNotification: "Show-Toast-Notification",
  ShowBrowserNotification: "Show-Browser-Notification",
});

const checkPermission = () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("No support for service worker!");
  }

  if (!("Notification" in window)) {
    throw new Error("No support for notification API");
  }

  if (!("PushManager" in window)) {
    throw new Error("No support for Push API");
  }
};

const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission not granted");
  }
};

const registerSW = async () => {
  const registration = await navigator.serviceWorker.register("sw.js");
  return registration;
};

function login() {
  uname = document.getElementById("email").value;
  pwd = document.getElementById("password").value;
  fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ username: uname, password: pwd }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      document.getElementById("login-form").style.visibility = "hidden";
      document.getElementById("logout-form").style.visibility = "visible";
      document.getElementById(
        "login-result"
      ).innerText = `Login success with Username ${uname} and Password ${pwd}`;
      public_key = data.publicKey;
      main();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function _addEventListeners() {
  onNotificationMessageHandler = onNotificationMessage.bind(this);
  navigator.serviceWorker.addEventListener(
    "message",
    onNotificationMessageHandler
  );
}

function _removeEventListeners() {
  navigator.serviceWorker.removeEventListener(
    "message",
    onNotificationMessageHandler
  );
}

function onNotificationMessage(event) {
  _notificationMessageHandler(event.data);
}

function _notificationMessageHandler(message) {
  const o = JSON.parse(message);
  switch (o.type) {
    case PushNotificationEnum.Ping:
      {
        sendMessage(o);
      }
      break;
    case PushNotificationEnum.NotificationON:
      {
        registerPushNotificationSubscription();
      }
      break;
    case PushNotificationEnum.ShowToastNotification:
      {
        alert("toast message");
      }
      break;
  }
}

const main = async () => {
  checkPermission();
  await requestNotificationPermission();
  _addEventListeners();
  // reg = await registerSW();
  if (reg.active) {
    // Already Service worker in activated state so directly get the subscription
    registerPushNotificationSubscription();
  }
};

function registerPushNotificationSubscription() {
  reg.pushManager.getSubscription().then((subscription) => {
    if (!subscription) {
      initNewSubscription();
    } else {
      // Subscription exists only incase of auto logout by session timeout...
      subscription
        .unsubscribe()
        .then((successful) => {
          initNewSubscription();
        })
        .catch((e) => {
          // Unsubscribing failed
        });
    }
  });
}

async function initNewSubscription() {
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(public_key),
  });
  const pushEle = document.getElementById("notification-subscription-result");
  saveSubscription(subscription)
    .then(function () {
      pushEle.style.color = "green";
      pushEle.innerText = "Successfully Stored Push Manager Subscription";
    })
    .catch(function (err) {
      pushEle.style.color = "red";
      pushEle.innerText = "Error while Storing Push Manager Subscription !!!!";
      console.log(err);
    });
}

const saveSubscription = async (subscription) => {
  const response = await fetch("http://localhost:3000/save-subscription", {
    method: "post",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ subscription, username: uname }),
  });

  return response.json();
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

function sendMessage(message) {
  if (reg && reg.active) {
    reg.active.postMessage(JSON.stringify(message));
  }
}

function unsubscribePushSubs(registration) {
  registration.pushManager.getSubscription().then((subscription) => {
    if (subscription) {
      subscription
        .unsubscribe()
        .then((successful) => {
          // unsubscribed success
        })
        .catch((e) => {
          // Unsubscribing failed
        });
    }
  });
}

function logout() {
  fetch("http://localhost:3000/logout", {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ username: uname }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      _removeEventListeners();
      unsubscribePushSubs(reg);
      document.getElementById("login-result").innerText = "";
      document.getElementById("notification-subscription-result").innerText =
        "";
      public_key = null;
      reg = null;
      uname = null;
      pwd = null;
      document.getElementById("login-form").style.visibility = "visible";
      document.getElementById("logout-form").style.visibility = "hidden";
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

self.addEventListener("load", async function () {
  reg = await registerSW();
});
