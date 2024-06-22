const express = require("express");
const app = express();
const webpush = require("web-push");
const cors = require("cors");

const port = 3000;

app.use(cors());
app.use(express.json());

const database = {};

const autoLogoutTimer = 1000 * 60 * 60; // 1 hour

app.post("/login", (req, res) => {
  const uname = req.body.username;
  const pwd = req.body.password;

  // generate new vapid keys for every user login and store it in corresponding table.
  database[uname] = {
    username: uname,
    password: pwd,
    ...webpush.generateVAPIDKeys(),
  };

  // Auto Logout after 1 minute...
  const timeoutId = setTimeout(() => {
    if (database[uname]) {
      delete database[uname];
    }
  }, autoLogoutTimer);

  database[uname].timeoutId = timeoutId;

  res.send({ username: uname, publicKey: database[uname].publicKey });
});

app.post("/save-subscription", (req, res) => {
  if (database[req.body.username]) {
    database[req.body.username].subscription = req.body.subscription;
    res.status(200).json({ status: "Success", message: "Subscription saved!" });
  } else {
    res.status(404).json({
      status: "Failed",
      message: "Sorry Session for user does not exist!",
    });
  }
});

app.post("/logout", (req, res) => {
  if (database[req.body.username]) {
    clearTimeout(database[req.body.username].timeoutId);
    delete database[req.body.username];
    res
      .status(200)
      .json({ status: "Success", message: "Succesfully Logged out!" });
  } else {
    res.status(404).json({
      status: "Failed",
      message: "Sorry Session for user does not exist!",
    });
  }
});

app.get("/send-notification", (req, res) => {
  const id = req.query.id; // Access the 'id' query parameter
  const show = req.query.show;
  if (!id) {
    return res
      .status(400)
      .json({ status: "Failed", message: "ID is required" });
  }

  const user = database[id];
  if (!user || !user.subscription) {
    return res
      .status(404)
      .json({ status: "Failed", message: "User or subscription not found" });
  }

  webpush.setVapidDetails(
    "mailto:bharath.vijay@enate.io",
    user.publicKey,
    user.privateKey
  );

  let ExpirtyDate = new Date();
  ExpirtyDate.setMinutes(ExpirtyDate.getMinutes() + 1);

  webpush
    .sendNotification(
      user.subscription,
      JSON.stringify({
        PacketGuid: "c0948ef5-8312-4b5e-b8c9-131e47810b68",
        Reference: "726040-C",
        Logged: "2024-06-19T16:52:47.343",
        Title: "test123 26 May 2023 16:05",
        CustomerName: "Umbrella Corporation",
        ContractName: "Umbrella Global",
        ServiceName: "Global Service",
        ServiceLineName: "HRO",
        ProcessTypeName: "case 2",
        EventType: 1,
        EventDetail: 0,
        EventMessage: "Work Item Assigned To You",
        DateRead: null,
        Followed: false,
        DueDate: "2023-06-07T10:35:05.173",
        User: {
          FullName: "bvss bvss",
          EmailAddress: "bvss@gmail.com",
          HasProfilePicture: false,
          UserType: 1,
          IsMe: false,
          Retired: false,
          GUID: "0be0baea-c357-4433-9dc4-cd4479d806b2",
        },
        AssignedUser: {
          FullName: "bvss bvss",
          EmailAddress: "bvss@gmail.com",
          HasProfilePicture: false,
          UserType: 1,
          IsMe: false,
          Retired: false,
          GUID: "0be0baea-c357-4433-9dc4-cd4479d806b2",
        },
        PacketQueue: null,
        Communication: null,
        File: null,
        GUID: "0f31965a-5c2e-ef11-9f80-70cd0dc2af9b",
        // New Things added below
        NotificationExpirtyTime: ExpirtyDate,
        show: show === "true" ? true : false, // This is temperorary for development purpose
        BrowserNotificationPayload: {
          title: "Push Messsage Check",
          options: {
            body: "Push Message Body",
            icon: null,
            data: {
              url: "https://maps.google.com"
            },
            dir: "auto",
            tag: "",
          },
        },
      })
    )
    .then(() => {
      res.json({ status: "Success", message: "Message sent to push service" });
    })
    .catch((error) => {
      console.error("Error sending notification:", error);
      res
        .status(500)
        .json({ status: "Failed", message: "Failed to send notification" });
    });
});

app.listen(port, () => {
  console.log("Server running on port 3000!");
});
