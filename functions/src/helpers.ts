import * as functions from 'firebase-functions';
import { format } from 'util';
import { mollieClientTest, mollieClientNewTest, mollieClient, mollieClientNEW } from './config';
import { getUser } from './customers';

/**
* Validates data payload of a callable function
*/
export const assert = (data: any, key: string) => {
    if (!data[key]) {
        //await errorReport('assertData', `function called without ${key} data`)
        throw new functions.https.HttpsError('invalid-argument', `function called without ${key} data`);
    } else {
        return data[key];
    }
}

/**
* Validates auth context for callable function 
*/
export const assertUID = (context: any) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('permission-denied', 'function called without context.auth');
    } else {
        return context.auth.uid;
    }
}

/**
* Sends a descriptive error response when running a callable function
*/
export const catchErrors = async (promise: Promise<any>) => {
    try {
        return await promise;
    } catch (err) {
        throw new functions.https.HttpsError('unknown', err)
    }
}

/**
* Convert Date or Timestamp to string
*/
export const dateToString = (givenDate, dateFormat) => {
    let date: Date
    if (givenDate instanceof Date) {
        date = givenDate
    } else {
        date = givenDate.toDate()
    }
    date = checkDate(date)
    //console.log('date', date)

    const month = format(date.getMonth() + 1).padStart(2, '0')
    const day = format(date.getDate()).padStart(2, '0')
    const year = format(date.getFullYear()).padStart(2, '0')
    const hour = format(date.getHours()).padStart(2, '0')
    const minutes = format(date.getMinutes()).padStart(2, '0')
    if (dateFormat === 'time') {
        return day + '-' + month + '-' + year + ' ' + hour + ':' + minutes
    } if (dateFormat === 'mollie') {
        return year + '-' + month + '-' + day
    } else {
        return day + '-' + month + '-' + year
    }
}

/**
* Convert string to date
*/
export const stringToDate = (givenDate: string, isFull?: boolean) => {
    const year = parseInt(givenDate.split('-')[0])
    const month = parseInt(givenDate.split('-')[1]) - 1
    const day = parseInt(givenDate.split('-')[2])
    const hours = isFull ? parseInt(givenDate.split(' ')[1].split(':')[0]) : 0
    const minutes = isFull ? parseInt(givenDate.split(' ')[1].split(':')[1]) : 0
    //console.log(year, month, day, hours, minutes)

    return new Date(year, month, day, hours, minutes)
}

/**
* Check if UID matches the UID of staff
*/
export const realCustomer = (uid: any) => {
    //console.log(uid)
    if (uid === 'FkTF6GCnq0am2miavM4uvQcq6T62') { // donavanlb@gmail.com - Google
        return false;
    // file deepcode ignore DuplicateIfBody: <please specify a reason of ignoring this>
    } else if (uid === '3gn9uMqbrCNWEkVIyVADHR7ntAT2') { //info@demonth.nl - Google
        return false;
    // deepcode ignore DuplicateIfBody: <please specify a reason of ignoring this>
    } else if (uid === 'A5uCdEOGwbMGuKxw1krWFrxwT6k2') { //gideonboadu@gmail.com - Google
        return false;
    // deepcode ignore DuplicateIfBody: <please specify a reason of ignoring this>
    } else if (uid === '1HytcMcICPfWjUfDQkqB1Zp8ea22') { //maxmicheldegroot@gmail.com - Email
        return false;
    } else {
        return true;
    }
};

/** 
* Check if date is offset
*/
export const checkDate = (date: Date) => {
    if (date.getHours() === 23 || date.getHours() === 22) {
        date.setDate(date.getDate() + 1)
        date.setHours(2, 0, 0, 0)
        //console.log('day added', date)
    }
    return date
}

/**
 * Get canon names for chocolate
 */
export const getChocolate = (item: any) => {
    let name = '';
    if (item === 'none') {
        name = 'No chocolate'
    } else if (item === 'no_pref') {
        name = 'No preference'
    } else {
        name = item.name
    }
    return name
}

/**
 * Get canon names for Health Bar
 */
export const getHealthbar = (item: any) => {
    let name = '';
    if (item === 'none') {
        name = 'No health bar'
    } else if (item === 'no_pref') {
        name = 'No preference'
    } else {
        name = item.name
    }
    return name
}

/**
 * Get canon names for granola
 */
export const getGranola = (item: any) => {
    let name = '';
    if (item === 'none') {
        name = 'No granola'
    } else if (item === 'no_pref') {
        name = 'No preference'
    } else {
        name = item.name
    }
    return name
}

/**
 * Get canon names for skin types
 */
export const getSkinType = (id: string) => {
    let name = ''
    switch (id) {
        case 'normal':
            name = 'Normal'
            break;
        case 'mixed':
            name = 'Mixed/Combination'
            break;
        case 'dry':
            name = 'Dry to very dry'
            break;
        case 'oil':
            name = 'Oily'
            break;
        case 'no_pref':
            name = 'No idea/No preference'
            break;
        default:
            break;
    }
    return name
}

/**
 * 
 */
export const getMollieEnvironment = async (uid: string) => {
    if (realCustomer(uid)) {
        const user = await getUser(uid);
        if (user.mollieCustomerIdOld) {
            return await mollieClient
        } else {
            return await mollieClientNEW
        }
    } else {
        const user = await getUser(uid);
        if (user.mollieTestCustomerIdOld) {
            return await mollieClientTest
        } else {
            return await mollieClientNewTest
        }
    }
}

export const getMollieEnvironmentByPayment = async (id: string, isLive: boolean) => {
    if (isLive) {
        try {
            console.log('check main environment')
            return await mollieClient.payments.get(id);
        } catch (err) {
            console.log(err.status + ' | check other environment')
            if (err.status === 404) {
                return await mollieClientNEW.payments.get(id);
            } else {
                return null
            }
        }
    } else {
        try {
            console.log('check main test environment')
            return await mollieClientTest.payments.get(id);
        } catch (err) {
            console.log(err.status + ' | check other test environment')
            if (err.status === 404) {
                return await mollieClientNewTest.payments.get(id);
            } else {
                return null
            }
        }
    }
}
