import { API_KEY, API_KEY_ALL, TEMPLATE_MARKETING_INVITE, TEMPLATE_ORDER_CONFIRM, TEMPLATE_ORDER_FAILED, TEMPLATE_RETURN, TEMPLATE_SURVEY_ONE, TEMPLATE_SURVEY_TWO, TEMPLATE_UPGRADE_PLAN, TEMPLATE_UPGRADE_TO_SUB, TEMPLATE_WELCOME } from './config';
// Sendgrid Config
import * as sgMail from '@sendgrid/mail';
import { createSurveyTaskTest } from './test/tasks.test';
import { getDatabaseOrder } from './orders';
import { getDatabaseOrderTest } from './test/orders.test';

sgMail.setApiKey(API_KEY);

// Welcome message
export const welcomeEmail = async (data: any) => {

    let templateData
    templateData = {
        subject: data.language === 'nl' ? 'Welkom!' : 'Welcome!',
        preheader: data.language === 'nl' ? 'DeMonth - Bedankt voor het aanmelden.' : 'DeMonth - Thanks for signing up.',
        name: data.customerName
    }

    const msg = {
        to: data.customerEmail,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_WELCOME,
        dynamic_template_data: templateData,
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Order Confirm
export const orderConfirmEmail = async (data: any) => {

    // Customer
    const msg = {
        to: data.recipient,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_ORDER_CONFIRM,
        dynamic_template_data: {
            isDutch: data.language === 'nl',
            isEnglish: data.language === 'en',
            isTrial: data.order.isTrial !== undefined ? true : false,
            subject: data.language === 'nl' ? 'Orderbevestiging #' + data.order.orderRef : 'Order confirmation #' + data.order.orderRef,
            preheader: data.language === 'nl' ? 'DeMonth - Bedankt voor je bestelling!' : 'DeMonth - Thanks for your order!',
            order: data.order
        },
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Order payment failed
export const orderFailedEmail = async (data: any, type: string) => {

    let templateData
    templateData = {
        accountDigit: data.accountDigits
    }

    switch (type) {
        case 'failed':
            if (data.language === 'nl') {
                templateData.isFailedDutch = true
                templateData.subject = 'Betaling mislukt'
                templateData.preheader = 'DeMonth - Betaling mislukt. Volg de aanwijzingen om je betaling te voltooien.'
            } else {
                templateData.isFailedEnglish = true
                templateData.subject = 'Payment has failed'
                templateData.preheader = 'DeMonth - Payment has failed. Please follow the instructions to continue payment.'
            }
            break;
        case 'insufficientFunds':
            if (data.language === 'nl') {
                templateData.isFundsDutch = true
                templateData.subject = 'Onvoldoende saldo voor betaling'
                templateData.preheader = 'DeMonth - Onvoldoende saldo om betaling te voldoen.'
            } else {
                templateData.isFundsEnglish = true
                templateData.subject = 'Insufficient funds for box payment'
                templateData.preheader = 'DeMonth - Insufficient funds to charge you for your box.'
            }
            break;
        case 'failedRecurring':
            if (data.language === 'nl') {
                templateData.isFailedRecurringDutch = true
                templateData.subject = 'Automatisch incasso mislukt'
                templateData.preheader = 'DeMonth - Automatische incasso is mislukt.'
            } else {
                templateData.isFailedRecurringEnglish = true
                templateData.subject = 'Recurring payment has failed'
                templateData.preheader = 'DeMonth - Recurring payment has failed.'
            }
            break;
        default:
            break;
    }

    const msg = {
        to: data.recipient,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_ORDER_FAILED,
        dynamic_template_data: templateData,
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Email survey one
export const emailSurveyOne = async (data: any) => {

    const msg = {
        to: data.recipient,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_SURVEY_ONE
    };

    await sgMail.send(msg);

    if (data.nextEmailInDays) {
        // Plan next satisfaction email
        const surveyTaskData = {
            nextEmailInDays: data.nextEmailInDays,
            recipient: data.recipient
        }
        const performDate = new Date()
        performDate.setDate(performDate.getDate() + data.nextEmailInDays)
        await createSurveyTaskTest('emailInvite', performDate, surveyTaskData)
    }

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Email survey two
export const emailSurveyTwo = async (data: any) => {

    const msg = {
        to: data.recipient,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_SURVEY_TWO
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Email survey two
export const emailInvite = async (data: any) => {

    const msg = {
        to: data.recipient,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_MARKETING_INVITE
    };

    await sgMail.send(msg);

    if (data.nextEmailInDays) {
        // Plan next satisfaction email
        const surveyTaskData = {
            recipient: data.recipient
        }
        const performDate = new Date()
        performDate.setDate(performDate.getDate() + data.nextEmailInDays)
        await createSurveyTaskTest('emailSurveyTwo', performDate, surveyTaskData)
    }

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Order payment failed
export const emailFinishOrder = async (data: any) => {
    const order = await getDatabaseOrder(data.orderId)

    let templateData
    templateData = {
        orderId: data.orderId,
        firstName: data.firstName
    }

    if (data.language === 'nl') {
        templateData.isDutch = true
        templateData.subject = 'Krijg nu 30% korting als je je bestelling afrond!'
        templateData.preheader = 'DeMonth - 30% korting op je eerste box bij het afronden van je bestelling.'
    } else {
        templateData.isEnglish = true
        templateData.subject = 'Get a 30% discount if you complete your order!'
        templateData.preheader = 'DeMonth - 30% discount on your first box if you complete your order.'
    }

    if (order) {
        const msg = {
            to: data.recipient,
            from: 'DeMonth <info@demonth.nl>',
            templateId: TEMPLATE_RETURN,
            dynamic_template_data: templateData,
        };

        await sgMail.send(msg);
    } else {
        const orderTest = await getDatabaseOrderTest(data.orderId)
        if (orderTest) {
            const msg = {
                to: data.recipient,
                from: 'DeMonth TEST <info@demonth.nl>',
                templateId: TEMPLATE_RETURN,
                dynamic_template_data: templateData,
            };
    
            await sgMail.send(msg);
        }
    }

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Email to notify about multiplan option.
export const upgradePlanMail = async (data: any) => {

    let templateData
    templateData = {
        subject: data.language === 'nl' ? 'Bespaar nu!' : 'Save money now!',
        preheader: data.language === 'nl' ? 'DeMonth - Bespaar op je abonnement.' : 'DeMonth - Save on your subscription.',
        name: data.customerName
    }

    const msg = {
        to: data.customerEmail,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_UPGRADE_PLAN,
        dynamic_template_data: templateData,
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// Email to notify to change to subscription.
export const upgradeToSubscriptionMail = async (data: any) => {

    let templateData
    templateData = {
        subject: data.language === 'nl' ? 'Bespaar nu!' : 'Save money now!',
        preheader: data.language === 'nl' ? 'DeMonth - Bespaar op je abonnement.' : 'DeMonth - Save on your subscription.',
        name: data.customerName
    }

    const msg = {
        to: data.customerEmail,
        from: 'DeMonth <info@demonth.nl>',
        templateId: TEMPLATE_UPGRADE_TO_SUB,
        dynamic_template_data: templateData,
    };

    await sgMail.send(msg);

    // Handle errors here

    // Response must be JSON serializable
    return { success: true };
}

// --------------- Sendgrid features ---------------

// Order Confirm
export const addContact = async (data: any) => {
    const http = require("https");

    const options = {
        "method": "PUT",
        "hostname": "api.sendgrid.com",
        "port": null,
        "path": "/v3/marketing/contacts",
        "headers": {
            "authorization": "Bearer " + API_KEY_ALL,
            "content-type": "application/json"
        }
    };

    const req = http.request(options, function (res) {
        const chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            const body = Buffer.concat(chunks);
            console.log(body.toString());
        });
    });

    req.write(JSON.stringify(data));
    req.end();
}

// Order Confirm
export const deleteContactFromList = async (data: any) => {
    const http = require("https");
    const path = "/v3/marketing/lists/" + data.list_ids[0] + "/contacts?contact_ids=" + data.contactId

    const options = {
        "method": "DELETE",
        "hostname": "api.sendgrid.com",
        "port": null,
        "path": path,
        "headers": {
            "authorization": "Bearer " + API_KEY_ALL,
            "content-type": "application/json"
        }
    };

    const req = http.request(options, function (res) {
        const chunks = [];

        res.on("data", function (chunk) {
            chunks.push(chunk);
        });

        res.on("end", function () {
            const body = Buffer.concat(chunks);
            console.log(body.toString());
        });
    });

    req.write({});
    req.end();
}