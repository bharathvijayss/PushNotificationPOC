# Service-worker-notification

- To run the application, inside the server folder, first run `npm install` to install the dependencies and then run `npx nodemon app.js`. 
- This will host the server on `localhost:3000`.
- Similarly, use any live server extension to run the html file on a separate port.

Pseudo Code:
=============
1) In Login Page(autologout screen), Clear the local storage(Public key, subscription for push exist or not key), register the service worker, then unsubscribe for any push notification subscription. Both manual as well as autologout navigates back to login screen only so this is the right place.

2) Once the User enters credentials and logins, BE should authenticate and generate the new vapid keys and store it under the corresponding user and it should give back the public key to the FE which will be stored in the local storage.

3) FE adds event listerners for service worker and uses the public key to generate the service worker push subscripiton when the notification component initialized and store some key in localstorage to avoid duplicate susbcription creation in the same session within same tab (reload) or different tab (newly opened or reloaded) and pass the subscription object to BE which then needs to stored in database under specific user along with vapid keys. 

4) all browsers have some builtin tcp connection just like signalR for their own. so we have to send our message to that cloud messaging service for each of the browser specific cloud service so we do not need our own signalR setup.
 
5) If the User closed the browser entirely whenever they reopen the browser, all the messages which are queued will be displayed because they are queued on cloud until the browser is back to online.
 - potential risk => what if the user turned off his computer or closes the browser without logging out and next day some other user turning it on, even though auto session timeout happend the new user cannot access the enate application but still all the notifications which are sent by the BE until the user auto session timeout happens will be triggered all at once to the new user.
 - solution => BE has to send an expiration time for the each notification based on the user session timeout date so if any notification comes FE will check current date is lesser than the expiration time if yes then it will show the notification because the user did not loggedout and if any other user come and checks his systems also its an users issue. by the time the new user opens the browser if the notification expiry time is reached we will not show notification but browser will show a default notification.

6) If we are not triggering the browser notification, because notification expired then browser will trigger a default notification saying "something has been updated in the background for this application(url)"
  - Doubt => should we allow that notificatin or else should we trigger something else generic 
  - Note: Default Notification things happpens when the enate client is not visible and there is no notification of the same application in the notification center of windows either default or custom notification.

7) our BE server should send push message only if the user session is active using both the subscription object and vapid keys which are generated and stored.
   - BE should send the proper browser notification payload with all the url things calculated and transmitted from BE itself... because of the sleeping tabs problem to be avoided.
    
8) Already triggered notifications will be kept in the Notification centre with push notification, even though the user closes the browser.

9) If user closed the browser without logging out in one PC and after 15min  backend sends some notification to this PC's browser becaue of exisiting session and after 30 min the user logs in the another pc, the already triggered notification will still be shown in the previous pc whenever any user opens that browser within the session expirty time mentioned in the notification payload when that is triggered or else default browser notification if it croses the timeout period.

10) Edge browser automatically blocks the notification popup so push notification cannot be enabled as user is not granting it.
    - solution: after 5 secs, if we get no response from user, we display some helper content on the UI to inform user about the requirement of manual enabling of notification permission and every 3 seconds we keep on checking if ther permission has been manually enabled or not and then we start push notification if it is enabled.

Scenarios:
===========
1) User loggedin session exist
    * Notification Not Expired 
      - client is visible, then toast message 
	  - client is not visible, then browser notification
	  - client is closed then reopened, then browser notification if by the time service worker is awakend it is not able to find the visible client otherwise toast message possible (tricky to test).
    * Notification Expired due to auto session timeout when user opens the browser, then default notification

Problems:
==========
1) chrome gives default notification if we dont trigger browser notification for push event depending on certain conditions.
2) If the Notification click url is of different domain than enate application, then firefox cannot be focussed with the newly opened tab programatically if it is minimized.

http://localhost:3000/send-notification?id=bv&&show=false
http://localhost:3000/send-notification?id=bv&&show=true
http://127.0.0.1:5500/index.html
