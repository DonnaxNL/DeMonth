import { assert } from '../helpers';
import { db, mollieClientNewTest, mollieClientTest } from '../config';
import { errorReport } from '../slack';
import { MandateDetailsDirectDebit } from '@mollie/api-client/dist/types/src/data/customers/mandates/data';

export const getUser = async (uid: string) => {
    return await db.collection(`userdata`).doc(uid).get().then((doc: any) => doc.data()).catch(err => console.error(err));
}

export const updateUser = async (uid: string, data: Object) => {
    return await db.collection(`userdata`).doc(uid).set(data, { merge: true })
}

export const getUserFromReferralCode = async(code: string) => {
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
        await errorReport('getUserFromReferralCode (Test)', err)
        return null
    })
}

export const createCustomer = async (uid: any, transfer: boolean) => {
    const user = await getUser(uid);
    const firstName = user.firstName ? user.firstName : ''
    const lastName = user.lastName ? user.lastName : ''
    let customer = null
    if (transfer) {
        customer = await mollieClientNewTest.customers.create({
            name: firstName + " " + lastName,
            email: assert(user, 'email'),
            metadata: { firebaseUID: uid },
        });
        await updateUser(uid, { 
            mollieTestCustomerId: customer.id
        })
    } else {
        customer = await mollieClientTest.customers.create({
            name: firstName + " " + lastName,
            email: assert(user, 'email'),
            metadata: { firebaseUID: uid },
        });
        await updateUser(uid, { 
            mollieTestCustomerIdOld: customer.id
        })
    }

    return customer
}

export const getOrCreateCustomerTest = async (uid: string) => {
    const user = await getUser(uid);
    let customerId = user && user.mollieTestCustomerId;

    // If missing customerID, create it
    if (!customerId) {
        return await createCustomer(uid, true);
        //return createCustomer(uid, false);
    } else if (user.mollieTestCustomerIdOld && user.mollieTestCustomerId === user.mollieTestCustomerIdOld) {
        await createCustomer(uid, true);
        customerId = user && user.mollieTestCustomerIdOld;
        return await mollieClientTest.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    } else if (!user.mollieTestCustomerIdOld) {
        return await mollieClientNewTest.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    } else {
        customerId = user && user.mollieTestCustomerIdOld;
        return await mollieClientTest.customers.get(customerId).then(async customer => {
            return customer
        }).catch(async error => {
            // Handle the error
            console.error(uid + '|' + customerId + '|' + error)
            return null
        });
    }
}

export const convertMandateTest = async (uid: string) => {
    const customer = await getOrCreateCustomerTest(uid)
    if (customer.id) {
        const mandates = await mollieClientTest.customers_mandates.page({ customerId: customer.id });
        for (const mandate of mandates) {
            if (mandate.status === 'pending' || mandate.status === 'valid') {
                if (mandate.method === 'directdebit') {
                    const user = await getUser(uid);
                    const mandateData = {
                        customerId: user.mollieTestCustomerId,
                        method: mandate.method,
                        consumerName: (mandate.details as MandateDetailsDirectDebit).consumerName,
                        consumerAccount: (mandate.details as MandateDetailsDirectDebit).consumerAccount,
                        consumerBic: 'RABONL2U',
                        signatureDate: mandate.signatureDate
                    }
                    const mandatesNew = await mollieClientNewTest.customers_mandates.page({ customerId: user.mollieTestCustomerId });
                    if (!mandatesNew) {
                        return await mollieClientNewTest.customers_mandates.create(mandateData).then(async mandateItem => {
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
                                await mollieClientNewTest.customers_mandates.delete(element.id, { customerId: user.mollieTestCustomerId }).then(async mandateItem => {
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