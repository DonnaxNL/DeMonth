import { assert } from './helpers';
import { db, mollieClient, mollieClientNEW } from './config';
import { errorReport } from './slack';
import { MandateDetailsDirectDebit } from '@mollie/api-client/dist/types/src/data/customers/mandates/data';

export const getUser = async (uid: string) => {
    return await db.collection(`userdata`).doc(uid).get().then((doc: any) => doc.data()).catch(err => console.error(err));
}

export const updateUser = async (uid: string, data: Object) => {
    return await db.collection(`userdata`).doc(uid).set(data, { merge: true })
}

export const getUserFromReferralCode = async (code: string) => {
    const userRef = await db.collection(`userdata`).where("referral.referralCode", "==", code)
    return await userRef.get().then((snapshot: any) => {
        let item
        if (snapshot.empty) {
            return null;
        }

        snapshot.forEach(async (doc: any) => {
            item = doc.data();
        })

        return item

        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getUserFromReferralCode', err)
        return null
    })
}

export const createCustomer = async (uid: any, transfer: boolean) => {
    const user = await getUser(uid);
    const firstName = user.firstName ? user.firstName : ''
    const lastName = user.lastName ? user.lastName : ''
    let customer = null
    if (transfer) {
        customer = await mollieClientNEW.customers.create({
            name: firstName + " " + lastName,
            email: assert(user, 'email'),
            metadata: { firebaseUID: uid },
        });
        await updateUser(uid, {
            mollieCustomerId: customer.id
        })
    } else {
        customer = await mollieClient.customers.create({
            name: firstName + " " + lastName,
            email: assert(user, 'email'),
            metadata: { firebaseUID: uid },
        });
        await updateUser(uid, {
            mollieCustomerIdOld: customer.id
        })
    }

    return customer
}

export const getOrCreateCustomer = async (uid: string) => {
    const user = await getUser(uid);
    let customerId = user && user.mollieCustomerId;

    // If missing customerID, create it
    if (!customerId) {
        return await createCustomer(uid, true);
        //return createCustomer(uid, false);
    } else if (user.mollieCustomerIdOld && user.mollieCustomerId === user.mollieCustomerIdOld) {
        await createCustomer(uid, true);
        customerId = user && user.mollieCustomerIdOld;
        return await mollieClient.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    } else if (!user.mollieCustomerIdOld) {
        return await mollieClientNEW.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    } else {
        customerId = user && user.mollieCustomerIdOld;
        return await mollieClient.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    }
}

export const convertMandate = async (uid: string) => {
    const customer = await getOrCreateCustomer(uid)
    if (customer.id) {
        const mandates = await mollieClient.customers_mandates.page({ customerId: customer.id });
        for (const mandate of mandates) {
            if (mandate.status === 'pending' || mandate.status === 'valid') {
                if (mandate.method === 'directdebit') {
                    const user = await getUser(uid);
                    const mandateData = {
                        customerId: user.mollieCustomerId,
                        method: mandate.method,
                        consumerName: (mandate.details as MandateDetailsDirectDebit).consumerName,
                        consumerAccount: (mandate.details as MandateDetailsDirectDebit).consumerAccount,
                        consumerBic: (mandate.details as MandateDetailsDirectDebit).consumerBic,
                        signatureDate: mandate.signatureDate
                    }
                    const mandatesNew = await mollieClientNEW.customers_mandates.page({ customerId: user.mollieCustomerId });
                    if (!mandatesNew) {
                        return await mollieClientNEW.customers_mandates.create(mandateData).then(async mandateItem => {
                            console.log(mandateItem)
                            return mandateItem
                        }).catch(async error => {
                            // Handle the error
                            console.error(uid + '|' + JSON.stringify(mandateData) + '|' + error)
                            return error
                        });
                    } else {
                        if (mandatesNew.length > 1) {
                            for (let index = 1; index < mandatesNew.length; index++) {
                                const element = mandatesNew[index];
                                await mollieClientNEW.customers_mandates.delete(element.id, { customerId: user.mollieCustomerId }).then(async mandateItem => {
                                    console.log(mandateItem)
                                }).catch(async error => {
                                    // Handle the error
                                    console.error(uid + '|' + JSON.stringify(mandateData) + '|' + error)
                                    return error
                                });
                            }
                        } else if (!user.madates) {
                            const mandateItem = mandatesNew[0];
                            const mandateSaveData = []
                            mandateSaveData.push({
                                id: mandateItem.id,
                                method: mandateItem.method,
                                consumerName: (mandateItem.details as MandateDetailsDirectDebit).consumerName,
                                consumerAccount: (mandateItem.details as MandateDetailsDirectDebit).consumerAccount,
                                consumerBic: (mandateItem.details as MandateDetailsDirectDebit).consumerBic,
                                signatureDate: mandateItem.signatureDate
                            })
                            await updateUser(uid, {
                                mandates: mandateSaveData
                            })
                        }
                    }
                } 
            } else {
                console.log('failed:' + mandate.status)
            }
        }
    }
}