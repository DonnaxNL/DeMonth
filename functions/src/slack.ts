import { SLACKACTION, SLACKCOMMAND, SLACKERROR, db } from "./config";
import admin = require("firebase-admin");
import { format } from "util";

const request = require("request");
const rp = require('request-promise');


// --------------- Calls ---------------

// Error report
export const errorReport = async (location, data, item?) => {

    await request.post(
        SLACKERROR,
        {
            json: {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*ERROR!*"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Location:* " + location
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Error message:* " + data
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*On item:* " + item
                        }
                    }
                ]
            }
        }
    );
}

// Action needed
export const slackActionNeeded = async (location, data, item?, paymentId?) => {

    await request.post(
        SLACKACTION,
        {
            json: {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*ERROR!*"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Location:* " + location
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Error message:* " + data
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*On item:* " + item
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Visit the Mollie Dashboard for payment details."
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Go to Mollie"
                            },
                            "url": "https://www.mollie.com/dashboard/org_11302067/payments/" + paymentId
                        }
                    }
                ]
            }
        }
    );
}

// --------------- Commands ---------------
export const slackDeliveryList = async (user: any) => {
    console.log('slackDelivery called')

    const payload = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Hello <@" + user + ">,\n*Here are the deliveries for the coming 7 days:*"
                }
            },
            {
                "type": "divider"
            }
        ]
    }
    // let orderJson = {
    //     "type": "section",
    //     "text": {
    //         "type": "mrkdwn",
    //         "text": "No orders to be delivered in the coming 7 days."
    //     }
    // }
    const thresholdDate = new Date()
    thresholdDate.setDate(new Date().getDate() + 7);
    const thresholdTimestamp = admin.firestore.Timestamp.fromDate(thresholdDate)
    const orderRef = db.collection('orders')
    await orderRef.get().then((snapshot: any) => {
        if (snapshot.empty) {
            // orderJson.text.text = 'Empty.'
            return;
        }

        snapshot.forEach(async (doc: any) => {
            const item = doc.data();
            const delivery = item.nextDeliveryDate;
            if (delivery !== null) {
                let nextDeliveryDate
                if (item.nextDeliveryDate.seconds < admin.firestore.Timestamp.now().seconds) {
                    const deliveryDates = item.deliveryDates
                    if (deliveryDates !== null) {
                        nextDeliveryDate = item.deliveryDates[0]
                        if (nextDeliveryDate.seconds < admin.firestore.Timestamp.now().seconds) {
                            nextDeliveryDate = item.deliveryDates[1]
                            if (nextDeliveryDate.seconds < admin.firestore.Timestamp.now().seconds) {
                                nextDeliveryDate = item.deliveryDates[2]
                            }
                        }
                    }
                } else {
                    nextDeliveryDate = item.nextDeliveryDate
                }
                // If within now and 7 days
                if (item.deliveryDates !== null && nextDeliveryDate.seconds < thresholdTimestamp.seconds) {
                    const todayTime = nextDeliveryDate.toDate();
                    const month = format(todayTime.getMonth() + 1);
                    const day = format(todayTime.getDate());
                    const year = format(todayTime.getFullYear());
                    const dateString = day + "-" + month + "-" + year
                    const orderJson = {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "OrderRef: " + item.orderReference + ", Delivery on: " + dateString
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Open in Firebase",
                                "emoji": true
                            },
                            "url": "https://console.firebase.google.com/project/demonth-55207/database/firestore/data/orders/" + doc.id
                        }
                    }
                    payload.blocks.push(orderJson)
                }
            }
        })

        // Empty
    }).catch((err: any) => {
        console.log('Error getting documents', err);
    })

    console.log(payload)

    const options = {
        method: 'POST',
        uri: SLACKCOMMAND,
        body: payload,
        json: true // Automatically stringifies the body to JSON
    };

    rp(options)
        .then(function (body: any) {
            console.log(body)
        })
        .catch(function (err: any) {
            // POST failed...
        });
};

export const slackNoCommand = async () => {
    const payload = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "Sorry, I don't understand that.\n*Known commands:*"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*delivery list* - Get all orders to be send within 7 days for now"
                }
            }
        ]
    }

    const options = {
        method: 'POST',
        uri: SLACKCOMMAND,
        body: payload,
        json: true // Automatically stringifies the body to JSON
    };

    rp(options)
        .then(function (body: any) {
            console.log(body)
        })
        .catch(function (err: any) {
            // POST failed...
        });
};